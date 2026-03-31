"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Building2, Zap, Globe, Shield, QrCode, Send, Wallet, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useAggregatedBalances } from "@/hooks/use-aggregated-balances"
import { useLanguage } from "@/components/providers/language-provider"
import { TokenBalanceCard } from "@/components/token-balance-card"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-3xl font-bold tracking-tight mb-3">
        {t.landing.title}
      </h2>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        {t.landing.subtitle}
      </p>

      <Button onClick={onGetStarted} size="lg" className="text-lg px-8 py-6 mb-12">
        {t.landing.getStarted}
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-medium text-sm">{t.landing.networks}</h3>
          <p className="text-xs text-muted-foreground">{t.landing.networksDesc}</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="font-medium text-sm">{t.landing.instantSetup}</h3>
          <p className="text-xs text-muted-foreground">{t.landing.instantSetupDesc}</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="font-medium text-sm">{t.landing.selfCustody}</h3>
          <p className="text-xs text-muted-foreground">{t.landing.selfCustodyDesc}</p>
        </div>
      </div>
    </div>
  )
}

const CURRENCY_CONFIG: Record<string, { symbol: string; decimals: number }> = {
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  COP: { symbol: "$", decimals: 0 },
  MXN: { symbol: "$", decimals: 2 },
  BRL: { symbol: "R$", decimals: 2 },
  ARS: { symbol: "$", decimals: 0 },
}

function Dashboard() {
  const { commerce } = useCommerce()
  const { aggregated, totalUsd, fiatRates, loading: balancesLoading, refresh } = useAggregatedBalances(commerce?.commerce_id || null)

  const currency = commerce?.currency || "USD"
  const fiatRate = fiatRates[currency] || 1
  const config = CURRENCY_CONFIG[currency] || { symbol: "$", decimals: 2 }
  const totalFiat = totalUsd * fiatRate
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground text-sm">{t.dashboard.subtitle}</p>
      </div>

      {/* Total balance card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">{t.dashboard.totalBalance}</p>
          <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t.dashboard.refresh}
          </button>
        </div>
        {balancesLoading ? (
          <Spinner className="w-6 h-6" />
        ) : (
          <p className="text-3xl font-bold">
            {config.symbol}{totalFiat.toLocaleString(undefined, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })}
            <span className="text-lg font-normal text-muted-foreground ml-2">{currency}</span>
          </p>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/receive">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t.dashboard.createInvoice}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.createInvoiceDesc}</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/payouts">
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">{t.dashboard.sendFunds}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.sendFundsDesc}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Balances by token */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t.dashboard.balances}</h2>
        {balancesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : aggregated.length > 0 ? (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {aggregated.map((token) => (
              <TokenBalanceCard key={token.symbol} token={token} onWithdrawSuccess={refresh} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Wallet className="w-8 h-8" />
              <div>
                <p className="font-medium">{t.dashboard.noBalances}</p>
                <p className="text-sm">{t.dashboard.noBalancesDesc}</p>
              </div>
              <Link href="/receive">
                <Button variant="outline" size="sm" className="gap-2 mt-2">
                  <QrCode className="w-4 h-4" />
                  {t.dashboard.createInvoice}
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Wallet address */}
      {commerce?.wallet && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.dashboard.yourWallet}</p>
              <p className="text-sm font-mono">{commerce.wallet}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(commerce.wallet)}
            >
              {t.dashboard.copy}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function Home() {
  const { ready, authenticated, login } = usePrivy()

  if (!ready) return null

  if (!authenticated) {
    return <LandingPage onGetStarted={login} />
  }

  return <Dashboard />
}
