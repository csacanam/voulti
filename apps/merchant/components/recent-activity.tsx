"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, ArrowDownToLine, ChevronRight } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface RecentActivityProps {
  transactions: Transaction[]
}

const typeConfig = {
  payment: { label: "Payment", icon: ArrowDownRight, color: "text-green-600" },
  payout: { label: "Payout", icon: ArrowUpRight, color: "text-blue-600" },
  deposit: { label: "Deposit", icon: ArrowDownToLine, color: "text-purple-600" },
}

const statusConfig = {
  completed: { label: "Completed", variant: "default" as const },
  pending: { label: "Pending", variant: "secondary" as const },
  failed: { label: "Failed", variant: "destructive" as const },
}

export function RecentActivity({ transactions }: RecentActivityProps) {
  // Tomar solo las primeras 10
  const recentTransactions = transactions.slice(0, 10)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        <Link href="/activity">
          <Button variant="ghost" size="sm" className="gap-1">
            View all
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {recentTransactions.map((tx) => {
          const typeInfo = typeConfig[tx.type]
          const statusInfo = statusConfig[tx.status]
          const Icon = typeInfo.icon

          return (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-secondary ${typeInfo.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="font-medium text-foreground">
                      {tx.type === "payout" && tx.recipientName ? `To: ${tx.recipientName}` : ""}
                      {tx.type === "payment" && tx.senderName ? `From: ${tx.senderName}` : ""}
                      {tx.type === "deposit" ? "Deposit" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {new Date(tx.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(tx.date).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>• {typeInfo.label}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-semibold ${
                  tx.type === "payout" 
                    ? "text-foreground" 
                    : "text-green-600"
                }`}>
                  {tx.type === "payout" ? "-" : "+"}${tx.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

