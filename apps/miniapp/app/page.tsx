"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Wallet, Plus, Loader2, ArrowUpRight, Settings } from "lucide-react"
import { useCommerce } from "@/hooks/use-commerce"
import { useIsMiniPay } from "@/hooks/use-minipay"
import { OnboardingSheet } from "@/components/onboarding-sheet"
import { api } from "@/lib/api"

interface InvoiceRow {
  id: string
  amount_fiat: number
  fiat_currency: string
  status: string
  created_at: string
}

export default function Home() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()
  const { state, register } = useCommerce()
  const { isMiniPay } = useIsMiniPay()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  useEffect(() => {
    if (ready && !authenticated) login()
  }, [ready, authenticated, login])

  useEffect(() => {
    if (state.status !== "ready") return
    const fetchInvoices = async () => {
      setLoadingInvoices(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const rows = await api.listInvoices(state.commerce.commerce_id, token)
        setInvoices(rows || [])
      } catch {
        // ignore
      } finally {
        setLoadingInvoices(false)
      }
    }
    fetchInvoices()
    const interval = setInterval(fetchInvoices, 10000)
    return () => clearInterval(interval)
  }, [state, getAccessToken])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!authenticated) {
    // Inside MiniPay: silent auto-login (no visible connect screen)
    if (isMiniPay) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <Wallet className="w-12 h-12 text-violet-600" />
        <h1 className="text-xl font-bold">Connect your wallet</h1>
        <button onClick={login} className="px-6 py-3 bg-violet-600 text-white rounded-full font-medium">
          Connect
        </button>
      </div>
    )
  }

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state.status === "needs-onboarding") {
    return <OnboardingSheet onSubmit={register} />
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <p className="text-red-600 text-sm text-center">{state.message}</p>
        <button onClick={logout} className="px-4 py-2 border border-border rounded-full text-sm">Logout</button>
      </div>
    )
  }

  const { commerce } = state

  const totalReceived = invoices
    .filter(i => i.status === "Paid")
    .reduce((sum, i) => sum + Number(i.amount_fiat || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Voulti Pay</p>
            <p className="font-semibold truncate">{commerce.name}</p>
          </div>
          <Link href="/account" className="p-2 text-muted-foreground hover:text-foreground flex-shrink-0 ml-2">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl p-5">
          <p className="text-white/70 text-sm">Total received</p>
          <p className="text-3xl font-bold mt-1 break-all">
            {totalReceived.toLocaleString()} <span className="text-base font-normal opacity-70">{commerce.currency}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/new"
            className="py-4 bg-violet-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create link
          </Link>
          <Link
            href="/withdraw"
            className="py-4 bg-card border border-border rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Payment links</h2>
          {loadingInvoices && invoices.length === 0 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-sm text-muted-foreground border border-border">
              No payment links yet
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 10).map((inv) => (
                <Link
                  key={inv.id}
                  href={`/links/${inv.id}`}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {inv.amount_fiat.toLocaleString()} {inv.fiat_currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Paid: { label: "Paid", cls: "bg-green-500/10 text-green-600 border-green-500/30" },
    Expired: { label: "Expired", cls: "bg-red-500/10 text-red-500 border-red-500/30" },
    Pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  }
  const s = map[status] || map.Pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${s.cls}`}>
      {s.label}
    </span>
  )
}
