import { createClient } from '@supabase/supabase-js';
import { deliverWebhook, DeliveryResult, WebhookPayload, DeliverOptions } from './webhookDelivery';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

/**
 * The only way a webhook should leave this codebase.
 *
 * `deliverWebhook` stays pure — it takes a URL and returns what happened, which
 * is what makes it testable against a real socket without a database. But a
 * delivery nobody recorded is the state we just spent a night regretting: when
 * a real payment failed, all we had was a boolean and a counter, and the
 * merchant's email said "HTTP Error Response".
 *
 * Wrapping the two together means a new call site cannot forget the second
 * half. `webhookDelivery.spec` asserts that nothing outside this file imports
 * the raw function, so "cannot forget" is checked rather than hoped for.
 */

export interface DeliveryContext {
  commerceId: string;
  /** Null for a dashboard test: it announces no real charge. */
  invoiceId: string | null;
  event: string;
  isTest?: boolean;
}

export async function deliverAndLog(
  url: string,
  secret: string | null | undefined,
  payload: WebhookPayload,
  context: DeliveryContext,
  opts: DeliverOptions = {}
): Promise<DeliveryResult> {
  const result = await deliverWebhook(url, secret, payload, opts);

  // Recording is never allowed to affect delivery. If the insert fails the
  // merchant has still been notified, and turning a logging problem into a
  // failed webhook would be strictly worse than losing the row.
  try {
    const { error } = await supabase.from('webhook_deliveries').insert({
      invoice_id: context.invoiceId,
      commerce_id: context.commerceId,
      event: context.event,
      url,
      ok: result.ok,
      status_code: result.status,
      response_body: result.body,
      error: result.error,
      duration_ms: result.durationMs,
      signed: result.signed,
      is_test: context.isTest ?? false,
    });
    if (error) console.error('[webhook-log] insert failed:', error.message);
  } catch (err: any) {
    console.error('[webhook-log] insert threw:', err?.message);
  }

  return result;
}
