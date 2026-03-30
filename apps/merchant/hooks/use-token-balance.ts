/**
 * Hook to get commerce balances across all chains from the backend API
 */

import { useState, useEffect, useCallback } from "react"
import { API_CONFIG } from "@/services/config"

export interface TokenBalance {
  network: string
  chainId: number
  symbol: string
  balance: string
  decimals: number
  tokenAddress: string
}

interface UseCommerceBalancesResult {
  balances: TokenBalance[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCommerceBalances(commerceId: string | null): UseCommerceBalancesResult {
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!commerceId) {
      setBalances([])
      setLoading(false)
      return
    }

    const fetchBalances = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/balances`)
        if (!res.ok) throw new Error("Failed to fetch balances")

        const data = await res.json()
        setBalances(data.data || [])
      } catch (err) {
        console.error("Failed to fetch balances:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch balances")
        setBalances([])
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
  }, [commerceId, refreshKey])

  return { balances, loading, error, refresh }
}
