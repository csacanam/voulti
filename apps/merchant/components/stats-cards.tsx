import { Card } from "@/components/ui/card"
import { Wallet, DollarSign, Receipt, Lock } from "lucide-react"

interface StatsCardsProps {
  balance: number | null
  totalPaid: number | null
  payoutCount: number | null
}

export function StatsCards({ balance, totalPaid, payoutCount }: StatsCardsProps) {
  const isAuthenticated = balance !== null && totalPaid !== null && payoutCount !== null

  if (!isAuthenticated) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-muted to-muted/80 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Balance</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">Please login to view your balance</p>
            </div>
          </div>
        </Card>

        {/* Total Paid Card */}
        <Card className="p-6 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Total Paid</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">Please login to view your stats</p>
            </div>
          </div>
        </Card>

        {/* Payout Count Card */}
        <Card className="p-6 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="w-4 h-4" />
              <span className="text-sm font-medium">Total Payouts</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">Please login to view your payouts</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Balance Card */}
      <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Balance</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </Card>

      {/* Total Paid Card */}
      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Total Paid</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-sm text-muted-foreground">All-time payouts</p>
          </div>
        </div>
      </Card>

      {/* Payout Count Card */}
      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-medium">Total Payouts</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{payoutCount.toLocaleString("en-US")}</h2>
            <p className="text-sm text-muted-foreground">Completed transactions</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
