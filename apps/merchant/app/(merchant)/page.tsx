"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Building2, Zap, Globe, Shield, QrCode, Send, Wallet, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useCommerceBalances } from "@/hooks/use-token-balance"
import { Spinner } from "@/components/ui/spinner"
import Link from "next/link"

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-3xl font-bold tracking-tight mb-3">
        Accept crypto payments
      </h2>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        Let your customers pay with USDC, USDT and stablecoins on 5 networks.
      </p>

      <Button onClick={onGetStarted} size="lg" className="text-lg px-8 py-6 mb-12">
        Get Started
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-medium text-sm">5 Networks</h3>
          <p className="text-xs text-muted-foreground">Celo, Arbitrum, Polygon, Base, BSC</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="font-medium text-sm">Instant Setup</h3>
          <p className="text-xs text-muted-foreground">Connect wallet, name your business, done</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="font-medium text-sm">Self-Custody</h3>
          <p className="text-xs text-muted-foreground">Your funds, your wallet, always</p>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const { commerce } = useCommerce()
  const { balances, loading: balancesLoading, refresh } = useCommerceBalances(commerce?.commerce_id || null)

  const nonZeroBalances = balances.filter(b => parseFloat(b.balance) > 0)
  const totalUsdEstimate = balances.reduce((sum, b) => {
    // rough estimate: stablecoins ~= 1 USD
    return sum + parseFloat(b.balance)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your balances and activity</p>
      </div>

      {/* Total balance card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <button onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Refresh
          </button>
        </div>
        {balancesLoading ? (
          <Spinner className="w-6 h-6" />
        ) : (
          <p className="text-3xl font-bold">
            ~${totalUsdEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <p className="font-medium text-sm">Create Invoice</p>
                <p className="text-xs text-muted-foreground">Generate a payment link</p>
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
                <p className="font-medium text-sm">Send Funds</p>
                <p className="text-xs text-muted-foreground">Transfer to any wallet</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Balances by network */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Balances</h2>
        {balancesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : nonZeroBalances.length > 0 ? (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {nonZeroBalances.map((b) => (
              <Card key={`${b.network}-${b.symbol}`} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {parseFloat(b.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {b.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{b.network}</p>
                  </div>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Wallet className="w-8 h-8" />
              <div>
                <p className="font-medium">No balances yet</p>
                <p className="text-sm">Create an invoice and receive your first payment</p>
              </div>
              <Link href="/receive">
                <Button variant="outline" size="sm" className="gap-2 mt-2">
                  <QrCode className="w-4 h-4" />
                  Create Invoice
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
              <p className="text-xs text-muted-foreground mb-1">Your wallet</p>
              <p className="text-sm font-mono">{commerce.wallet}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(commerce.wallet)}
            >
              Copy
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
