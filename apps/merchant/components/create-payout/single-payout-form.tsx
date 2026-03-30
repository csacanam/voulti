"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { CSVRow } from "@/lib/types"

interface SinglePayoutFormProps {
  currentBalance: number
  onSubmit: (data: CSVRow) => void
  disabled?: boolean
}

const EXCHANGE_RATES: Record<string, number> = {
  COP: 4200,
  BRL: 5.5,
  MXN: 18.5,
}

export function SinglePayoutForm({ currentBalance, onSubmit, disabled = false }: SinglePayoutFormProps) {
  const [formData, setFormData] = useState<CSVRow>({
    name: "",
    email: "",
    walletAddress: "", // Will be auto-generated
    currency: "COP",
    amount: 0,
  })

  const amountUSD = formData.amount / EXCHANGE_RATES[formData.currency]
  const hasEnoughBalance = amountUSD <= currentBalance
  const isFormValid = formData.name && formData.email && formData.currency && formData.amount > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isFormValid && hasEnoughBalance) {
      // Auto-generate wallet address or leave empty for backend to handle
      const payoutData = {
        ...formData,
        walletAddress: formData.walletAddress || `0x${Date.now().toString(16)}`, // Temporary placeholder
      }
      onSubmit(payoutData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Recipient Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
            disabled={disabled}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COP">COP - Colombian Peso</SelectItem>
              <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
              <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) || 0 })}
            required
            disabled={disabled}
          />
        </div>
      </div>

      {formData.amount > 0 && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount in {formData.currency}:</span>
            <span className="font-medium text-foreground">{formData.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Equivalent in USD:</span>
            <span className="font-semibold text-foreground">
              ${amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">Remaining Balance:</span>
            <span className={`font-semibold ${hasEnoughBalance ? "text-accent" : "text-destructive"}`}>
              ${(currentBalance - amountUSD).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {!hasEnoughBalance && formData.amount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Insufficient balance. You need $
            {(amountUSD - currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })} more.
          </AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        disabled={!isFormValid || !hasEnoughBalance || disabled} 
        size="lg" 
        className="w-full gap-2 cursor-pointer"
      >
        {disabled ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Create Payout
          </>
        )}
      </Button>
    </form>
  )
}
