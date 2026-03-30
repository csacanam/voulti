"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowUpRight, CalendarIcon, Search, SlidersHorizontal, X, Lock, Plus } from "lucide-react"
import { format } from "date-fns"
import type { Payout } from "@/lib/types"

interface PayoutsListProps {
  payouts: Payout[]
  onPayoutClick: (payout: Payout) => void
  onCreatePayout: () => void
  isAuthenticated: boolean
}

export function PayoutsList({ payouts, onPayoutClick, onCreatePayout, isAuthenticated }: PayoutsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [minAmount, setMinAmount] = useState<string>("")
  const [maxAmount, setMaxAmount] = useState<string>("")

  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch = payout.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCurrency = currencyFilter === "all" || payout.currency === currencyFilter

    // Skip date filtering for now since payout.date is already formatted
    const matchesDateFrom = true
    const matchesDateTo = true

    const minAmountNum = minAmount ? Number.parseFloat(minAmount) : 0
    const maxAmountNum = maxAmount ? Number.parseFloat(maxAmount) : Number.POSITIVE_INFINITY
    const matchesAmount = payout.amountUSD >= minAmountNum && payout.amountUSD <= maxAmountNum

    return matchesSearch && matchesCurrency && matchesDateFrom && matchesDateTo && matchesAmount
  })

  const clearFilters = () => {
    setCurrencyFilter("all")
    setDateFrom(undefined)
    setDateTo(undefined)
    setMinAmount("")
    setMaxAmount("")
  }

  const hasActiveFilters = currencyFilter !== "all" || dateFrom || dateTo || minAmount || maxAmount

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Payout History</h2>
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <>
              <Badge variant="secondary" className="text-sm">
                {filteredPayouts.length} payouts
              </Badge>
              <Button onClick={onCreatePayout} size="lg" className="gap-2 cursor-pointer">
                <Plus className="w-5 h-5" />
                Create Payout
              </Button>
            </>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

        {showFilters && (
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
                  <X className="w-3 h-3" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Currency</label>
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="COP">COP</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Amount Range (USD)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Date From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Date To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      <div className="grid gap-3">
        {!isAuthenticated ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Lock className="w-12 h-12" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                <p className="text-sm">Please login to view your payout history and create new payouts</p>
              </div>
            </div>
          </Card>
        ) : filteredPayouts.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <p className="text-sm">No payouts found matching your filters</p>
            </div>
          </Card>
        ) : (
          filteredPayouts.map((payout) => (
            <Card
              key={payout.id}
              className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
              onClick={() => onPayoutClick(payout)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <ArrowUpRight className="w-5 h-5 text-secondary-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <h3 className="font-semibold text-foreground truncate">{payout.recipientName}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>
                        {payout.date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    ${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {payout.currency}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
