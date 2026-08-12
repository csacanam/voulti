import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

/**
 * PUT /commerces/:id/return-domains is the entire security model for
 * return_url. Everything else only reads the list this route writes, so the
 * two things worth proving here are that it refuses anyone who is not the
 * owner, and that what it stores is normalised rather than whatever was typed.
 */

const OWNER = '0xowner';
let stored: string[] | null = null;

const COMMERCE = { wallet: OWNER };

function stubSupabase() {
  const chain = () => {
    const self: any = {
      select: () => self,
      update: (v: any) => { stored = v.return_url_domains; return self; },
      eq: () => self,
      single: () => self,
      then: (res: any) => Promise.resolve({ data: COMMERCE, error: null }).then(res),
    };
    return self;
  };
  return { from: () => chain() };
}

let authWallet = OWNER;

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../middleware/auth', () => ({
  requireAuth: async (req: any) => { req.walletAddress = authWallet; },
}));
vi.mock('../business/commerceNetworks', () => ({
  getCommerceNetworkStatus: async () => [],
  enableCommerceOnNetwork: async () => '0x',
  disableCommerceOnNetwork: async () => '0x',
}));
vi.mock('../utils/notify', () => ({ sendTelegramAlert: async () => true }));

async function put(body: any) {
  const { commercesRoutes } = await import('./commerces');
  const app = Fastify();
  await app.register(commercesRoutes, { prefix: '/commerces' });
  const res = await app.inject({ method: 'PUT', url: '/commerces/c-1/return-domains', payload: body });
  await app.close();
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

describe('PUT /commerces/:id/return-domains', () => {
  beforeEach(() => { stored = null; authWallet = OWNER; });

  it('refuses a wallet that does not own the commerce', async () => {
    // The one check that makes the allowlist mean anything: an attacker who
    // knows the public commerce_id must not be able to widen it.
    authWallet = '0xsomeoneelse';
    const r = await put({ domains: ['evil.com'] });
    expect(r.status).toBe(403);
    expect(stored).toBeNull();
  });

  it('stores a normalised host, not what was typed', async () => {
    // Keeping "https://peewah.co/gracias" verbatim would produce a list that
    // never matches, which reads as "return_url is broken".
    const r = await put({ domains: ['https://peewah.co/gracias'] });
    expect(r.status).toBe(200);
    expect(stored).toEqual(['peewah.co']);
  });

  it('deduplicates entries that normalise to the same host', async () => {
    const r = await put({ domains: ['peewah.co', 'https://peewah.co', 'PEEWAH.CO'] });
    expect(r.status).toBe(200);
    expect(stored).toEqual(['peewah.co']);
  });

  it('rejects a single label that would open a whole TLD', async () => {
    const r = await put({ domains: ['com'] });
    expect(r.status).toBe(400);
    expect(stored).toBeNull();
  });

  it('rejects a non-array body', async () => {
    for (const body of [{}, { domains: 'peewah.co' }, { domains: null }]) {
      const r = await put(body);
      expect(r.status).toBe(400);
    }
  });

  it('clears the list to null rather than an empty array', async () => {
    // Both refuse every return_url, but null is what an untouched commerce
    // looks like — keeping the two spellings apart avoids a "configured but
    // empty" state that reads as a bug.
    const r = await put({ domains: [] });
    expect(r.status).toBe(200);
    expect(stored).toBeNull();
  });

  it('caps the list length', async () => {
    const r = await put({ domains: Array.from({ length: 21 }, (_, i) => `d${i}.com`) });
    expect(r.status).toBe(400);
    expect(stored).toBeNull();
  });
});
