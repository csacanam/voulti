"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { StatsCards } from "@/components/stats-cards"
import { PayoutsList } from "@/components/payouts-list"
import { CreatePayoutDialog } from "@/components/create-payout-dialog"
import { PayoutDetailDialog } from "@/components/payout-detail-dialog"
import { payoutService, type Payout as BackendPayout } from "@/services"
import type { Payout } from "@/lib/types"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useCommerceBalances } from "@/hooks/use-token-balance"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"

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
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Multi-chain balances
  const { balances, loading: balanceLoading, refresh: refreshBalances } = useCommerceBalances(
    commerce?.commerce_id || null
  )

  // Total balance in USD-equivalent (sum all non-zero balances)
  const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0)

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
        toast({ variant: "destructive", title: "Error", description: "Failed to load payout history" })
      } finally {
        setLoadingPayouts(false)
      }
    }

    fetchPayouts()
  }, [commerce?.commerce_id, toast])

  const totalPaid = payouts.reduce((sum, p) => sum + p.amountUSD, 0)
  const payoutCount = payouts.length

  const handleCreatePayout = (newPayouts: Payout[], totalAmount: number) => {
    setPayouts([...newPayouts, ...payouts])
    setIsCreateDialogOpen(false)
    refreshBalances()
  }

  const handlePayoutClick = (payout: Payout) => {
    setSelectedPayout(payout)
    setIsDetailDialogOpen(true)
  }

  if (loadingPayouts && authenticated) {
    return (
      <div className="space-y-8">
        <StatsCards balance={null} totalPaid={null} payoutCount={null} />
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Spinner className="w-8 h-8 mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
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
      />

      {/* Multi-chain balances */}
      {authenticated && balances.length > 0 && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {balances
            .filter((b) => parseFloat(b.balance) > 0)
            .map((b) => (
              <div key={`${b.network}-${b.symbol}`} className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground capitalize">{b.network}</div>
                <div className="text-lg font-semibold">
                  {parseFloat(b.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {b.symbol}
                </div>
              </div>
            ))}
        </div>
      )}

      <PayoutsList
        payouts={authenticated ? payouts : []}
        onPayoutClick={handlePayoutClick}
        onCreatePayout={() => setIsCreateDialogOpen(true)}
        isAuthenticated={authenticated}
      />

      {authenticated && (
        <>
          <CreatePayoutDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onCreatePayout={handleCreatePayout}
            currentBalance={totalBalance}
          />
          <PayoutDetailDialog
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
            payout={selectedPayout}
          />
        </>
      )}
    </div>
  )
}
