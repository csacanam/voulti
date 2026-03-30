import { useMemo } from "react"
import { useCommerceBalances, type TokenBalance } from "./use-token-balance"

const DUST_THRESHOLD = 0.01

export interface AggregatedBalance {
  symbol: string
  totalBalance: number
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

      const existing = map.get(b.symbol)
      if (existing) {
        existing.totalBalance += num
        existing.networkCount++
        existing.networks.push({ ...b, balanceNum: num })
      } else {
        map.set(b.symbol, {
          symbol: b.symbol,
          totalBalance: num,
          networkCount: 1,
          networks: [{ ...b, balanceNum: num }],
        })
      }
    }

    // Sort networks within each token by balance desc
    for (const agg of map.values()) {
      agg.networks.sort((a, b) => b.balanceNum - a.balanceNum)
    }

    // Filter out dust-only tokens and sort by total balance desc
    return Array.from(map.values())
      .filter((a) => a.totalBalance >= DUST_THRESHOLD)
      .sort((a, b) => b.totalBalance - a.totalBalance)
  }, [balances])

  const totalUsd = useMemo(
    () => aggregated.reduce((sum, a) => sum + a.totalBalance, 0),
    [aggregated]
  )

  return { aggregated, totalUsd, loading, error, refresh }
}
