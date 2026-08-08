"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, RefreshCw } from "lucide-react"
import { API_CONFIG } from "@/services/config"
import { getAuthToken } from "@/services/api"
import { useToast } from "@/hooks/use-toast"

interface NetworkStatus {
  network: string
  chainId: number
  active: boolean
  /** Set when the on-chain read failed — the network's real state is unknown. */
  readError?: string
  tokens: { symbol: string; address: string; whitelisted: boolean }[]
}

const NETWORK_LABELS: Record<string, string> = {
  celo: "Celo",
  arbitrum: "Arbitrum One",
  polygon: "Polygon",
  base: "Base",
  bsc: "BNB Smart Chain",
}

export function NetworksSection({ commerceId }: { commerceId: string }) {
  const [networks, setNetworks] = useState<NetworkStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchNetworks = async () => {
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/networks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Failed to fetch")
      const { data } = await res.json()
      setNetworks(data || [])
    } catch {
      toast({ title: "Failed to load networks", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworks()
  }, [commerceId])

  const toggle = async (network: string, currentlyActive: boolean) => {
    setUpdating(network)
    try {
      const token = getAuthToken()
      const action = currentlyActive ? "disable" : "enable"
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/networks/${network}/${action}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed")
      }
      toast({ title: currentlyActive ? `${NETWORK_LABELS[network]} disabled` : `${NETWORK_LABELS[network]} enabled` })
      await fetchNetworks()
    } catch (err: any) {
      toast({ title: err.message || "Failed", variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Networks</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enable or disable networks to accept payments
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchNetworks} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {networks.map((n) => {
            const tokensEnabled = n.tokens.filter((t) => t.whitelisted).length
            const totalTokens = n.tokens.length
            const isFullyActive = n.active && tokensEnabled === totalTokens && totalTokens > 0
            return (
              <div
                key={n.network}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{NETWORK_LABELS[n.network] || n.network}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {n.readError ? (
                      // Not the same as inactive. Public RPCs rate-limit, and
                      // saying "Inactive" here tells a merchant they cannot
                      // charge on a network where they can charge right now.
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                        Couldn&apos;t check
                      </Badge>
                    ) : isFullyActive ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {n.readError ? 'status unavailable' : `${tokensEnabled}/${totalTokens} tokens`}
                    </span>
                  </div>
                </div>
                <Button
                  variant={isFullyActive ? "outline" : "default"}
                  size="sm"
                  // Toggling on an unknown state would send a transaction based
                  // on a guess — and cost gas from the wallet that funds sweeps.
                  disabled={updating === n.network || Boolean(n.readError)}
                  onClick={() => toggle(n.network, isFullyActive)}
                  className="gap-1.5 flex-shrink-0"
                >
                  {updating === n.network ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFullyActive ? (
                    <><X className="w-3.5 h-3.5" /> Disable</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Enable</>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
