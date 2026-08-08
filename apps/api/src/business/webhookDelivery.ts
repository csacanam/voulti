import { createHmac } from 'crypto';

/**
 * One place that builds, signs and delivers a webhook — and says what happened.
 *
 * Two reasons it lives apart from NotificationService:
 *
 * 1. The dashboard needs to send the *same* request the cron sends. If the test
 *    button and the real delivery each built their own payload they would drift,
 *    and a merchant would certify an integration against a shape we never send.
 *
 * 2. Until now a failed delivery left behind one boolean and a counter. The
 *    merchant's email said "HTTP Error Response" and nothing else — not the
 *    status code, not the body, not whether we even reached the host. That is
 *    the difference between "it doesn't work" and "you're returning 404".
 *    Everything needed to say which is in this function's return value.
 */

/** Matches the timeout the cron delivery uses: a slow endpoint should fail the
 *  test for the same reason it fails in production, not pass on a longer rope. */
export const WEBHOOK_TIMEOUT_MS = 2000;

const MAX_BODY_CHARS = 500;

export interface WebhookPayload {
  invoice_id: string;
  amount_fiat: number;
  fiat_currency: string;
  paid_at?: string | null;
  paid_tx_hash?: string | null;
  paid_token?: string | null;
  paid_network?: string | null;
  paid_amount?: number | null;
  status: string;
  reference?: string | null;
  description?: string | null;
  /** Present and true only on deliveries fired from the dashboard's test
   *  button. Absent on every real one — a handler that keys on it can refuse
   *  to ship goods for a rehearsal. */
  test?: true;
}

export interface DeliveryResult {
  /** Whether the endpoint answered 2xx. Everything else is diagnosis. */
  ok: boolean;
  /** HTTP status, or null when the request never got an answer. */
  status: number | null;
  /** First 500 chars of the response body, for reading stack traces back. */
  body: string | null;
  durationMs: number;
  /** Set when there was no HTTP response at all: DNS, refused, TLS, timeout. */
  error: string | null;
  /** False when the commerce has no signing secret, so the delivery went out
   *  unsigned and the receiver had nothing to verify. */
  signed: boolean;
}

/**
 * Sign and POST a payload, reporting the outcome instead of a boolean.
 *
 * Never throws: a network failure is a result, not an exception, because every
 * caller wants to show it rather than handle it.
 */
export async function deliverWebhook(
  url: string,
  secret: string | null | undefined,
  payload: WebhookPayload
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Stripe-style, replay-resistant:
  //   X-Voulti-Signature: t=<unix_seconds>,v1=hex(hmacSHA256(secret, `${t}.${body}`))
  if (secret) {
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    headers['X-Voulti-Signature'] = `t=${t},v1=${v1}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    // Read the body even on success: a 200 with an error inside it is a real
    // thing integrators ship, and the log is where they will notice.
    let text: string | null = null;
    try {
      text = (await response.text()).slice(0, MAX_BODY_CHARS);
    } catch {
      text = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      body: text,
      durationMs: Date.now() - startedAt,
      error: null,
      signed: Boolean(secret),
    };
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      status: null,
      body: null,
      durationMs,
      error: aborted
        ? `No answer within ${WEBHOOK_TIMEOUT_MS}ms — the delivery was aborted`
        : err?.message || 'Request failed',
      signed: Boolean(secret),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * The payload for a real invoice. Kept here so the cron, the resend button and
 * the test button cannot disagree about the shape.
 */
export function buildPayload(invoice: {
  id: string;
  amount_fiat: number;
  fiat_currency: string;
  paid_at?: string | null;
  paid_tx_hash?: string | null;
  paid_token?: string | null;
  paid_network?: string | null;
  paid_amount?: number | null;
  status: string;
  reference?: string | null;
  description?: string | null;
}): WebhookPayload {
  return {
    invoice_id: invoice.id,
    amount_fiat: invoice.amount_fiat,
    fiat_currency: invoice.fiat_currency,
    paid_at: invoice.paid_at ?? null,
    paid_tx_hash: invoice.paid_tx_hash ?? null,
    paid_token: invoice.paid_token ?? null,
    paid_network: invoice.paid_network ?? null,
    paid_amount: invoice.paid_amount ?? null,
    status: invoice.status,
    reference: invoice.reference ?? null,
    description: invoice.description ?? null,
  };
}

/** The id every test delivery carries. A valid UUID, so a handler that parses
 *  one does not fail for the wrong reason, and all zeroes so it is obvious. */
export const TEST_INVOICE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * A rehearsal of one of the three events we actually send, marked `test: true`.
 *
 * Shaped exactly like the real thing so a handler that parses this parses
 * production — including the fields that are null on a given event, which is
 * where handlers break: `paid_tx_hash` is absent on Expired, and a handler that
 * assumes it exists throws on the first expiry it ever sees.
 */
export function buildTestPayload(
  event: 'Paid' | 'Expired' | 'Refunded',
  opts: { amount_fiat: number; fiat_currency: string }
): WebhookPayload {
  const base: WebhookPayload = {
    invoice_id: TEST_INVOICE_ID,
    amount_fiat: opts.amount_fiat,
    fiat_currency: opts.fiat_currency,
    paid_at: null,
    paid_tx_hash: null,
    paid_token: null,
    paid_network: null,
    paid_amount: null,
    status: event,
    reference: 'voulti-webhook-test',
    description: 'Test delivery from the Voulti dashboard',
    test: true,
  };

  if (event === 'Paid' || event === 'Refunded') {
    return {
      ...base,
      paid_at: new Date().toISOString(),
      paid_tx_hash: '0x' + '0'.repeat(64),
      paid_token: 'USDC',
      paid_network: 'celo',
      paid_amount: opts.amount_fiat,
    };
  }

  return base;
}
