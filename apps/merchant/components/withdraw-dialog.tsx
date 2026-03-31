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
  const [hasGas, setHasGas] = useState<boolean | null>(null)
  const [checkingGas, setCheckingGas] = useState(true)
  const [fee, setFee] = useState<number>(0)

  const network = networkEntry.network
  const balance = networkEntry.balanceNum
  const netAmount = hasGas === false ? balance - fee : balance
  const validRecipient = recipient && ethers.isAddress(recipient)

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  useEffect(() => {
    if (!open) return

    setRecipient("")
    setError(null)

    const check = async () => {
      setCheckingGas(true)
      setHasGas(null)

      const networkConfig = NETWORKS[network]
      if (!networkConfig) { setHasGas(false); setCheckingGas(false); return }

      try {
        const wallet = wallets.find(w => w.walletClientType === "privy")
        if (wallet) {
          const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
            name: networkConfig.name, chainId: networkConfig.chainId,
          })
          const bal = await provider.getBalance(wallet.address)
          setHasGas(parseFloat(ethers.formatEther(bal)) >= (GAS_THRESHOLDS[network] || 0.001))
        } else {
          setHasGas(false)
        }
      } catch {
        setHasGas(false)
      }

      try {
        const resp = await apiClient.get<{ success: boolean; data: { fee_token: number } }>(
          `/commerces/withdraw-fee/${symbol}`, { skipAuth: true }
        )
        if (resp.success) setFee(resp.data.fee_token)
      } catch {
        setFee(0)
      }

      setCheckingGas(false)
    }

    check()
  }, [open, network, symbol, wallets])

  // Direct withdraw — merchant has gas, uses withdrawTo
  const handleDirectWithdraw = async () => {
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

  // Gasless withdraw — backend pays gas, charges fee
  const handleGaslessWithdraw = async () => {
    if (!commerce || !validRecipient) return
    setLoading(true)
    setError(null)

    try {
      const resp = await apiClient.post<{ success: boolean; data: { tx_hash: string; net_amount: string } }>(
        `/commerces/${commerce.commerce_id}/withdraw-for`,
        { token_address: networkEntry.tokenAddress, amount: networkEntry.balance, network, to: recipient }
      )

      if (resp.success) {
        toast({ title: t.send?.transferSent || "Withdrawal sent!", description: `${resp.data.net_amount} ${symbol} → ${recipient.slice(0, 6)}...${recipient.slice(-4)}` })
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || "Withdrawal failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v) }}>
      <DialogContent className="max-w-sm">
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

              {hasGas === false && fee > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.send?.withdrawFee || "Withdrawal fee"}</span>
                    <span className="font-medium text-amber-600">-{fmt(fee)} {symbol}</span>
                  </div>
                  {netAmount > 0 ? (
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-medium text-sm">{t.send?.youReceive || "You receive"}</span>
                      <span className="font-bold text-lg">{fmt(netAmount)} {symbol}</span>
                    </div>
                  ) : (
                    <div className="border-t pt-3">
                      <p className="text-sm text-destructive">{t.send?.balanceTooSmall || "Balance too small to cover the withdrawal fee."}</p>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send?.network || "Network"}</span>
                <span className="font-medium capitalize">{network}</span>
              </div>
            </div>

            <Button
              onClick={hasGas ? handleDirectWithdraw : handleGaslessWithdraw}
              className="w-full gap-2"
              size="lg"
              disabled={loading || netAmount <= 0 || !validRecipient}
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
