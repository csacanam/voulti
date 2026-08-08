"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { apiClient } from "@/services/api"
import { useLanguage } from "@/components/providers/language-provider"

/**
 * Every delivery attempt for one charge.
 *
 * The state this replaces: a boolean and a counter on the invoice, and an email
 * that said "HTTP Error Response". A merchant could see *that* it failed and
 * nothing about why — which is the difference between "your webhook is broken"
 * and "your endpoint has been answering 404 since 3:41".
 *
 * Collapsed by default. When deliveries are working nobody wants to read them,
 * and the row that matters is the one that failed.
 */

interface Delivery {
  id: string
  event: string
  url: string
  ok: boolean
  status_code: number | null
  response_body: string | null
  error: string | null
  duration_ms: number
  signed: boolean
  is_test: boolean
  created_at: string
}

export function WebhookHistory({ invoiceId }: { invoiceId: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    if (!open || deliveries !== null) return

    apiClient
      .get<{ success: boolean; data: Delivery[] }>(`/invoices/${invoiceId}/webhook-deliveries`)
      .then((res) => setDeliveries(res.data))
      .catch((err: any) => setFailed(err?.message || t.general.requestFailed))
  }, [open, invoiceId, deliveries])

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit",
    })

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {t.webhookTest.historyTitle}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {failed && <p className="text-xs text-red-500">{failed}</p>}

          {!failed && deliveries === null && (
            <p className="text-xs text-muted-foreground">{t.webhookTest.historyLoading}</p>
          )}

          {/* An empty history is an answer, not a blank space: it means we never
              tried, which usually means no webhook URL was set at the time. */}
          {deliveries?.length === 0 && (
            <p className="text-xs text-muted-foreground">{t.webhookTest.historyEmpty}</p>
          )}

          {deliveries?.map((d) => (
            <div key={d.id} className="text-xs border border-border/50 rounded-md p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.ok ? "bg-emerald-500" : "bg-red-500"}`}
                  aria-hidden
                />
                <span className="font-medium">
                  {d.status_code !== null ? `HTTP ${d.status_code}` : t.webhookTest.noResponse}
                </span>
                <span className="text-muted-foreground">{d.event}</span>
                <span className="text-muted-foreground">{d.duration_ms} ms</span>
                <span className="text-muted-foreground ml-auto">{fmt(d.created_at)}</span>
              </div>

              {/* Only the parts that explain a failure, and only when there is one. */}
              {d.error && <p className="text-muted-foreground mt-1 break-words">{d.error}</p>}
              {!d.ok && d.response_body && (
                <pre className="mt-1 p-1.5 bg-muted rounded text-[11px] overflow-x-auto whitespace-pre-wrap break-words max-h-24">
                  {d.response_body}
                </pre>
              )}
              {!d.signed && (
                <p className="text-amber-500 mt-1">{t.webhookTest.historyUnsigned}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
