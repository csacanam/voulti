"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, ArrowDown, CheckCircle2 } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import { PROXY_ADDRESSES, DERAMP_PROXY_ABI } from "@/blockchain/contracts"
import { NETWORKS } from "@/blockchain/networks"
import { apiClient } from "@/services/api"
import type { AggregatedBalance } from "@/hooks/use-aggregated-balances"

const NETWORK_PRIORITY = ["celo", "base", "polygon", "arbitrum", "bsc"]

// Minimum gas thresholds per network (same as monitoring)
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
  token: AggregatedBalance
  onSuccess: () => void
}

export function WithdrawDialog({ open, onOpenChange, token, onSuccess }: WithdrawDialogProps) {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { wallets } = useWallets()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGas, setHasGas] = useState<boolean | null>(null)
  const [checkingGas, setCheckingGas] = useState(false)
  const [fee, setFee] = useState<number>(0)
  const [resolvedNetwork, setResolvedNetwork] = useState<string | null>(null)
  const [resolvedEntry, setResolvedEntry] = useState<typeof token.networks[0] | null>(null)

  // Resolve best network and check gas
  useEffect(() => {
    if (!open || !token) return

    const checkGasAndResolve = async () => {
      setCheckingGas(true)
      setError(null)
      setHasGas(null)

      // Find best network (priority order, with balance)
      const sorted = [...token.networks].sort((a, b) => {
        const aIdx = NETWORK_PRIORITY.indexOf(a.network)
        const bIdx = NETWORK_PRIORITY.indexOf(b.network)
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
      })

      const best = sorted.find(n => n.balanceNum > 0 && PROXY_ADDRESSES[n.network])
      if (!best) {
        setError(t.send?.errorNoNetwork || "No network available")
        setCheckingGas(false)
        return
      }

      setResolvedNetwork(best.network)
      setResolvedEntry(best)

      // Check native gas balance
      const networkConfig = NETWORKS[best.network]
      if (!networkConfig) {
        setHasGas(false)
        setCheckingGas(false)
        return
      }

      try {
        const wallet = wallets.find(w => w.walletClientType === "privy")
        if (!wallet) {
          setHasGas(false)
          setCheckingGas(false)
          return
        }

        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
          name: networkConfig.name,
          chainId: networkConfig.chainId,
        })
        const balance = await provider.getBalance(wallet.address)
        const balanceNum = parseFloat(ethers.formatEther(balance))
        const threshold = GAS_THRESHOLDS[best.network] || 0.001

        setHasGas(balanceNum >= threshold)
      } catch {
        // If we can't check, assume no gas
        setHasGas(false)
      }

      // Get fee estimate if needed
      try {
        const resp = await apiClient.get<{ success: boolean; data: { fee_token: number } }>(
          `/commerces/withdraw-fee/${token.symbol}`,
          { skipAuth: true }
        )
        if (resp.success) {
          setFee(resp.data.fee_token)
        }
      } catch {
        setFee(0)
      }

      setCheckingGas(false)
    }

    checkGasAndResolve()
  }, [open, token, wallets, t])

  const netAmount = token.totalBalance - fee
  const formattedBalance = token.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  const formattedFee = fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  const formattedNet = netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  // Direct withdraw (user has gas)
  const handleDirectWithdraw = async () => {
    if (!resolvedNetwork || !resolvedEntry) return

    setLoading(true)
    setError(null)

    try {
      const wallet = wallets.find(w => w.walletClientType === "privy")
      if (!wallet) throw new Error("No embedded wallet found")

      const networkConfig = NETWORKS[resolvedNetwork]
      if (!networkConfig) throw new Error("Network not configured")

      try {
        await wallet.switchChain(networkConfig.chainId)
      } catch {
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

      const tx = await proxy.withdraw(resolvedEntry.tokenAddress)
      await tx.wait()

      toast({
        title: t.send?.transferSent || "Withdrawal sent!",
        description: `${resolvedEntry.balanceNum} ${token.symbol} via ${resolvedNetwork}`,
      })
      onSuccess()
      handleClose()
    } catch (err: any) {
      const msg = err.message || ""
      if (err.code === "ACTION_REJECTED" || msg.includes("rejected")) {
        setError(t.send?.errorRejected || "Transaction cancelled")
      } else if (msg.includes("insufficient funds")) {
        setError(t.send?.errorGas?.replace("{network}", resolvedNetwork || "") || "Insufficient gas")
      } else {
        setError(t.send?.errorGeneric || "Something went wrong")
      }
    } finally {
      setLoading(false)
    }
  }

  // Gasless withdraw via backend
  const handleGaslessWithdraw = async () => {
    if (!resolvedNetwork || !resolvedEntry || !commerce) return

    setLoading(true)
    setError(null)

    try {
      const resp = await apiClient.post<{ success: boolean; data: { tx_hash: string; net_amount: string } }>(
        `/commerces/${commerce.commerce_id}/withdraw-for`,
        {
          token_address: resolvedEntry.tokenAddress,
          amount: resolvedEntry.balanceNum.toString(),
          network: resolvedNetwork,
        }
      )

      if (resp.success) {
        toast({
          title: t.send?.transferSent || "Withdrawal sent!",
          description: `${resp.data.net_amount} ${token.symbol} via ${resolvedNetwork}`,
        })
        onSuccess()
        handleClose()
      }
    } catch (err: any) {
      setError(err.message || "Withdrawal failed")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    setHasGas(null)
    setResolvedNetwork(null)
    setResolvedEntry(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t.send?.withdraw || "Withdraw"} {token.symbol}
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

            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.send?.stats?.balance || "Available"}</span>
                <span className="font-semibold">{formattedBalance} {token.symbol}</span>
              </div>

              {hasGas === false && fee > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.send?.withdrawFee || "Withdrawal fee"}</span>
                    <span className="font-medium text-amber-600">-{formattedFee} {token.symbol}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-sm">
                    <span className="font-medium">{t.send?.youReceive || "You receive"}</span>
                    <span className="font-bold text-lg">{formattedNet} {token.symbol}</span>
                  </div>
                </>
              )}

              {resolvedNetwork && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.send?.network || "Network"}</span>
                  <span className="font-medium capitalize">{resolvedNetwork}</span>
                </div>
              )}
            </div>

            <Button
              onClick={hasGas ? handleDirectWithdraw : handleGaslessWithdraw}
              className="w-full gap-2"
              size="lg"
              disabled={loading || netAmount <= 0}
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
