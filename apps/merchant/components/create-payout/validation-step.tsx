"use client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import type { CSVRow } from "@/lib/types"

interface ValidationStepProps {
  csvData: CSVRow[]
  errors: number[]
}

export function ValidationStep({ csvData, errors }: ValidationStepProps) {
  const errorMessages = errors.map((errorIndex) => {
    const row = csvData[errorIndex]
    const rowNumber = errorIndex + 1
    const issues: string[] = []

    if (!row.name) issues.push("missing name")
    if (!row.email) issues.push("missing email")
    if (!row.walletAddress) issues.push("missing wallet address")
    if (!row.currency) issues.push("missing currency")
    else if (!["COP", "BRL", "MXN"].includes(row.currency.toUpperCase())) issues.push("invalid currency")
    if (!row.amount || row.amount <= 0) issues.push("invalid amount")

    return `Row ${rowNumber}: ${issues.join(", ")}`
  })

  return (
    <div className="space-y-6 pb-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Found {errors.length} rows with errors</AlertTitle>
        <AlertDescription>Please fix the following issues and upload the file again</AlertDescription>
      </Alert>

      <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/5">
        <h3 className="font-semibold text-foreground mb-3">Error Details:</h3>
        <ul className="space-y-2">
          {errorMessages.map((message, index) => (
            <li key={index} className="text-sm text-foreground flex items-start gap-2">
              <span className="text-destructive mt-0.5">•</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
