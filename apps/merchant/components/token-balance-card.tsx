"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowDown } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { WithdrawDialog } from "@/components/withdraw-dialog"
import type { AggregatedBalance } from "@/hooks/use-aggregated-balances"
import type { TokenBalance } from "@/hooks/use-token-balance"

interface TokenBalanceCardProps {
  token: AggregatedBalance
  onWithdrawSuccess?: () => void
}

export function TokenBalanceCard({ token, onWithdrawSuccess }: TokenBalanceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [withdrawNetwork, setWithdrawNetwork] = useState<(TokenBalance & { balanceNum: number }) | null>(null)
  const { t } = useLanguage()

  const formattedTotal = token.totalBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })

  const singleNetwork = token.networkCount === 1

  return (
    <>
      <Card className="overflow-hidden transition-all">
        {/* Summary */}
        <div
          className={`p-4 flex items-center justify-between ${!singleNetwork ? 'cursor-pointer hover:bg-muted/30' : ''} transition-colors`}
          onClick={() => !singleNetwork && setExpanded(!expanded)}
        >
          <div>
            <p className="text-lg font-bold">{formattedTotal} <span className="text-muted-foreground font-medium">{token.symbol}</span></p>
            <p className="text-xs text-muted-foreground capitalize">
              {singleNetwork
                ? token.networks[0].network
                : `${token.networkCount} ${t.dashboard.networks}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {singleNetwork && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={(e) => { e.stopPropagation(); setWithdrawNetwork(token.networks[0]) }}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                {t.send?.withdraw || "Withdraw"}
              </Button>
            )}
            {!singleNetwork && (
              <div className="text-muted-foreground">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            )}
          </div>
        </div>

        {/* Expanded detail — each network has its own withdraw button */}
        {expanded && !singleNetwork && (
          <div className="border-t px-4 pb-3 pt-2 space-y-2 bg-muted/30">
            {token.networks.map((n) => (
              <div key={`${n.network}-${n.symbol}`} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground capitalize">{n.network}</span>
                  <span className="font-medium tabular-nums ml-2">
                    {n.balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={() => setWithdrawNetwork(n)}
                >
                  <ArrowDown className="w-3 h-3" />
                  {t.send?.withdraw || "Withdraw"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {withdrawNetwork && (
        <WithdrawDialog
          open={!!withdrawNetwork}
          onOpenChange={(open) => { if (!open) setWithdrawNetwork(null) }}
          networkEntry={withdrawNetwork}
          symbol={token.symbol}
          onSuccess={() => { setWithdrawNetwork(null); onWithdrawSuccess?.() }}
        />
      )}
    </>
  )
}
