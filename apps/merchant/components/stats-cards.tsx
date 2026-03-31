import { Card } from "@/components/ui/card"
import { Wallet, Send, Receipt, Lock } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

const CURRENCY_CONFIG: Record<string, { symbol: string; decimals: number }> = {
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  COP: { symbol: "$", decimals: 0 },
  MXN: { symbol: "$", decimals: 2 },
  BRL: { symbol: "R$", decimals: 2 },
  ARS: { symbol: "$", decimals: 0 },
}

interface StatsCardsProps {
  balance: number | null
  totalPaid: number | null
  payoutCount: number | null
  currency?: string
  fiatRate?: number
}

export function StatsCards({ balance, totalPaid, payoutCount, currency = "USD", fiatRate = 1 }: StatsCardsProps) {
  const { t } = useLanguage()
  const isAuthenticated = balance !== null && totalPaid !== null && payoutCount !== null
  const config = CURRENCY_CONFIG[currency] || { symbol: "$", decimals: 2 }

  const formatAmount = (usd: number) => {
    const fiat = usd * fiatRate
    return `${config.symbol}${fiat.toLocaleString(undefined, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })}`
  }

  if (!isAuthenticated) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-muted to-muted/80 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">{t.send.stats?.balance || "Balance"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">{t.send.stats?.loginBalance || "Please login to view your balance"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Send className="w-4 h-4" />
              <span className="text-sm font-medium">{t.send.stats?.totalSent || "Total Sent"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">{t.send.stats?.loginStats || "Please login to view your stats"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="w-4 h-4" />
              <span className="text-sm font-medium">{t.send.stats?.totalTransfers || "Total Transfers"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <p className="text-sm">{t.send.stats?.loginTransfers || "Please login to view your transfers"}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">{t.send.stats?.balance || "Balance"}</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">
              {formatAmount(balance)}
              <span className="text-lg font-normal text-primary-foreground/70 ml-2">{currency}</span>
            </h2>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">{t.send.stats?.totalSent || "Total Sent"}</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {formatAmount(totalPaid)}
              <span className="text-lg font-normal text-muted-foreground ml-2">{currency}</span>
            </h2>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-medium">{t.send.stats?.totalTransfers || "Total Transfers"}</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{payoutCount.toLocaleString()}</h2>
          </div>
        </div>
      </Card>
    </div>
  )
}
