"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useCommerceBalances, type TokenBalance } from "@/hooks/use-token-balance"
import { useToast } from "@/hooks/use-toast"
import { useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import { PROXY_ADDRESSES, DERAMP_PROXY_ABI } from "@/blockchain/contracts"
import { NETWORKS } from "@/blockchain/networks"
import type { Payout } from "@/lib/types"

interface CreatePayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePayout: (payouts: Payout[], totalAmount: number) => void
  currentBalance: number
}

export function CreatePayoutDialog({ open, onOpenChange, onCreatePayout }: CreatePayoutDialogProps) {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { wallets } = useWallets()
  const { balances } = useCommerceBalances(commerce?.commerce_id || null)

  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [selectedToken, setSelectedToken] = useState("")
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get non-zero balances grouped by network
  const nonZeroBalances = balances.filter((b) => parseFloat(b.balance) > 0)
  const networks = [...new Set(nonZeroBalances.map((b) => b.network))]
  const tokensForNetwork = nonZeroBalances.filter((b) => b.network === selectedNetwork)

  const selectedBalance = nonZeroBalances.find(
    (b) => b.network === selectedNetwork && b.symbol === selectedToken
  )

  const handleNetworkChange = (network: string) => {
    setSelectedNetwork(network)
    setSelectedToken("")
    setAmount("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedBalance || !commerce) {
      setError("Please select a network and token")
      return
    }

    if (!recipient || !ethers.isAddress(recipient)) {
      setError("Please enter a valid wallet address")
      return
    }

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (amountNum > parseFloat(selectedBalance.balance)) {
      setError("Insufficient balance")
      return
    }

    const proxyAddress = PROXY_ADDRESSES[selectedNetwork]
    if (!proxyAddress) {
      setError("Contract not deployed on this network yet")
      return
    }

    const networkConfig = NETWORKS[selectedNetwork]
    if (!networkConfig) {
      setError("Network not configured")
      return
    }

    setLoading(true)

    try {
      // Get the Privy embedded wallet
      const wallet = wallets.find((w) => w.walletClientType === "privy")
      if (!wallet) {
        throw new Error("No embedded wallet found. Please reconnect.")
      }

      // Switch to the correct chain
      await wallet.switchChain(networkConfig.chainId)

      // Get ethers provider from Privy wallet
      const provider = await wallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      // Create contract instance
      const proxy = new ethers.Contract(proxyAddress, DERAMP_PROXY_ABI, signer)

      // Parse amount with correct decimals
      const parsedAmount = ethers.parseUnits(amount, selectedBalance.decimals)

      // Execute withdrawTo
      const tx = await proxy.withdrawTo(selectedBalance.tokenAddress, parsedAmount, recipient)
      const receipt = await tx.wait()

      toast({
        title: "Transfer sent!",
        description: `${amount} ${selectedBalance.symbol} sent on ${selectedNetwork}`,
      })

      // Create payout record for display
      const newPayout: Payout = {
        id: receipt.hash,
        recipientName: recipient.slice(0, 6) + "..." + recipient.slice(-4),
        email: "",
        walletAddress: recipient,
        currency: selectedBalance.symbol,
        amount: amountNum,
        amountUSD: amountNum,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        status: "completed",
        txHash: receipt.hash,
      }

      onCreatePayout([newPayout], amountNum)
      handleClose()
    } catch (err: any) {
      console.error("Transfer error:", err)

      if (err.code === "ACTION_REJECTED" || err.message?.includes("rejected")) {
        setError("Transaction rejected by user")
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient gas. Please add native tokens for gas fees.")
      } else {
        setError(err.message || "Transfer failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setSelectedNetwork("")
    setSelectedToken("")
    setAmount("")
    setRecipient("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Send Tokens</DialogTitle>
        </DialogHeader>

        {nonZeroBalances.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No balances available to send.</p>
            <p className="text-sm mt-2">Receive payments first to build up your balance.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={selectedNetwork} onValueChange={handleNetworkChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((n) => (
                    <SelectItem key={n} value={n}>
                      {NETWORKS[n]?.name || n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNetwork && (
              <div className="space-y-2">
                <Label>Token</Label>
                <Select value={selectedToken} onValueChange={setSelectedToken} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokensForNetwork.map((t) => (
                      <SelectItem key={t.symbol} value={t.symbol}>
                        {t.symbol} — {parseFloat(t.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedBalance && (
              <>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {parseFloat(selectedBalance.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedBalance.symbol}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Recipient Wallet Address</Label>
                  <Input
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send {amount || "0"} {selectedBalance.symbol}
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
