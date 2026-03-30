"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Send, ArrowLeft, CheckCircle2 } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useAggregatedBalances } from "@/hooks/use-aggregated-balances"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import { PROXY_ADDRESSES, DERAMP_PROXY_ABI } from "@/blockchain/contracts"
import { NETWORKS } from "@/blockchain/networks"
import type { Payout } from "@/lib/types"

// Network priority: cheapest gas first
const NETWORK_PRIORITY = ["hardhat", "celo", "base", "polygon", "arbitrum", "bsc"]

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
  const { aggregated } = useAggregatedBalances(commerce?.commerce_id || null)
  const { t } = useLanguage()

  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [resolvedNetwork, setResolvedNetwork] = useState<string | null>(null)

  const selectedToken = aggregated.find((tk) => tk.symbol === selectedSymbol)

  // Auto-select best network for the amount
  const resolveNetwork = (symbol: string, amountNum: number): { network: string; balance: number } | null => {
    const token = aggregated.find((tk) => tk.symbol === symbol)
    if (!token) return null

    // Sort by priority, then find first with enough balance
    const sorted = [...token.networks].sort((a, b) => {
      const aIdx = NETWORK_PRIORITY.indexOf(a.network)
      const bIdx = NETWORK_PRIORITY.indexOf(b.network)
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
    })

    for (const net of sorted) {
      if (net.balanceNum >= amountNum && PROXY_ADDRESSES[net.network]) {
        return { network: net.network, balance: net.balanceNum }
      }
    }

    return null
  }

  const handleContinue = () => {
    setError(null)

    if (!selectedSymbol) {
      setError("Select a token")
      return
    }

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount")
      return
    }

    if (!selectedToken || amountNum > selectedToken.totalBalance) {
      setError("Insufficient balance")
      return
    }

    if (!recipient || !ethers.isAddress(recipient)) {
      setError("Enter a valid wallet address")
      return
    }

    const resolved = resolveNetwork(selectedSymbol, amountNum)
    if (!resolved) {
      // Show fragmentation message
      const token = aggregated.find((tk) => tk.symbol === selectedSymbol)
      if (token && token.networkCount > 1) {
        const breakdown = token.networks
          .filter((n) => n.balanceNum > 0)
          .map((n) => `${n.network}: ${n.balanceNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}`)
          .join(", ")
        setError(
          t.send.errorFragmented.replaceAll("{symbol}", selectedSymbol).replace("{breakdown}", breakdown).replace("{amount}", amount)
        )
      } else {
        setError(t.send.errorNoNetwork)
      }
      return
    }

    setResolvedNetwork(resolved.network)
    setStep("confirm")
  }

  const handleSend = async () => {
    if (!resolvedNetwork || !selectedToken) return

    setLoading(true)
    setError(null)

    try {
      const wallet = wallets.find((w) => w.walletClientType === "privy")
      if (!wallet) throw new Error("No embedded wallet found")

      const networkConfig = NETWORKS[resolvedNetwork]
      if (!networkConfig) throw new Error("Network not configured")

      // Switch chain — add network first if needed (e.g. Hardhat local)
      try {
        await wallet.switchChain(networkConfig.chainId)
      } catch {
        // If chain not recognized, add it via the provider
        const wp = await wallet.getEthereumProvider()
        await wp.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${networkConfig.chainId.toString(16)}`,
            chainName: networkConfig.name,
            nativeCurrency: networkConfig.nativeCurrency,
            rpcUrls: [networkConfig.rpcUrl],
          }],
        })
        await wallet.switchChain(networkConfig.chainId)
      }

      const provider = await wallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      const proxyAddress = PROXY_ADDRESSES[resolvedNetwork]
      const proxy = new ethers.Contract(proxyAddress, DERAMP_PROXY_ABI, signer)

      // Find the token address on the resolved network
      const networkEntry = selectedToken.networks.find((n) => n.network === resolvedNetwork)
      if (!networkEntry) throw new Error("Token not found on resolved network")

      const parsedAmount = ethers.parseUnits(amount, networkEntry.decimals)
      const tx = await proxy.withdrawTo(networkEntry.tokenAddress, parsedAmount, recipient)
      const receipt = await tx.wait()

      toast({
        title: t.send.transferSent,
        description: t.send.transferSentDesc.replace("{amount}", amount).replace("{symbol}", selectedSymbol).replace("{network}", resolvedNetwork!),
      })

      const newPayout: Payout = {
        id: receipt.hash,
        recipientName: recipient.slice(0, 6) + "..." + recipient.slice(-4),
        email: "",
        walletAddress: recipient,
        currency: selectedSymbol,
        amount: parseFloat(amount),
        amountUSD: parseFloat(amount),
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        status: "completed",
        txHash: receipt.hash,
      }

      onCreatePayout([newPayout], parseFloat(amount))
      handleClose()
    } catch (err: any) {
      const msg = err.message || ""
      if (err.code === "ACTION_REJECTED" || msg.includes("rejected")) {
        setError(t.send.errorRejected)
      } else if (msg.includes("insufficient funds")) {
        const networkName = NETWORKS[resolvedNetwork]?.name || resolvedNetwork
        setError(t.send.errorGas.replace("{network}", networkName))
      } else if (msg.includes("Unsupported") || msg.includes("wallet_addEthereumChain")) {
        const networkName = NETWORKS[resolvedNetwork]?.name || resolvedNetwork
        setError(t.send.errorUnsupported.replace("{network}", networkName))
      } else if (msg.includes("not whitelisted") || msg.includes("not registered")) {
        setError(t.send.errorNotWhitelisted)
      } else {
        setError(t.send.errorGeneric)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setSelectedSymbol("")
    setAmount("")
    setRecipient("")
    setError(null)
    setStep("form")
    setResolvedNetwork(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "confirm" ? t.send.confirmTitle : t.send.title}
          </DialogTitle>
        </DialogHeader>

        {aggregated.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>{t.send.noBalances}</p>
            <p className="text-sm mt-2">{t.send.noBalancesDesc}</p>
          </div>
        ) : step === "form" ? (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>{t.send.token}</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder={t.send.selectToken} />
                </SelectTrigger>
                <SelectContent>
                  {aggregated.map((tk) => (
                    <SelectItem key={tk.symbol} value={tk.symbol}>
                      {tk.symbol} — {tk.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {t.send.available}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.send.amount}</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedToken && (
                <p className="text-xs text-muted-foreground">
                  {t.send.available}: {selectedToken.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedSymbol}
                  {selectedToken.networkCount > 1 && ` ${t.send.acrossNetworks.replace("{count}", String(selectedToken.networkCount))}`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.send.recipientAddress}</Label>
              <Input placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>

            <Button onClick={handleContinue} className="w-full gap-2" size="lg">
              <Send className="h-4 w-4" />
              {t.send.continue}
            </Button>
          </div>
        ) : (
          /* Confirmation step */
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send.sending}</span>
                <span className="font-semibold">{amount} {selectedSymbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send.network}</span>
                <span className="font-medium capitalize">{resolvedNetwork}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send.to}</span>
                <span className="font-mono text-xs">{recipient.slice(0, 10)}...{recipient.slice(-8)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t.send.autoNetwork}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1 gap-2" disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
                {t.send.back}
              </Button>
              <Button onClick={handleSend} className="flex-1 gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t.send.sendingProgress}</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {t.send.confirm}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
