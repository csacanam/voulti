"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { StatsCards } from "@/components/stats-cards"
import { PayoutDetailDialog } from "@/components/payout-detail-dialog"
import { payoutService, type Payout as BackendPayout } from "@/services"
import type { Payout } from "@/lib/types"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useAggregatedBalances } from "@/hooks/use-aggregated-balances"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { TokenBalanceCard } from "@/components/token-balance-card"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, CalendarIcon, Lock } from "lucide-react"

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Invalid Date"
    const dateStr = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    return `${dateStr} at ${timeStr}`
  } catch {
    return "Invalid Date"
  }
}

function convertBackendPayout(bp: BackendPayout): Payout {
  let status: "completed" | "pending" | "failed" = "pending"
  if (bp.status === "Claimed") status = "completed"
  else if (bp.status === "Funded" || bp.status === "Pending") status = "pending"
  else status = "failed"

  return {
    id: bp.id,
    recipientName: bp.to_name,
    amountUSD: bp.to_amount,
    currency: bp.to_currency,
    amount: bp.to_amount,
    status,
    statusOriginal: bp.status,
    date: formatDate(bp.created_at),
    email: bp.to_email,
    walletAddress: bp.to_address || "",
    txHash: "",
  }
}

export default function PayoutsPage() {
  const { authenticated } = usePrivy()
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const { aggregated, totalUsd: totalBalance, fiatRates, refresh: refreshBalances } = useAggregatedBalances(
    commerce?.commerce_id || null
  )

  const currency = commerce?.currency || "USD"
  const fiatRate = fiatRates[currency] || 1

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!commerce?.commerce_id) {
        setLoadingPayouts(false)
        return
      }

      try {
        setLoadingPayouts(true)
        const backendPayouts = await payoutService.getPayouts(commerce.commerce_id)
        setPayouts(backendPayouts.map(convertBackendPayout))
      } catch {
        // silently fail — history is not critical
      } finally {
        setLoadingPayouts(false)
      }
    }

    fetchPayouts()
  }, [commerce?.commerce_id])

  const totalPaid = payouts.reduce((sum, p) => sum + p.amountUSD, 0)
  const payoutCount = payouts.length

  if (loadingPayouts && authenticated) {
    return (
      <div className="space-y-8">
        <StatsCards balance={null} totalPaid={null} payoutCount={null} />
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <StatsCards
        balance={authenticated ? totalBalance : null}
        totalPaid={authenticated ? totalPaid : null}
        payoutCount={authenticated ? payoutCount : null}
        currency={currency}
        fiatRate={fiatRate}
      />

      {/* Token balances with withdraw */}
      {authenticated && aggregated.length > 0 && (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {aggregated.map((token) => (
            <TokenBalanceCard key={token.symbol} token={token} onWithdrawSuccess={refreshBalances} />
          ))}
        </div>
      )}

      {/* Withdrawal history */}
      {authenticated && payouts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.send?.stats?.totalTransfers || "History"}</h2>
            <Badge variant="secondary" className="text-sm">{payouts.length}</Badge>
          </div>

          <div className="grid gap-3">
            {payouts.map((payout) => (
              <Card
                key={payout.id}
                className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                onClick={() => { setSelectedPayout(payout); setIsDetailDialogOpen(true) }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                      <ArrowUpRight className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{payout.recipientName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{payout.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {payout.currency}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!authenticated && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Lock className="w-12 h-12" />
            <p className="text-sm">{t.send?.stats?.loginBalance || "Please login"}</p>
          </div>
        </Card>
      )}

      {authenticated && (
        <PayoutDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          payout={selectedPayout}
        />
      )}
    </div>
  )
}
