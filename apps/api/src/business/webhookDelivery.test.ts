import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { createServer, Server } from 'http';
import { deliverWebhook, buildTestPayload, buildPayload, TEST_INVOICE_ID } from './webhookDelivery';

/**
 * These run against a real HTTP server on localhost rather than a mocked fetch.
 *
 * The whole point of this module is what happens at the wire: a 500 with a body,
 * a socket that never answers, a signature a receiver can actually recompute. A
 * mocked fetch would assert that we call fetch the way we call fetch.
 */

let server: Server | null = null;

async function serve(
  handler: (req: any, res: any, body: string) => void
): Promise<string> {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => handler(req, res, body));
  });

  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server!.address() as any;
  return `http://127.0.0.1:${port}/hook`;
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

describe('deliverWebhook', () => {
  it('reports the status code and body of a failure instead of just "it failed"', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('TypeError: cannot read property id of undefined');
    });

    const result = await deliverWebhook(url, 'secret', buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    // The reason this module exists: the merchant can read their own stack trace.
    expect(result.body).toContain('TypeError');
  });

  it('sends a signature the receiver can recompute', async () => {
    const secret = 'whsec_test';
    let verified: boolean | null = null;

    const url = await serve((req, res, body) => {
      const header = req.headers['x-voulti-signature'] as string;
      const parts = Object.fromEntries(header.split(',').map((kv: string) => kv.split('=')));
      const expected = createHmac('sha256', secret).update(`${parts.t}.${body}`).digest('hex');
      verified = expected === parts.v1;
      res.writeHead(200).end('ok');
    });

    const result = await deliverWebhook(url, secret, buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.ok).toBe(true);
    expect(verified).toBe(true);
    expect(result.signed).toBe(true);
  });

  it('signs over the exact bytes sent, so a re-serialised body fails verification', async () => {
    const secret = 'whsec_test';
    let matchesReserialised: boolean | null = null;

    const url = await serve((req, res, body) => {
      const header = req.headers['x-voulti-signature'] as string;
      const parts = Object.fromEntries(header.split(',').map((kv: string) => kv.split('=')));
      // The mistake every integrator makes: verify against JSON.stringify(req.body)
      // with keys reordered. It must not accidentally pass.
      const reordered = JSON.stringify({ zzz: 1, ...JSON.parse(body) });
      matchesReserialised =
        createHmac('sha256', secret).update(`${parts.t}.${reordered}`).digest('hex') === parts.v1;
      res.writeHead(200).end('ok');
    });

    await deliverWebhook(url, secret, buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(matchesReserialised).toBe(false);
  });

  it('marks a delivery unsigned when the commerce has no secret', async () => {
    let sawHeader: string | undefined = 'not-set';
    const url = await serve((req, res) => {
      sawHeader = req.headers['x-voulti-signature'] as string | undefined;
      res.writeHead(200).end('ok');
    });

    const result = await deliverWebhook(url, null, buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.signed).toBe(false);
    expect(sawHeader).toBeUndefined();
  });

  it('turns an unreachable endpoint into a result, not an exception', async () => {
    // Port 1 on loopback: nothing listens, connection is refused immediately.
    const result = await deliverWebhook('http://127.0.0.1:1/hook', 'secret', buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('gives up on a hanging endpoint and says so', async () => {
    const url = await serve(() => {
      /* never responds */
    });

    const result = await deliverWebhook(url, 'secret', buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toMatch(/aborted|answer within/i);
  }, 10_000);

  it('treats a 200 as delivered even when the body carries an error', async () => {
    // Not a bug: HTTP is the contract. Recording the body is what lets a
    // merchant discover they are swallowing their own failures.
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"error":"order not found"}');
    });

    const result = await deliverWebhook(url, 'secret', buildTestPayload('Paid', { amount_fiat: 10, fiat_currency: 'USD' }));

    expect(result.ok).toBe(true);
    expect(result.body).toContain('order not found');
  });
});

describe('test payloads', () => {
  it('marks test deliveries so a production handler can refuse them', async () => {
    let received: any = null;
    const url = await serve((_req, res, body) => {
      received = JSON.parse(body);
      res.writeHead(200).end('ok');
    });

    await deliverWebhook(url, 'secret', buildTestPayload('Paid', { amount_fiat: 1000, fiat_currency: 'COP' }));

    expect(received.test).toBe(true);
    expect(received.invoice_id).toBe(TEST_INVOICE_ID);
  });

  it('never marks a real delivery as test', () => {
    const payload = buildPayload({
      id: 'abc',
      amount_fiat: 50,
      fiat_currency: 'USD',
      status: 'Paid',
      paid_tx_hash: '0xdead',
    });

    // A missing `test` key is what tells a handler this is real money. If it
    // ever became `false`, handlers checking `'test' in payload` would break.
    expect('test' in payload).toBe(false);
  });

  it('omits payment fields on Expired, the shape that breaks naive handlers', () => {
    const expired = buildTestPayload('Expired', { amount_fiat: 10, fiat_currency: 'USD' });

    expect(expired.status).toBe('Expired');
    expect(expired.paid_tx_hash).toBeNull();
    expect(expired.paid_at).toBeNull();
  });

  it('includes payment fields on Refunded, which is a payment that came back', () => {
    const refunded = buildTestPayload('Refunded', { amount_fiat: 10, fiat_currency: 'USD' });

    expect(refunded.status).toBe('Refunded');
    expect(refunded.paid_tx_hash).toBeTruthy();
  });
});
