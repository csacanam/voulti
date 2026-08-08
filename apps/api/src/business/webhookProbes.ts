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

export interface ProbeResult {
  id: string;
  /** What we sent and why, in the merchant's terms. */
  title: string;
  verdict: ProbeVerdict;
  /** What we expected the endpoint to do. */
  expectation: string;
  /** What it did. */
  observed: string;
  /** Only when something needs fixing: what to change. */
  advice?: string;
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

  // ── Control. Everything below is meaningless if a correct delivery fails.
  const control = await send(ctx, payload, undefined);
  results.push({
    id: 'accepts-valid',
    title: 'Accepts a correctly signed delivery',
    verdict: control.ok ? 'pass' : 'fail',
    expectation: 'Answers 2xx',
    observed: control.status !== null ? `HTTP ${control.status} in ${control.durationMs} ms` : control.error || 'no response',
    advice: control.ok
      ? undefined
      : 'Fix this first. Until a valid delivery is accepted, the checks below cannot tell a strict endpoint from a broken one.',
  });

  if (!control.ok) {
    // Refusing everything is not the same as verifying, and reporting the
    // rejections below as passes would hand out a security clearance to an
    // endpoint that is simply down.
    for (const [id, title] of [
      ['rejects-tampered', 'Rejects a tampered signature'],
      ['rejects-replay', 'Rejects an old timestamp'],
      ['rejects-unsigned', 'Rejects an unsigned delivery'],
    ]) {
      results.push({
        id,
        title,
        verdict: 'inconclusive',
        expectation: 'Answers 4xx or 5xx',
        observed: 'Not run — the endpoint rejects valid deliveries too',
      });
    }
    return results;
  }

  if (!ctx.secret) {
    results.push({
      id: 'has-secret',
      title: 'Has a signing secret',
      verdict: 'fail',
      expectation: 'A secret is configured, so deliveries can be verified',
      observed: 'No secret set — every delivery goes out unsigned',
      advice: 'Generate one on this page. Without it there is nothing for your server to check, and anyone who learns your webhook URL can fake a payment.',
    });
    return results;
  }

  // ── A forged signature of the right shape.
  const tampered = await send(ctx, payload, tamper(sign(ctx.secret, body, now)));
  results.push({
    id: 'rejects-tampered',
    title: 'Rejects a tampered signature',
    verdict: tampered.ok ? 'fail' : 'pass',
    expectation: 'Answers 4xx or 5xx',
    observed: tampered.status !== null ? `HTTP ${tampered.status}` : tampered.error || 'no response',
    advice: tampered.ok
      ? 'Your server accepted a payment notification we deliberately signed wrong. Anyone who learns this URL can make it believe an order was paid. Verify X-Voulti-Signature before acting, and reject when it does not match.'
      : undefined,
  });

  // ── A signature that was valid an hour ago, which is what a captured
  //    delivery replayed later looks like.
  const stale = await send(ctx, payload, sign(ctx.secret, body, now - HOUR_SECONDS));
  results.push({
    id: 'rejects-replay',
    title: 'Rejects an old timestamp',
    verdict: stale.ok ? 'fail' : 'pass',
    expectation: 'Answers 4xx or 5xx',
    observed: stale.status !== null ? `HTTP ${stale.status}` : stale.error || 'no response',
    advice: stale.ok
      ? 'The signature was genuine but an hour old. Without a freshness check, a delivery captured once can be replayed at you forever. Reject when t is more than a few minutes old.'
      : undefined,
  });

  // ── No header at all: the shape an attacker sends before finding out we sign.
  const unsigned = await send(ctx, payload, null);
  results.push({
    id: 'rejects-unsigned',
    title: 'Rejects an unsigned delivery',
    verdict: unsigned.ok ? 'fail' : 'pass',
    expectation: 'Answers 4xx or 5xx',
    observed: unsigned.status !== null ? `HTTP ${unsigned.status}` : unsigned.error || 'no response',
    advice: unsigned.ok
      ? 'Your server accepted a delivery with no signature header at all. A missing signature must be treated as a wrong one, not as an absent option.'
      : undefined,
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
