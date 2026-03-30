"use client"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import type { CSVRow } from "@/lib/types"

interface ConfirmationStepProps {
  csvData: CSVRow[]
  currentBalance: number
}

const EXCHANGE_RATES: Record<string, number> = {
  COP: 4200,
  BRL: 5.5,
  MXN: 18.5,
}

export function ConfirmationStep({ csvData, currentBalance }: ConfirmationStepProps) {
  const payoutsWithUSD = csvData.map((row) => ({
    ...row,
    amountUSD: row.amount / EXCHANGE_RATES[row.currency],
  }))

  const totalUSD = payoutsWithUSD.reduce((sum, p) => sum + p.amountUSD, 0)
  const hasEnoughBalance = totalUSD <= currentBalance

  return (
    <div className="space-y-6 pb-4">
      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Payout Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Recipients:</span>
            <span className="text-lg font-semibold text-foreground">{csvData.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Amount to Deduct:</span>
            <span className="text-2xl font-bold text-foreground">
              ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Remaining Balance:</span>
            <span className={`text-lg font-semibold ${hasEnoughBalance ? "text-accent" : "text-destructive"}`}>
              $
              {(currentBalance - totalUSD).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {!hasEnoughBalance && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Insufficient balance. You need $
            {(totalUSD - currentBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })} additional.
          </AlertDescription>
        </Alert>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3">
          <h3 className="font-semibold text-foreground">Payout Details</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Recipient</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Currency</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payoutsWithUSD.map((payout, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-foreground">{payout.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {payout.currency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground font-medium">
                    {payout.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    ${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
