"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowDown } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { WithdrawDialog } from "@/components/withdraw-dialog"
import type { AggregatedBalance } from "@/hooks/use-aggregated-balances"

interface TokenBalanceCardProps {
  token: AggregatedBalance
  onWithdrawSuccess?: () => void
}

export function TokenBalanceCard({ token, onWithdrawSuccess }: TokenBalanceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const { t } = useLanguage()

  const formattedTotal = token.totalBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })

  return (
    <>
      <Card className="overflow-hidden transition-all">
        {/* Summary */}
        <div
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => token.networkCount > 1 && setExpanded(!expanded)}
        >
          <div>
            <p className="text-lg font-bold">{formattedTotal} <span className="text-muted-foreground font-medium">{token.symbol}</span></p>
            <p className="text-xs text-muted-foreground capitalize">
              {token.networkCount === 1
                ? token.networks[0].network
                : `${token.networkCount} ${t.dashboard.networks}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={(e) => { e.stopPropagation(); setWithdrawOpen(true) }}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              {t.send?.withdraw || "Withdraw"}
            </Button>
            {token.networkCount > 1 && (
              <div className="text-muted-foreground">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            )}
          </div>
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

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        token={token}
        onSuccess={onWithdrawSuccess || (() => {})}
      />
    </>
  )
}
