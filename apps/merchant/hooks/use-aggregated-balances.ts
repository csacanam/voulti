import { useMemo } from "react"
import { useCommerceBalances, type TokenBalance } from "./use-token-balance"

const DUST_THRESHOLD = 0.01

// Approximate USD value per token unit
// USD-pegged stablecoins = 1, fiat-pegged = 1/rate
const TOKEN_USD_RATE: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  COPm: 1 / 4200,   // ~4200 COP per USD
  USDm: 1,
  EURm: 1.08,       // ~1.08 USD per EUR
  BRLm: 1 / 5.3,    // ~5.3 BRL per USD
  GBPm: 1.26,       // ~1.26 USD per GBP
}

export interface AggregatedBalance {
  symbol: string
  totalBalance: number
  totalUsdValue: number
  networkCount: number
  networks: (TokenBalance & { balanceNum: number })[]
}

export function useAggregatedBalances(commerceId: string | null) {
  const { balances, loading, error, refresh } = useCommerceBalances(commerceId)

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedBalance>()

    for (const b of balances) {
      const num = parseFloat(b.balance)
      if (num <= 0) continue

      const usdRate = TOKEN_USD_RATE[b.symbol] || 1
      const usdValue = num * usdRate

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
  }, [balances])

  const totalUsd = useMemo(
    () => aggregated.reduce((sum, a) => sum + a.totalUsdValue, 0),
    [aggregated]
  )

  return { aggregated, totalUsd, loading, error, refresh }
}
