"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink, RefreshCw } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { apiClient } from "@/services/api"
import { WebhookDeliveryResult, type DeliveryResult } from "@/components/webhook-delivery-result"
import type { PaymentLink } from "@/lib/types"

/**
 * The full record for one charge.
 *
 * The table kept growing new fields until nothing fit: the description was cut
 * to a few words, the payer address sat unlabelled under two other values, and
 * the actions were an unexplained "Copy" and "ID". A row is for scanning and
 * comparing; looking a payment up is a different job and needs its own surface,
 * where every value can carry its name.
 */

const EXPLORERS: Record<string, string> = {
  celo: "https://celoscan.io",
  arbitrum: "https://arbiscan.io",
  polygon: "https://polygonscan.com",
  base: "https://basescan.org",
  bsc: "https://bscscan.com",
}

const explorer = (network: string | undefined, kind: "tx" | "address", value: string) =>
  `${EXPLORERS[(network || "").toLowerCase()] || EXPLORERS.celo}/${kind}/${value}`

const shorten = (v: string) => `${v.slice(0, 10)}…${v.slice(-6)}`

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-start py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <div className="text-sm min-w-0">{children}</div>
    </div>
  )
}

function CopyValue({ value, display }: { value: string; display?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-xs truncate">{display || value}</span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export function PaymentDetailDialog({
  link,
  open,
  onOpenChange,
  statusLabel,
  statusClass,
}: {
  link: PaymentLink | null
  open: boolean
  onOpenChange: (open: boolean) => void
  statusLabel: string
  statusClass: string
}) {
  const { t } = useLanguage()

  /**
   * Re-send this charge's webhook.
   *
   * The cron stops after five failures and the invoice leaves the queue for
   * good; until now the way back was an admin endpoint we ran by hand, so a
   * merchant whose server was down for ten minutes had to write to us. The
   * result is shown rather than toasted because the status code and the body
   * are the reason to press it.
   */
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<DeliveryResult | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  const resend = async () => {
    if (!link) return
    setResending(true)
    setResendResult(null)
    setResendError(null)
    try {
      const res = await apiClient.post<{ success: boolean; data: DeliveryResult }>(
        `/invoices/${link.id}/resend-webhook`
      )
      setResendResult(res.data)
    } catch (err: any) {
      setResendError(err?.message || "Request failed")
    } finally {
      setResending(false)
    }
  }

  // Hooks must run on every render, so this guard comes after them.
  if (!link) return null

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t.detail.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-0">
          <Row label={t.detail.status}>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
              {statusLabel}
            </span>
          </Row>

          <Row label={t.detail.amount}>
            <div className="font-semibold">
              {link.currency} {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            {link.paidAmount && link.paidToken && (
              <div className="text-xs text-muted-foreground">
                {link.paidAmount} {link.paidToken}
                {link.network ? ` · ${link.network}` : ""}
              </div>
            )}
          </Row>

          {link.description && (
            // Full, wrapped. This is the one field the payer actually read, and
            // in the table it was cut mid-word.
            <Row label={t.detail.description}>
              <p className="break-words">{link.description}</p>
            </Row>
          )}

          <Row label={t.detail.reference}>
            {link.reference ? (
              <span className="break-words">{link.reference}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>

          <Row label={t.detail.paidFrom}>
            {link.payerAddress ? (
              <div className="flex items-center gap-2 min-w-0">
                <CopyValue value={link.payerAddress} display={shorten(link.payerAddress)} />
                <a
                  href={explorer(link.network, "address", link.payerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary shrink-0"
                  aria-label="Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">{t.detail.noPayer}</span>
            )}
          </Row>

          {link.txHash && (
            <Row label={t.detail.transaction}>
              <div className="flex items-center gap-2 min-w-0">
                <CopyValue value={link.txHash} display={shorten(link.txHash)} />
                <a
                  href={explorer(link.network, "tx", link.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary shrink-0"
                  aria-label="Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </Row>
          )}

          <Row label={t.detail.invoiceId}>
            <CopyValue value={link.id} />
          </Row>

          <Row label={t.detail.paymentLink}>
            <CopyValue value={link.url} display={link.url.replace(/^https?:\/\//, "")} />
          </Row>

          <Row label={t.detail.created}>{fmtDate(link.created)}</Row>

          {link.expires && (
            <Row label={t.detail.expires}>{fmtDate(link.expires)}</Row>
          )}
        </div>

        {/* Only the three statuses that produce a delivery. Offering it on a
            pending charge would promise to re-send something never sent. */}
        {link.status !== "active" && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t.webhookTest.resendHint}</p>
              <Button variant="outline" size="sm" disabled={resending} onClick={resend} className="gap-2 shrink-0">
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                {resending ? t.webhookTest.resending : t.webhookTest.resend}
              </Button>
            </div>
            {resendError && <p className="mt-2 text-xs text-red-500">{resendError}</p>}
            {resendResult && <WebhookDeliveryResult result={resendResult} />}
          </div>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full mt-2">
          {t.detail.close}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
