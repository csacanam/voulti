"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, ExternalLink, Calendar, Wallet, Hash, Mail } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import type { Payout } from "@/lib/types"

interface PayoutDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payout: Payout | null
}

export function PayoutDetailDialog({ open, onOpenChange, payout }: PayoutDetailDialogProps) {
  const { t } = useLanguage()

  if (!payout) return null

  const r = t.payoutDetail

  const handleDownloadReceipt = () => {
    // The receipt is a file the merchant keeps, so it follows the dashboard's
    // language too — not just the screen it was downloaded from.
    const receipt = `
${r.receiptTitle}
${"=".repeat(r.receiptTitle.length)}

${r.receiptId}: ${payout.id}
${r.receiptDate}: ${payout.date}
${r.receiptRecipient}: ${payout.recipientName}
${r.receiptEmail}: ${payout.email}
${r.receiptWallet}: ${payout.walletAddress}
${r.receiptAmount}: $${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
${r.receiptLocalAmount}: ${payout.amount.toLocaleString()} ${payout.currency}
${r.receiptStatus}: ${payout.status}
${r.receiptTxHash}: ${payout.txHash}
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
          <DialogTitle className="text-2xl">{r.title}</DialogTitle>
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

            {/* Neutral on purpose: this prints whatever status the payout came
                back with, so it must not colour itself as success. */}
            <Badge className="bg-secondary text-secondary-foreground">
              {payout.statusOriginal || r.unknownStatus}
            </Badge>
          </div>

          <div className="border-t border-b border-border py-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">{r.amountTransferred}</p>
              <p className="text-4xl font-bold text-foreground">
                ${payout.amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-lg text-muted-foreground">
                {payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {payout.currency} {r.toRecipient}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">{r.email}</p>
                <p className="text-sm text-muted-foreground">{payout.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Wallet className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">{r.wallet}</p>
                <p className="text-sm text-muted-foreground font-mono break-all">{payout.walletAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-1">{r.txHash}</p>
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
            {r.viewOnExplorer}
          </Button>

          <Button className="flex-1 gap-2" onClick={handleDownloadReceipt}>
            <Download className="w-4 h-4" />
            {r.downloadReceipt}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
