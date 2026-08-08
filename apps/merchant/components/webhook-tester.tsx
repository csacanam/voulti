"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { apiClient } from "@/services/api"
import { useLanguage } from "@/components/providers/language-provider"
import { WebhookDeliveryResult, type DeliveryResult } from "@/components/webhook-delivery-result"

/**
 * Fire one of the three real events at the merchant's own webhook URL.
 *
 * The gap this closes: the only way to see your handler run used to be to be
 * paid, which for a backend developer means a funded wallet on one of five
 * chains before the first `if` can be debugged. Nobody iterates a signature
 * check at one real payment per attempt — they skip the check.
 *
 * All three events are here on purpose. `Expired` and `Refunded` carry null
 * payment fields, and a handler written against `Paid` alone throws on the
 * first one it meets — which, since Voulti started refunding expired deposits,
 * is a live way to leave an order shipped after the money went back.
 */

const EVENTS = ["Paid", "Expired", "Refunded"] as const
type Event = (typeof EVENTS)[number]

export function WebhookTester({
  commerceId,
  hasUrl,
}: {
  commerceId: string
  hasUrl: boolean
}) {
  const { t } = useLanguage()
  const [sending, setSending] = useState<Event | null>(null)
  const [result, setResult] = useState<DeliveryResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const label: Record<Event, string> = {
    Paid: t.webhookTest.eventPaid,
    Expired: t.webhookTest.eventExpired,
    Refunded: t.webhookTest.eventRefunded,
  }

  const send = async (event: Event) => {
    setSending(event)
    setResult(null)
    setFailed(null)
    try {
      const res = await apiClient.post<{ success: boolean; data: DeliveryResult }>(
        `/commerces/${commerceId}/webhook-test`,
        { event }
      )
      setResult(res.data)
    } catch (err: any) {
      // A failure to *reach Voulti* is a different thing from the merchant's
      // endpoint rejecting the delivery, and must not be dressed as one.
      setFailed(err?.message || t.general.requestFailed)
    } finally {
      setSending(null)
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-1">{t.webhookTest.title}</p>
      <p className="text-xs text-muted-foreground mb-3">{t.webhookTest.subtitle}</p>

      {!hasUrl ? (
        <p className="text-xs text-muted-foreground italic">{t.webhookTest.noUrl}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {EVENTS.map((event) => (
            <Button
              key={event}
              variant="outline"
              size="sm"
              disabled={sending !== null}
              onClick={() => send(event)}
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {sending === event ? t.webhookTest.sending : label[event]}
            </Button>
          ))}
        </div>
      )}

      {failed && <p className="mt-3 text-xs text-red-500">{failed}</p>}
      {result && <WebhookDeliveryResult result={result} />}
    </div>
  )
}
