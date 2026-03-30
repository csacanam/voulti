"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpRight, ArrowDownRight, ArrowDownToLine, Search, Download } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface ActivityListProps {
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

export function ActivityList({ transactions }: ActivityListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.senderName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || tx.type === typeFilter
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Amount (USD)", "Currency", "Status", "Name", "TX Hash"]
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.date).toLocaleString(),
      typeConfig[tx.type].label,
      tx.amountUSD.toString(),
      tx.currency,
      statusConfig[tx.status].label,
      tx.recipientName || tx.senderName || "",
      tx.txHash || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">All Activity</h2>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="payout">Payout</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y divide-border">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No transactions found matching your filters
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const typeInfo = typeConfig[tx.type]
            const statusInfo = statusConfig[tx.status]
            const Icon = typeInfo.icon

            return (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                <div className="flex items-center gap-4 flex-1">
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
                          year: "numeric",
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
          })
        )}
      </Card>

      {filteredTransactions.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      )}
    </div>
  )
}

