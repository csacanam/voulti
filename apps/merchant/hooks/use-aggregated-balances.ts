import { useMemo, useState, useEffect } from "react"
import { useCommerceBalances, type TokenBalance } from "./use-token-balance"
import { API_CONFIG } from "@/services/config"
import { getAuthToken } from "@/services/api"

const DUST_THRESHOLD = 0.01

export interface AggregatedBalance {
  symbol: string
  totalBalance: number
  totalUsdValue: number
  networkCount: number
  networks: (TokenBalance & { balanceNum: number })[]
}

interface Rates {
  fiat: Record<string, number>   // e.g. { COP: 4200, EUR: 0.92 }
  tokens: Record<string, number> // e.g. { USDC: 1, COPm: 0.000238 }
}

function useRates() {
  const [rates, setRates] = useState<Rates>({ fiat: {}, tokens: {} })

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/prices/rates`)
      .then(r => r.json())
      .then(data => setRates(data))
      .catch(() => {})
  }, [])

  return rates
}

export function useAggregatedBalances(commerceId: string | null) {
  const { balances, loading, error, refresh } = useCommerceBalances(commerceId)
  const rates = useRates()

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedBalance>()

    for (const b of balances) {
      const num = parseFloat(b.balance)
      if (num <= 0) continue

      // Get token rate to USD from DB rates
      const tokenRate = rates.tokens[b.symbol] || 1
      const usdValue = num * tokenRate

      const existing = map.get(b.symbol)
      if (existing) {
        existing.totalBalance += num
        existing.totalUsdValue += usdValue
        existing.networkCount++
        existing.networks.push({ ...b, balanceNum: num })
      } else {
        map.set(b.symbol, {
          symbol: b.symbol,
          totalBalance: num,
          totalUsdValue: usdValue,
          networkCount: 1,
          networks: [{ ...b, balanceNum: num }],
        })
      }
    }

    for (const agg of map.values()) {
      agg.networks.sort((a, b) => b.balanceNum - a.balanceNum)
    }

    return Array.from(map.values())
      .filter((a) => a.totalBalance >= DUST_THRESHOLD)
      .sort((a, b) => b.totalUsdValue - a.totalUsdValue)
  }, [balances, rates])

  const totalUsd = useMemo(
    () => aggregated.reduce((sum, a) => sum + a.totalUsdValue, 0),
    [aggregated]
  )

  return { aggregated, totalUsd, fiatRates: rates.fiat, loading, error, refresh }
}
