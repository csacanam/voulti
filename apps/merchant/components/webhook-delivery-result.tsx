"use client"

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

/**
 * What the merchant's endpoint answered.
 *
 * Shared by the test button and the resend button so both read the same, and so
 * there is exactly one place that decides how a failure is phrased. Before this,
 * a failed delivery produced an email saying "HTTP Error Response" — true, and
 * useless. Everything here exists because someone has to fix their server and
 * cannot do it without the status code and the body.
 */

export interface DeliveryResult {
  ok: boolean
  status: number | null
  body: string | null
  durationMs: number
  error: string | null
  signed: boolean
}

export function WebhookDeliveryResult({ result }: { result: DeliveryResult }) {
  const { t } = useLanguage()

  return (
    <div
      className={`mt-3 rounded-lg border p-3 text-sm ${
        result.ok
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        {result.ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {result.ok ? t.webhookTest.accepted : t.webhookTest.rejected}
          </p>

          <p className="text-xs text-muted-foreground mt-0.5">
            {result.status !== null
              ? `HTTP ${result.status} · ${result.durationMs} ms`
              : result.error}
          </p>

          {/* The response body is the whole point: it is where the merchant's
              own stack trace comes back to them. */}
          {result.body && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-40">
              {result.body}
            </pre>
          )}
        </div>
      </div>

      {/* A delivery nobody can verify is a delivery anyone can forge. Worth
          saying on success, precisely because success is when it is ignored. */}
      {!result.signed && (
        <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border/50">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">{t.webhookTest.unsignedWarning}</p>
        </div>
      )}
    </div>
  )
}
