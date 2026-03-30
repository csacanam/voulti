"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Download, Info } from "lucide-react"
import type { CSVRow } from "@/lib/types"

interface UploadStepProps {
  onUpload: (data: CSVRow[], errors: number[]) => void
}

const VALID_CURRENCIES = ["COP", "BRL", "MXN"]

export function UploadStep({ onUpload }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const csvContent = `name,email,wallet_address,currency,amount
John Doe,john.doe@example.com,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,COP,1000000
Jane Smith,jane.smith@example.com,0x8ba1f109551bD432803012645Ac136ddd64DBA72,BRL,5500
Carlos Lopez,carlos.lopez@example.com,0xdD2FD4581271e230360230F9337D5c0430Bf44C0,MXN,18500`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "payout_template.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const validateCSV = (data: CSVRow[]): number[] => {
    const errors: number[] = []

    data.forEach((row, index) => {
      if (!row.name || !row.email || !row.walletAddress || !row.currency || !row.amount) {
        errors.push(index)
      } else if (!VALID_CURRENCIES.includes(row.currency.toUpperCase())) {
        errors.push(index)
      } else if (isNaN(row.amount) || row.amount <= 0) {
        errors.push(index)
      }
    })

    return errors
  }

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const data: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())
      data.push({
        name: values[0] || "",
        email: values[1] || "",
        walletAddress: values[2] || "",
        currency: values[3]?.toUpperCase() || "",
        amount: Number.parseFloat(values[4]) || 0,
      })
    }

    return data
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      const errors = validateCSV(data)
      onUpload(data, errors)
    }

    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith(".csv")) {
      handleFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const scrollToInstructions = () => {
    const instructionsElement = document.getElementById("bulk-instructions")
    instructionsElement?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="space-y-6 py-4">
      <div className="bg-muted p-5 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Bulk Payout</h3>
            <p className="text-sm text-muted-foreground">
              Process multiple payments at once by uploading a CSV file with all recipient details.{" "}
              <button type="button" onClick={scrollToInstructions} className="text-primary hover:underline font-medium">
                View instructions below
              </button>
            </p>
          </div>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary">
            {fileName ? (
              <FileText className="w-8 h-8 text-secondary-foreground" />
            ) : (
              <Upload className="w-8 h-8 text-secondary-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">{fileName || "Drag your CSV file here"}</p>
            <p className="text-sm text-muted-foreground">or click to select</p>
          </div>

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileInput} className="hidden" />

          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Select File
          </Button>
        </div>
      </div>

      <div id="bulk-instructions" className="bg-muted p-5 rounded-lg space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-2">File Requirements</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Your CSV file must include the following columns with the exact header names:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              <strong>name</strong> - Recipient's full name
            </li>
            <li>
              <strong>email</strong> - Recipient's email address
            </li>
            <li>
              <strong>wallet_address</strong> - Recipient's wallet address
            </li>
            <li>
              <strong>currency</strong> - Payment currency (must be COP, BRL, or MXN)
            </li>
            <li>
              <strong>amount</strong> - Amount to transfer in the specified currency
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Valid currencies:</strong> COP (Colombian Peso), BRL (Brazilian Real), MXN (Mexican Peso)
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>
      </div>
    </div>
  )
}
