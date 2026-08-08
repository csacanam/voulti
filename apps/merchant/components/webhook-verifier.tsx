"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Check, X, Minus } from "lucide-react"
import { apiClient } from "@/services/api"
import { useLanguage } from "@/components/providers/language-provider"

/**
 * Ask the merchant's endpoint to refuse things, and report whether it can.
 *
 * The test button next to this one answers "is it reachable". This answers a
 * different and larger question: whether anyone who learns the URL can make the
 * server believe an order was paid. A handler that verifies nothing and one
 * that verifies correctly are indistinguishable from a valid delivery — the
 * only way to tell them apart is to send a forgery.
 *
 * Only Voulti can run it, since only Voulti holds the secret and can therefore
 * sign wrongly on purpose.
 */

interface ProbeResult {
  id: string
  title: string
  verdict: "pass" | "fail" | "inconclusive"
  expectation: string
  observed: string
  advice?: string
}

const ICON = {
  pass: <Check className="w-3.5 h-3.5 text-emerald-500" />,
  fail: <X className="w-3.5 h-3.5 text-red-500" />,
  inconclusive: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
}

export function WebhookVerifier({ commerceId, hasUrl }: { commerceId: string; hasUrl: boolean }) {
  const { t } = useLanguage()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ProbeResult[] | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setResults(null)
    setFailed(null)
    try {
      const res = await apiClient.post<{ success: boolean; data: { results: ProbeResult[] } }>(
        `/commerces/${commerceId}/webhook-verify`
      )
      setResults(res.data.results)
    } catch (err: any) {
      setFailed(err?.message || "Request failed")
    } finally {
      setRunning(false)
    }
  }

  const anyFailed = results?.some((r) => r.verdict === "fail")

  return (
    <div>
      <p className="text-sm font-semibold mb-1">{t.webhookVerify.title}</p>
      <p className="text-xs text-muted-foreground mb-3">{t.webhookVerify.subtitle}</p>

      {!hasUrl ? (
        <p className="text-xs text-muted-foreground italic">{t.webhookTest.noUrl}</p>
      ) : (
        <Button variant="outline" size="sm" disabled={running} onClick={run} className="gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          {running ? t.webhookVerify.running : t.webhookVerify.run}
        </Button>
      )}

      {failed && <p className="mt-3 text-xs text-red-500">{failed}</p>}

      {results && (
        <div className="mt-3 space-y-1.5">
          {results.map((r) => (
            <div key={r.id} className="text-xs border border-border/50 rounded-md p-2">
              <div className="flex items-center gap-2">
                {ICON[r.verdict]}
                <span className="font-medium">{r.title}</span>
                <span className="text-muted-foreground ml-auto">{r.observed}</span>
              </div>
              {/* Advice appears only on a failure, and says what an attacker
                  could do rather than which rule was broken. */}
              {r.advice && <p className="text-muted-foreground mt-1.5 leading-relaxed">{r.advice}</p>}
            </div>
          ))}

          {anyFailed && (
            <p className="text-xs text-amber-500 pt-1">{t.webhookVerify.notReady}</p>
          )}
        </div>
      )}
    </div>
  )
}
