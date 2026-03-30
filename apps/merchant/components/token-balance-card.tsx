"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { AggregatedBalance } from "@/hooks/use-aggregated-balances"

interface TokenBalanceCardProps {
  token: AggregatedBalance
}

export function TokenBalanceCard({ token }: TokenBalanceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formattedTotal = token.totalBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })

  return (
    <Card
      className="overflow-hidden transition-all cursor-pointer hover:border-primary/30"
      onClick={() => token.networkCount > 1 && setExpanded(!expanded)}
    >
      {/* Summary */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">{formattedTotal} <span className="text-muted-foreground font-medium">{token.symbol}</span></p>
          <p className="text-xs text-muted-foreground capitalize">
            {token.networkCount === 1
              ? token.networks[0].network
              : `${token.networkCount} networks`}
          </p>
        </div>
        {token.networkCount > 1 && (
          <div className="text-muted-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && token.networkCount > 1 && (
        <div className="border-t px-4 pb-3 pt-2 space-y-1.5 bg-muted/30">
          {token.networks.map((n) => (
            <div key={`${n.network}-${n.symbol}`} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground capitalize">{n.network}</span>
              <span className="font-medium tabular-nums">
                {n.balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
