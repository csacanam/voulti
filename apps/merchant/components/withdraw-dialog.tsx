"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, ArrowDown } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import { PROXY_ADDRESSES, DERAMP_PROXY_ABI } from "@/blockchain/contracts"
import { NETWORKS } from "@/blockchain/networks"
import { apiClient } from "@/services/api"
import type { TokenBalance } from "@/hooks/use-token-balance"

const GAS_THRESHOLDS: Record<string, number> = {
  celo: 0.01,
  arbitrum: 0.0002,
  polygon: 0.05,
  base: 0.0002,
  bsc: 0.0005,
}

interface WithdrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkEntry: TokenBalance & { balanceNum: number }
  symbol: string
  onSuccess: () => void
}

export function WithdrawDialog({ open, onOpenChange, networkEntry, symbol, onSuccess }: WithdrawDialogProps) {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { wallets } = useWallets()
  const { t } = useLanguage()

  const [recipient, setRecipient] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsGas, setNeedsGas] = useState(false)
  const [checkingGas, setCheckingGas] = useState(true)

  const network = networkEntry.network
  const balance = networkEntry.balanceNum
  const validRecipient = recipient && ethers.isAddress(recipient)

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  useEffect(() => {
    if (!open) return

    setRecipient("")
    setError(null)

    // The withdrawal itself is signed by the merchant's own wallet, so this
    // only decides whether to warn them up front that it needs gas. A failed
    // check warns about nothing: let them try and read the wallet's answer.
    const check = async () => {
      setCheckingGas(true)
      setNeedsGas(false)

      const networkConfig = NETWORKS[network]
      if (!networkConfig) { setCheckingGas(false); return }

      try {
        const wallet = wallets.find(w => w.walletClientType === "privy")
        if (wallet) {
          const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
            name: networkConfig.name, chainId: networkConfig.chainId,
          })
          const bal = await provider.getBalance(wallet.address)
          setNeedsGas(parseFloat(ethers.formatEther(bal)) < (GAS_THRESHOLDS[network] || 0.001))
        }
      } catch {
        // RPC down. Say nothing rather than guess.
      }

      setCheckingGas(false)
    }

    check()
  }, [open, network, symbol, wallets])

  const handleWithdraw = async () => {
    if (!validRecipient) return
    setLoading(true)
    setError(null)

    try {
      const wallet = wallets.find(w => w.walletClientType === "privy")
      if (!wallet) throw new Error("No embedded wallet found")

      const networkConfig = NETWORKS[network]
      if (!networkConfig) throw new Error("Network not configured")

      try {
        await wallet.switchChain(networkConfig.chainId)
      } catch {
        const wp = await wallet.getEthereumProvider()
        await wp.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: `0x${networkConfig.chainId.toString(16)}`, chainName: networkConfig.name, nativeCurrency: networkConfig.nativeCurrency, rpcUrls: [networkConfig.rpcUrl] }],
        })
        await wallet.switchChain(networkConfig.chainId)
      }

      const provider = await wallet.getEthereumProvider()
      const signer = await new ethers.BrowserProvider(provider).getSigner()
      const proxy = new ethers.Contract(PROXY_ADDRESSES[network], DERAMP_PROXY_ABI, signer)

      const parsedAmount = ethers.parseUnits(networkEntry.balance, networkEntry.decimals)
      const tx = await proxy.withdrawTo(networkEntry.tokenAddress, parsedAmount, recipient)
      await tx.wait()

      // Record withdrawal in history
      if (commerce) {
        await apiClient.post('/payouts', {
          commerce_id: commerce.commerce_id,
          to_address: recipient,
          amount: balance,
          token: symbol,
        }).catch(() => {}) // non-critical
      }

      toast({ title: t.send?.transferSent || "Withdrawal sent!", description: `${fmt(balance)} ${symbol} → ${recipient.slice(0, 6)}...${recipient.slice(-4)}` })
      onSuccess()
    } catch (err: any) {
      const msg = err.message || ""
      if (err.code === "ACTION_REJECTED" || msg.includes("rejected")) {
        setError(t.send?.errorRejected || "Transaction cancelled")
      } else if (msg.includes("insufficient funds")) {
        setError(t.send?.errorGas?.replace("{network}", NETWORKS[network]?.name || network) || "Insufficient gas")
      } else {
        setError(t.send?.errorGeneric || "Something went wrong")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v) }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t.send?.withdraw || "Withdraw"} {symbol}
          </DialogTitle>
        </DialogHeader>

        {checkingGas ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground text-sm">{t.send?.checkingGas || "Checking..."}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Recipient address */}
            <div className="space-y-2">
              <Label>{t.send?.recipientAddress || "Recipient Address"}</Label>
              <Input placeholder="0x..." value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>

            {/* Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send?.stats?.balance || "Available"}</span>
                <span className="font-semibold">{fmt(balance)} {symbol}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send?.network || "Network"}</span>
                <span className="font-medium capitalize">{network}</span>
              </div>
            </div>

            {/* The merchant signs this themselves, so the wallet needs gas.
                Say it before they try, with the address to fund. */}
            {needsGas && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-1.5">
                  <p>
                    {(t.send?.needsGas ||
                      "This wallet needs a little {native} to pay for the transaction. Send some to the address below and withdraw again."
                    ).replace("{native}", NETWORKS[network]?.nativeCurrency?.symbol || "gas")}
                  </p>
                  <p className="font-mono break-all opacity-80">{commerce?.wallet}</p>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleWithdraw}
              className="w-full gap-2"
              size="lg"
              disabled={loading || balance <= 0 || !validRecipient}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t.send?.sendingProgress || "Processing..."}</>
              ) : (
                <><ArrowDown className="h-4 w-4" /> {t.send?.withdraw || "Withdraw"}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
