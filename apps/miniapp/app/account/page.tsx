"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { ArrowLeft, Loader2, Check, X, RefreshCw, LogOut } from "lucide-react"
import { useCommerce } from "@/hooks/use-commerce"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface NetworkStatus {
  network: string
  chainId: number
  active: boolean
  tokens: { symbol: string; address: string; whitelisted: boolean }[]
}

const NETWORK_LABELS: Record<string, string> = {
  celo: "Celo",
  arbitrum: "Arbitrum",
  polygon: "Polygon",
  base: "Base",
  bsc: "BNB Chain",
}

export default function AccountPage() {
  const router = useRouter()
  const { ready, authenticated, getAccessToken, logout } = usePrivy()
  const { state } = useCommerce()
  const [networks, setNetworks] = useState<NetworkStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchNetworks = async () => {
    if (state.status !== "ready") return
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${API_BASE}/commerces/${state.commerce.commerce_id}/networks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Failed to load networks")
      const { data } = await res.json()
      setNetworks(data || [])
    } catch (err: any) {
      setError(err.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworks()
  }, [state])

  const toggle = async (network: string, currentlyActive: boolean) => {
    if (state.status !== "ready") return
    setUpdating(network)
    try {
      const token = await getAccessToken()
      const action = currentlyActive ? "disable" : "enable"
      const res = await fetch(`${API_BASE}/commerces/${state.commerce.commerce_id}/networks/${network}/${action}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed")
      }
      await fetchNetworks()
    } catch (err: any) {
      setError(err.message || "Failed")
    } finally {
      setUpdating(null)
    }
  }

  if (!ready || !authenticated || state.status !== "ready") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Account</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Business info */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Business name</p>
            <p className="font-medium">{state.commerce.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base currency</p>
            <p className="font-medium">{state.commerce.currency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wallet</p>
            <p className="font-mono text-xs break-all">{state.commerce.wallet}</p>
          </div>
        </div>

        {/* Networks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold">Networks</h2>
              <p className="text-xs text-muted-foreground">Enable networks to accept payments</p>
            </div>
            <button onClick={fetchNetworks} disabled={loading} className="p-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""} text-muted-foreground`} />
            </button>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {networks.map((n) => {
                const enabled = n.tokens.filter((t) => t.whitelisted).length
                const total = n.tokens.length
                const isFullyActive = n.active && enabled === total && total > 0
                return (
                  <div key={n.network} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{NETWORK_LABELS[n.network] || n.network}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isFullyActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/30 font-medium">Active</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">Inactive</span>
                        )}
                        <span className="text-xs text-muted-foreground">{enabled}/{total} tokens</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(n.network, isFullyActive)}
                      disabled={updating === n.network}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                        isFullyActive
                          ? "bg-card border border-border text-foreground"
                          : "bg-violet-600 text-white"
                      } disabled:opacity-50`}
                    >
                      {updating === n.network ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isFullyActive ? (
                        <><X className="w-3.5 h-3.5" /> Disable</>
                      ) : (
                        <><Check className="w-3.5 h-3.5" /> Enable</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={async () => { await logout(); router.push("/") }}
          className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </main>
    </div>
  )
}
