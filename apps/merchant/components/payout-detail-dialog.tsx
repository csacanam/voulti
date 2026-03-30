"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, ExternalLink, Calendar, Wallet, Hash, Mail } from "lucide-react"
import type { Payout } from "@/lib/types"

interface PayoutDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payout: Payout | null
}

export function PayoutDetailDialog({ open, onOpenChange, payout }: PayoutDetailDialogProps) {
  if (!payout) return null

  const handleDownloadReceipt = () => {
    const receipt = `
PAYOUT RECEIPT
==============

ID: ${payout.id}
Date: ${payout.date}
Recipient: ${payout.recipientName}
Email: ${payout.email}
Wallet: ${payout.walletAddress}
Amount: $${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
Local Amount: ${payout.amount.toLocaleString()} ${payout.currency}
Status: ${payout.status}
TX Hash: ${payout.txHash}
    `.trim()

    const blob = new Blob([receipt], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `receipt-${payout.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const explorerUrl = `https://etherscan.io/tx/${payout.txHash}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">Payout Details</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">{payout.recipientName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {payout.date}
                </span>
              </div>
            </div>

            <Badge className="bg-accent text-accent-foreground">
              {payout.statusOriginal || "Unknown"}
            </Badge>
          </div>

          <div className="border-t border-b border-border py-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Amount Transferred</p>
              <p className="text-4xl font-bold text-foreground">
                ${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-lg text-muted-foreground">
                {payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {payout.currency} to recipient
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">Email</p>
                <p className="text-sm text-muted-foreground">{payout.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Wallet className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">Wallet Address</p>
                <p className="text-sm text-muted-foreground font-mono break-all">{payout.walletAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">Transaction Hash</p>
                <p className="text-sm text-muted-foreground font-mono break-all">{payout.txHash}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 gap-2 bg-transparent"
            onClick={() => window.open(explorerUrl, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </Button>

          <Button className="flex-1 gap-2" onClick={handleDownloadReceipt}>
            <Download className="w-4 h-4" />
            Download Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
