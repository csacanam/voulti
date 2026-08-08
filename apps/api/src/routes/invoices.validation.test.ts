import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

/**
 * Covers every rejection path of POST /invoices.
 *
 * These are the guards that stop a merchant from shipping goods against a
 * mispriced or dead-on-arrival invoice, and each one exists because the
 * absence of it caused a real problem: an amount of -1000 was accepted, a
 * non-numeric one surfaced as an opaque 500, a past expiry produced a link
 * that never worked, and a missing currency used to be silently inferred from
 * the merchant's display setting.
 *
 * No network: the invalid paths all return before any chain or rate lookup.
 */

const COMMERCE = {
  id: 'c-1',
  name: 'Test',
  wallet: '0xabc',
  minAmount: null,
  maxAmount: null,
  currency: 'COP',
  confirmation_url: null,
  confirmation_email: null,
};

const RATES: Record<string, number> = { USD: 1, COP: 4000, EUR: 0.9 };

/** Minimal PostgREST-shaped stub: only the chains these routes actually use. */
function stubSupabase() {
  const chain = (table: string) => {
    const state: any = { table, filters: {} };
    const self: any = {
      select: () => self,
      insert: (v: any) => { state.inserted = v; return self; },
      update: () => self,
      eq: (col: string, val: any) => { state.filters[col] = val; return self; },
      order: () => self,
      limit: () => self,
      or: () => self,
      single: () => self,
      then: (res: any) => Promise.resolve(resolve()).then(res),
    };
    const resolve = () => {
      if (state.inserted) {
        return { data: { id: 'inv-1', ...state.inserted }, error: null };
      }
      if (table === 'commerces') return { data: COMMERCE, error: null };
      if (table === 'fiat_exchange_rates') {
        const code = state.filters.currency_code;
        if (code === undefined) {
          return { data: Object.keys(RATES).map(c => ({ currency_code: c })), error: null };
        }
        return RATES[code] !== undefined
          ? { data: { currency_code: code, usd_to_currency_rate: RATES[code] }, error: null }
          : { data: null, error: { message: 'not found' } };
      }
      return { data: null, error: null };
    };
    return self;
  };
  return { from: (t: string) => chain(t) };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../middleware/auth', () => ({ requireAuth: async () => {} }));
// Reached only by requests that pass validation; irrelevant to these cases.
vi.mock('../business/commerceNetworks', () => ({
  getCommerceNetworkStatus: async () => [
    { network: 'celo', active: true, tokens: [{ symbol: 'USDC', whitelisted: true }] },
  ],
}));

async function buildApp() {
  const { invoicesRoutes } = await import('./invoices');
  const app = Fastify();
  await app.register(invoicesRoutes, { prefix: '/invoices' });
  return app;
}

const post = async (payload: any) => {
  const app = await buildApp();
  const res = await app.inject({ method: 'POST', url: '/invoices', payload });
  await app.close();
  return { status: res.statusCode, body: JSON.parse(res.body) };
};

const VALID = { commerce_id: 'c-1', amount_fiat: 1000, currency: 'COP' };

describe('POST /invoices — amount_fiat', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a negative amount', async () => {
    // Was accepted: the guard was `!amount_fiat`, and -1000 is truthy.
    const r = await post({ ...VALID, amount_fiat: -1000 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/positive number/);
  });

  it('rejects zero', async () => {
    const r = await post({ ...VALID, amount_fiat: 0 });
    expect(r.status).toBe(400);
  });

  it('rejects a numeric string instead of failing at the insert', async () => {
    // Used to reach the database and come back as an opaque 500.
    const r = await post({ ...VALID, amount_fiat: '1000' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/positive number/);
  });

  it('reports a missing amount as missing, not as invalid', async () => {
    const r = await post({ commerce_id: 'c-1', currency: 'COP' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Missing required fields/);
  });
});

describe('POST /invoices — currency', () => {
  it('requires it rather than inheriting the commerce currency', async () => {
    const r = await post({ commerce_id: 'c-1', amount_fiat: 1000 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/currency is required/);
  });

  it('treats an empty string as missing', async () => {
    const r = await post({ ...VALID, currency: '' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/currency is required/);
  });

  it('rejects an unsupported currency and lists the valid ones', async () => {
    const r = await post({ ...VALID, currency: 'JPY' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Unsupported currency/);
    expect(r.body.error).toMatch(/USD/);
  });

  it('accepts it lowercase and normalises to upper', async () => {
    const r = await post({ ...VALID, currency: 'eur' });
    expect(r.status).toBe(201);
    expect(r.body.data.fiat_currency).toBe('EUR');
  });

  it('accepts fiat_currency as an alias, the name used in every response', async () => {
    const r = await post({ commerce_id: 'c-1', amount_fiat: 1000, fiat_currency: 'USD' });
    expect(r.status).toBe(201);
    expect(r.body.data.fiat_currency).toBe('USD');
  });

  it('lets one commerce price in a currency that is not its own', async () => {
    // COMMERCE.currency is COP; the point of the change is that this works.
    const r = await post({ ...VALID, currency: 'USD' });
    expect(r.status).toBe(201);
    expect(r.body.data.fiat_currency).toBe('USD');
  });
});

describe('POST /invoices — expires_at', () => {
  it('rejects a date already in the past', async () => {
    // Used to create an invoice that was dead before the payer opened it.
    const r = await post({ ...VALID, expires_at: '2020-01-01T00:00:00Z' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/must be in the future/);
  });

  it('rejects an unparseable date', async () => {
    const r = await post({ ...VALID, expires_at: 'not-a-date' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/ISO 8601/);
  });

  it('accepts a future date', async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const r = await post({ ...VALID, expires_at: future });
    expect(r.status).toBe(201);
  });
});

describe('POST /invoices — reference', () => {
  it('rejects one longer than 200 characters', async () => {
    const r = await post({ ...VALID, reference: 'x'.repeat(201) });
    expect(r.status).toBe(400);
  });
});
