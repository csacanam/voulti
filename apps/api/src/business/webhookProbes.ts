import { createHmac } from 'crypto';
import { buildTestPayload, WebhookPayload } from './webhookDelivery';
import { deliverAndLog } from './webhookLog';

/**
 * Find out whether a merchant's endpoint actually verifies our signature.
 *
 * A green `200` from the test button proves the endpoint is reachable and does
 * not crash. It proves nothing about security: a handler that verifies nothing
 * and one that verifies correctly answer a valid delivery identically. The only
 * way to tell them apart is to send something they *should refuse* and see
 * whether they do.
 *
 * That matters more here than in most integrations. Voulti's webhook is the
 * message that says "this person paid" — a merchant who does not verify will
 * ship goods to anyone who learns the URL. And nobody can check this from the
 * outside except us: we are the only party who can sign, and therefore the only
 * one who can mis-sign on purpose.
 *
 * Every probe carries `test: true` and the all-zeros invoice id, so even a
 * handler that wrongly accepts one has been told, in the payload, that no money
 * moved.
 */

const HOUR_SECONDS = 3600;

export type ProbeVerdict = 'pass' | 'fail' | 'inconclusive';

export type ProbeId =
  | 'accepts-valid'
  | 'has-secret'
  | 'rejects-tampered'
  | 'rejects-replay'
  | 'rejects-unsigned';

/**
 * A probe reports what happened, not how to say it.
 *
 * The first version returned English titles and advice, which the dashboard
 * painted verbatim — so a merchant reading a Spanish dashboard got English
 * findings. Deciding wording is the client's job; it is the only side that
 * knows who is reading.
 */
export interface ProbeResult {
  id: ProbeId;
  verdict: ProbeVerdict;
  /** HTTP status, or null when there was no response at all. */
  status: number | null;
  durationMs: number;
  /** Transport failure — DNS, refused, timeout — when there is no status. */
  error: string | null;
}

function sign(secret: string, body: string, atSeconds: number): string {
  const v1 = createHmac('sha256', secret).update(`${atSeconds}.${body}`).digest('hex');
  return `t=${atSeconds},v1=${v1}`;
}

/** Flip the signature's last hex digit: same shape, wrong value. */
function tamper(signature: string): string {
  return signature.replace(/([0-9a-f])$/, (c) => (c === 'f' ? 'e' : 'f'));
}

interface ProbeContext {
  url: string;
  secret: string | null;
  commerceId: string;
}

async function send(
  ctx: ProbeContext,
  payload: WebhookPayload,
  signature: string | null | undefined
) {
  return deliverAndLog(
    ctx.url,
    ctx.secret,
    payload,
    { commerceId: ctx.commerceId, invoiceId: null, event: payload.status, isTest: true },
    { signature }
  );
}

export async function runConformanceProbes(ctx: ProbeContext): Promise<ProbeResult[]> {
  const payload = buildTestPayload('Paid', { amount_fiat: 1000, fiat_currency: 'USD' });
  const body = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const results: ProbeResult[] = [];

  // ── Do we even hold a secret? Checked before anything is sent, because
  //    without one every delivery below goes out unsigned — including the
  //    control — and an endpoint that correctly refuses an unsigned payment
  //    notification then fails the control and gets told to fix itself. That
  //    reading is backwards: refusing was the right call, and the missing
  //    secret is ours. Running the probes first meant this branch was never
  //    even reached for those merchants, so the one finding that explained
  //    everything was the one they never saw.
  if (!ctx.secret) {
    results.push({ id: 'has-secret', verdict: 'fail', status: null, durationMs: 0, error: null });

    // Not sent at all. An unsigned delivery would prove nothing either way and
    // would leave a confusing 401 in the merchant's logs to chase.
    for (const id of ['accepts-valid', 'rejects-tampered', 'rejects-replay', 'rejects-unsigned'] as ProbeId[]) {
      results.push({ id, verdict: 'inconclusive', status: null, durationMs: 0, error: null });
    }
    return results;
  }

  // ── Control. Everything below is meaningless if a correct delivery fails.
  const control = await send(ctx, payload, undefined);
  results.push({
    id: 'accepts-valid',
    verdict: control.ok ? 'pass' : 'fail',
    status: control.status,
    durationMs: control.durationMs,
    error: control.error,
  });

  if (!control.ok) {
    // Refusing everything is not the same as verifying, and reporting the
    // rejections below as passes would hand out a security clearance to an
    // endpoint that is simply down.
    for (const id of ['rejects-tampered', 'rejects-replay', 'rejects-unsigned'] as ProbeId[]) {
      results.push({ id, verdict: 'inconclusive', status: null, durationMs: 0, error: null });
    }
    return results;
  }

  // ── A forged signature of the right shape.
  const tampered = await send(ctx, payload, tamper(sign(ctx.secret, body, now)));
  results.push({
    id: 'rejects-tampered',
    verdict: tampered.ok ? 'fail' : 'pass',
    status: tampered.status,
    durationMs: tampered.durationMs,
    error: tampered.error,
  });

  // ── A signature that was valid an hour ago, which is what a captured
  //    delivery replayed later looks like.
  const stale = await send(ctx, payload, sign(ctx.secret, body, now - HOUR_SECONDS));
  results.push({
    id: 'rejects-replay',
    verdict: stale.ok ? 'fail' : 'pass',
    status: stale.status,
    durationMs: stale.durationMs,
    error: stale.error,
  });

  // ── No header at all: the shape an attacker sends before finding out we sign.
  const unsigned = await send(ctx, payload, null);
  results.push({
    id: 'rejects-unsigned',
    verdict: unsigned.ok ? 'fail' : 'pass',
    status: unsigned.status,
    durationMs: unsigned.durationMs,
    error: unsigned.error,
  });

  return results;
}

/** Whether anything here should stop a merchant from going live. */
export function summarise(results: ProbeResult[]): { passed: number; failed: number; ok: boolean } {
  const failed = results.filter((r) => r.verdict === 'fail').length;
  return {
    passed: results.filter((r) => r.verdict === 'pass').length,
    failed,
    ok: failed === 0,
  };
}
