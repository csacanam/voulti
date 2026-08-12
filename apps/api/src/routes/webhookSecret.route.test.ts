import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

/**
 * A commerce with no signing secret is not a configuration problem, it is an
 * outage that looks like silence: deliverWebhook omits X-Voulti-Signature
 * entirely when the secret is null, so the merchant receives real payment
 * notifications unsigned — and one who verifies the signature, which is what we
 * tell every integrator to do, rejects all eight attempts and never learns they
 * were paid.
 *
 * It happened because a migration backfilled every commerce that existed on
 * 2026-07-12 and nothing kept the invariant afterwards. The first test here is
 * the one that matters: it fails if anyone removes the secret from the insert
 * again.
 */

const OWNER = '0xowner';
let inserted: any = null;
let updated: any = null;
let existingSecret: string | null = null;

function stubSupabase() {
  const chain = (table: string) => {
    // The duplicate check in POST /commerces looks a commerce up by wallet with
    // .ilike(); everything else here looks one up by id with .eq(). Answering
    // both the same way makes creation believe the commerce already exists and
    // return before it ever reaches the insert — which is the line under test.
    let byWallet = false;
    const self: any = {
      select: () => self,
      insert: (v: any) => { inserted = v; return self; },
      update: (v: any) => { updated = v; return self; },
      eq: () => self,
      ilike: () => { byWallet = true; return self; },
      order: () => self,
      limit: () => self,
      single: () => self,
      then: (res: any) => Promise.resolve(resolve()).then(res),
    };
    const resolve = () => {
      if (byWallet) return { data: null, error: null };
      if (inserted) return { data: { id: 'c-1', ...inserted }, error: null };
      if (table === 'commerces') {
        return { data: { id: 'c-1', wallet: OWNER, webhook_secret: existingSecret }, error: null };
      }
      return { data: [], error: null };
    };
    return self;
  };
  return { from: (t: string) => chain(t) };
}

let authWallet = OWNER;

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../middleware/auth', () => ({
  requireAuth: async (req: any) => { req.walletAddress = authWallet; req.userEmail = 'a@b.co'; },
}));
vi.mock('../business/commerceNetworks', () => ({
  getCommerceNetworkStatus: async () => [],
  enableCommerceOnNetwork: async () => '0x',
  disableCommerceOnNetwork: async () => '0x',
}));
vi.mock('../utils/notify', () => ({ sendTelegramAlert: async () => true }));

async function call(method: 'POST', url: string, payload?: any) {
  const { commercesRoutes } = await import('./commerces');
  const app = Fastify();
  await app.register(commercesRoutes, { prefix: '/commerces' });
  const res = await app.inject({ method, url, payload: payload ?? {} });
  await app.close();
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

const HEX_64 = /^[0-9a-f]{64}$/;

describe('a new commerce signs from the moment it exists', () => {
  beforeEach(() => { inserted = null; updated = null; existingSecret = null; authWallet = OWNER; });

  it('writes a webhook_secret on creation', async () => {
    // The regression this file exists for. Without it a commerce created today
    // receives every real payment webhook unsigned, forever.
    await call('POST', '/commerces', { name: 'ReFi', currency: 'COP' });
    expect(inserted?.webhook_secret, 'commerce created without a signing secret').toMatch(HEX_64);
  });

  it('matches the shape the SQL backfill produced', async () => {
    // encode(gen_random_bytes(32), 'hex') — old and new must be
    // indistinguishable to anything that consumes them.
    await call('POST', '/commerces', { name: 'ReFi', currency: 'COP' });
    expect(inserted.webhook_secret).toHaveLength(64);
  });

  it('does not reuse the same secret across commerces', async () => {
    await call('POST', '/commerces', { name: 'One', currency: 'COP' });
    const first = inserted.webhook_secret;
    inserted = null;
    await call('POST', '/commerces', { name: 'Two', currency: 'COP' });
    expect(inserted.webhook_secret).not.toBe(first);
  });
});

describe('POST /commerces/:id/webhook-secret', () => {
  beforeEach(() => { inserted = null; updated = null; existingSecret = null; authWallet = OWNER; });

  it('issues one for a commerce that has none, and says it did not rotate', async () => {
    const r = await call('POST', '/commerces/c-1/webhook-secret');
    expect(r.status).toBe(200);
    expect(r.body.data.webhook_secret).toMatch(HEX_64);
    // `rotated: false` is what lets the dashboard stay quiet instead of warning
    // about breaking an integration that does not exist yet.
    expect(r.body.data.rotated).toBe(false);
    expect(updated.webhook_secret).toBe(r.body.data.webhook_secret);
  });

  it('replaces an existing one and flags it as a rotation', async () => {
    existingSecret = 'a'.repeat(64);
    const r = await call('POST', '/commerces/c-1/webhook-secret');
    expect(r.status).toBe(200);
    expect(r.body.data.rotated).toBe(true);
    expect(r.body.data.webhook_secret).not.toBe(existingSecret);
  });

  it('refuses a wallet that does not own the commerce', async () => {
    authWallet = '0xsomeoneelse';
    const r = await call('POST', '/commerces/c-1/webhook-secret');
    expect(r.status).toBe(403);
    expect(updated).toBeNull();
  });
});
