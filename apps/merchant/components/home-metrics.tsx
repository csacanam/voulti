import { Card } from "@/components/ui/card"
import { Wallet, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface HomeMetricsProps {
  balance: number
  totalReceived30d: number
  totalPayouts30d: number
}

export function HomeMetrics({ balance, totalReceived30d, totalPayouts30d }: HomeMetricsProps) {
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

      {/* Total Received Card */}
      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-sm font-medium">Total Received</span>
            </div>
            <span className="text-xs text-muted-foreground">30d</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              ${totalReceived30d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </Card>

      {/* Total Payouts Card */}
      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm font-medium">Total Payouts</span>
            </div>
            <span className="text-xs text-muted-foreground">30d</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              ${totalPayouts30d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </Card>
    </div>
  )
}


