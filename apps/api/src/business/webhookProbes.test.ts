import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServer, Server } from 'http';
import { runConformanceProbes, summarise } from './webhookProbes';

/**
 * These run against real receivers — a correct one, a gullible one, a broken
 * one — because the whole value of the probes is telling those apart.
 *
 * A conformance check that hands out false passes is worse than no check: it
 * converts "we never looked" into "we looked and it was fine", which is the
 * sentence someone quotes after an incident.
 */

vi.mock('./webhookLog', async () => {
  // Probes go through deliverAndLog in production so every one is recorded.
  // Here the database is not the subject; the receiver's behaviour is.
  const real = await vi.importActual<typeof import('./webhookDelivery')>('./webhookDelivery');
  return {
    deliverAndLog: (url: string, secret: any, payload: any, _ctx: any, opts: any) =>
      real.deliverWebhook(url, secret, payload, opts),
  };
});

const SECRET = 'whsec_conformance';
let server: Server | null = null;

/** A receiver that verifies properly: signature, freshness, timing-safe. */
function strictHandler(req: any, res: any, body: string) {
  const header = req.headers['x-voulti-signature'] as string | undefined;
  if (!header) return res.writeHead(401).end('missing signature');

  const parts = Object.fromEntries(header.split(',').map((kv: string) => kv.split('=')));
  if (!parts.t || !parts.v1) return res.writeHead(401).end('malformed');

  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) {
    return res.writeHead(401).end('stale timestamp');
  }

  const expected = createHmac('sha256', SECRET).update(`${parts.t}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parts.v1, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.writeHead(401).end('bad signature');
  }

  res.writeHead(200).end('{"received":true}');
}

async function serve(handler: (req: any, res: any, body: string) => void): Promise<string> {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => handler(req, res, body));
  });
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  const { port } = server!.address() as any;
  return `http://127.0.0.1:${port}/hook`;
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((r) => server!.close(() => r()));
    server = null;
  }
});

const verdictOf = (results: any[], id: string) => results.find((r) => r.id === id)?.verdict;

describe('against a receiver that verifies correctly', () => {
  it('passes every check', async () => {
    const url = await serve(strictHandler);
    const results = await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(verdictOf(results, 'accepts-valid')).toBe('pass');
    expect(verdictOf(results, 'rejects-tampered')).toBe('pass');
    expect(verdictOf(results, 'rejects-replay')).toBe('pass');
    expect(verdictOf(results, 'rejects-unsigned')).toBe('pass');
    expect(summarise(results).ok).toBe(true);
  });
});

describe('against a receiver that verifies nothing', () => {
  it('fails every rejection check, and says what an attacker could do', async () => {
    // The handler most people ship first: 200 to anything that arrives.
    const url = await serve((_req, res) => res.writeHead(200).end('ok'));
    const results = await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(verdictOf(results, 'accepts-valid')).toBe('pass');
    expect(verdictOf(results, 'rejects-tampered')).toBe('fail');
    expect(verdictOf(results, 'rejects-replay')).toBe('fail');
    expect(verdictOf(results, 'rejects-unsigned')).toBe('fail');
    expect(summarise(results).ok).toBe(false);

    const advice = results.find((r) => r.id === 'rejects-tampered')!.advice!;
    expect(advice).toMatch(/anyone who learns this URL/i);
  });
});

describe('against a receiver that checks the signature but not its age', () => {
  it('isolates the replay weakness and passes the rest', async () => {
    // Very common: the HMAC compare is right, the freshness check is missing.
    const url = await serve((req, res, body) => {
      const header = req.headers['x-voulti-signature'] as string | undefined;
      if (!header) return res.writeHead(401).end('missing');
      const parts = Object.fromEntries(header.split(',').map((kv: string) => kv.split('=')));
      const expected = createHmac('sha256', SECRET).update(`${parts.t}.${body}`).digest('hex');
      if (expected !== parts.v1) return res.writeHead(401).end('bad');
      res.writeHead(200).end('ok');
    });

    const results = await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(verdictOf(results, 'rejects-tampered')).toBe('pass');
    expect(verdictOf(results, 'rejects-unsigned')).toBe('pass');
    expect(verdictOf(results, 'rejects-replay')).toBe('fail');
  });
});

describe('against a receiver that is simply down', () => {
  it('reports inconclusive rather than crediting it for refusing everything', async () => {
    // The dangerous false pass: an endpoint returning 500 to everything
    // "rejects" all three probes. Reading that as a security clearance would
    // be exactly backwards.
    const url = await serve((_req, res) => res.writeHead(500).end('boom'));
    const results = await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(verdictOf(results, 'accepts-valid')).toBe('fail');
    expect(verdictOf(results, 'rejects-tampered')).toBe('inconclusive');
    expect(verdictOf(results, 'rejects-replay')).toBe('inconclusive');
    expect(verdictOf(results, 'rejects-unsigned')).toBe('inconclusive');
  });

  it('never counts an inconclusive as a pass', async () => {
    const url = await serve((_req, res) => res.writeHead(500).end('boom'));
    const results = await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(summarise(results).passed).toBe(0);
  });
});

describe('when the commerce has no signing secret', () => {
  it('says so instead of testing a signature that does not exist', async () => {
    const url = await serve((_req, res) => res.writeHead(200).end('ok'));
    const results = await runConformanceProbes({ url, secret: null, commerceId: 'c1' });

    expect(verdictOf(results, 'has-secret')).toBe('fail');
    // Probing rejection is meaningless when nothing is signed in the first place.
    expect(verdictOf(results, 'rejects-tampered')).toBeUndefined();
  });
});

describe('what the probes send', () => {
  it('never announces real money: every payload is marked test', async () => {
    const seen: any[] = [];
    const url = await serve((_req, res, body) => {
      seen.push(JSON.parse(body));
      res.writeHead(200).end('ok');
    });

    await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    expect(seen.length).toBe(4);
    // A handler that wrongly accepts one has still been told, in the payload,
    // that nothing was paid.
    for (const payload of seen) {
      expect(payload.test).toBe(true);
      expect(payload.invoice_id).toBe('00000000-0000-0000-0000-000000000000');
    }
  });

  it('sends a tampered signature of the right shape, not obvious garbage', async () => {
    // A receiver could pass by rejecting anything unparseable while still never
    // comparing the HMAC — so a forgery has to be well-formed to prove
    // anything. An earlier version of this test read the *first* header it saw,
    // which is the control's valid one, and therefore passed while the probe
    // sent literal garbage.
    const headers: (string | undefined)[] = [];
    const url = await serve((req, res) => {
      headers.push(req.headers['x-voulti-signature'] as string | undefined);
      res.writeHead(200).end('ok');
    });

    await runConformanceProbes({ url, secret: SECRET, commerceId: 'c1' });

    const [valid, tampered, stale, unsigned] = headers;
    const WELL_FORMED = /^t=\d+,v1=[0-9a-f]{64}$/;

    expect(valid).toMatch(WELL_FORMED);
    expect(tampered, 'the forgery must look real enough to require a real check').toMatch(WELL_FORMED);
    expect(tampered).not.toBe(valid);
    expect(stale).toMatch(WELL_FORMED);
    expect(unsigned, 'the unsigned probe must send no header at all').toBeUndefined();
  });
});
