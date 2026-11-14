import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

/**
 * Two public routes that used to take the caller's word for money.
 *
 * - POST /blockchain/create wrote the payment amount from the request body, so
 *   a $1,000 invoice could be put on-chain for one base unit of USDC, paid, and
 *   earn the merchant a genuine signed Paid webhook.
 * - PUT /invoices/:id/payment-data marked any invoice Paid for any tx hash, and
 *   GET /invoices/:id — what merchants and agents poll — repeated it.
 *
 * Both now defer to the server's pricing and to the contract. These tests pin
 * that down from the attacker's side: send the lie, check it did not land.
 */

// ── stubs ─────────────────────────────────────────────────────────────────

let invoiceRow: any;
let updates: any[] = [];

function stubSupabase() {
  const chain = () => {
    const self: any = {
      select: () => self,
      update: (v: any) => { updates.push(v); return self; },
      eq: () => self,
      single: () => self,
      then: (res: any) => Promise.resolve({ data: invoiceRow, error: null }).then(res),
    };
    return self;
  };
  return { from: () => chain() };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../middleware/auth', () => ({ requireAuth: async () => {} }));
vi.mock('../utils/notify', () => ({ sendTelegramAlert: async () => true }));

const USDC_CELO = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';

vi.mock('../business/invoicePricing', () => ({
  priceInvoice: async () => ({
    ok: true,
    amountInUSD: 1000,
    usdToFiatRate: 1,
    tokens: [
      { symbol: 'USDC', network: 'Celo', contract_address: USDC_CELO, decimals: 6, amount_to_pay: '1000.07' },
      { symbol: 'USDC', network: 'Arbitrum', contract_address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, amount_to_pay: '1000.07' },
    ],
  }),
}));

let createdWith: any = null;
let chainStatus: any = { exists: true, status: 'pending' };

vi.mock('../blockchain/services/InvoiceServices', () => ({
  InvoiceService: class {
    async init() {}
    async createInvoice(params: any) {
      createdWith = params;
      return { success: true, transactionHash: '0xtx', invoiceId: params.invoiceId, blockNumber: 1 };
    }
    async getInvoiceStatus() { return chainStatus; }
  },
}));

// Fee lookup reaches for a provider; give it one that answers without a network.
vi.mock('../blockchain/utils/web3', () => ({ getProvider: () => ({}), getWallet: () => ({}) }));

async function call(method: 'POST' | 'PUT', url: string, payload: any) {
  const app = Fastify();
  if (url.startsWith('/blockchain')) {
    const { blockchainRoutes } = await import('./blockchain');
    await app.register(blockchainRoutes, { prefix: '/blockchain' });
  } else {
    const { invoicesRoutes } = await import('./invoices');
    await app.register(invoicesRoutes, { prefix: '/invoices' });
  }
  const res = await app.inject({ method, url, payload });
  await app.close();
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

beforeEach(() => {
  updates = [];
  createdWith = null;
  chainStatus = { exists: true, status: 'pending' };
});

// ── POST /blockchain/create ───────────────────────────────────────────────

describe('POST /blockchain/create', () => {
  beforeEach(() => {
    invoiceRow = {
      id: 'inv-1',
      status: 'Pending',
      selected_network: null,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      amount_fiat: 1000,
      fiat_currency: 'USD',
      commerce_id: 'c-1',
      commerces: { wallet: '0xmerchant', spread: 0 },
    };
  });

  it('charges the server price, not the amount in the body', async () => {
    const r = await call('POST', '/blockchain/create', {
      invoiceId: 'inv-1',
      chainId: 42220,
      paymentOptions: [{ token: USDC_CELO, amount: '0.000001', decimals: 6 }],
    });

    expect(r.status).toBe(200);
    expect(createdWith.paymentOptions).toEqual([{ token: USDC_CELO, amount: '1000.07', decimals: 6 }]);
  });

  it('ignores decimals in the body, which could shrink any amount to one base unit', async () => {
    await call('POST', '/blockchain/create', {
      invoiceId: 'inv-1',
      chainId: 42220,
      paymentOptions: [{ token: 'usdc', amount: '1000.07', decimals: 0 }],
    });

    expect(createdWith.paymentOptions[0].decimals).toBe(6);
  });

  it('uses the invoice expiry, not one from the body', async () => {
    await call('POST', '/blockchain/create', {
      invoiceId: 'inv-1',
      chainId: 42220,
      expiresAt: 4102444800, // 2100
      paymentOptions: [{ token: USDC_CELO }],
    });

    expect(createdWith.expiresAt).toBe(Math.floor(new Date(invoiceRow.expires_at).getTime() / 1000));
  });

  it('refuses a token this invoice cannot be paid with on that network', async () => {
    const r = await call('POST', '/blockchain/create', {
      invoiceId: 'inv-1',
      chainId: 42220,
      paymentOptions: [{ token: '0x000000000000000000000000000000000000dEaD', amount: '1' }],
    });

    expect(r.status).toBe(400);
    expect(createdWith).toBeNull();
  });
});

// ── PUT /invoices/:id/payment-data ────────────────────────────────────────

const PAYMENT = {
  paid_token: 'USDC',
  paid_network: 'Celo',
  paid_tx_hash: '0xmadeup',
  wallet_address: '0xpayer',
  paid_amount: 1000,
};

describe('PUT /invoices/:id/payment-data', () => {
  beforeEach(() => {
    invoiceRow = { id: 'inv-1', status: 'Pending', commerce_id: 'c-1', selected_network: 42220 };
  });

  it('does not mark an invoice paid that the contract says is unpaid', async () => {
    // The route waits out RPC lag before giving up; no need to wait here.
    vi.stubEnv('PAYMENT_VERIFY_RETRY_MS', '0');
    const r = await call('PUT', '/invoices/inv-1/payment-data', PAYMENT);
    vi.unstubAllEnvs();

    expect(r.status).toBe(409);
    expect(updates.some((u) => u.status === 'Paid')).toBe(false);
  });

  it('does not mark paid an invoice that exists on no network', async () => {
    invoiceRow.selected_network = null;
    chainStatus = { exists: false, status: 'not_found' };
    vi.stubEnv('PAYMENT_VERIFY_RETRY_MS', '0');
    const r = await call('PUT', '/invoices/inv-1/payment-data', PAYMENT);
    vi.unstubAllEnvs();

    expect(r.status).toBe(409);
    expect(updates).toEqual([]);
  });

  it('finds the network when create never recorded it, and records it', async () => {
    // Happened in production: the create request died after the on-chain
    // transaction and before saving selected_network. The payer paid anyway,
    // and the invoice sat Pending although the contract had it paid.
    invoiceRow.selected_network = null;
    chainStatus = { exists: true, status: 'paid', paidAmount: '0.500535' };
    const r = await call('PUT', '/invoices/inv-1/payment-data', PAYMENT);

    expect(r.status).toBe(200);
    const paid = updates.find((u) => u.status === 'Paid');
    expect(paid.selected_network).toBeTypeOf('number');
    expect(paid.blockchain_invoice_id).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('never rewrites an invoice that is already paid', async () => {
    invoiceRow.status = 'Paid';
    chainStatus = { exists: true, status: 'paid', paidAmount: '1000.07' };
    const r = await call('PUT', '/invoices/inv-1/payment-data', { ...PAYMENT, paid_tx_hash: '0xother' });

    expect(r.status).toBe(409);
    expect(updates).toEqual([]);
  });

  it('records the amount the contract saw, not the one in the body', async () => {
    chainStatus = { exists: true, status: 'paid', paidAmount: '1000.07' };
    const r = await call('PUT', '/invoices/inv-1/payment-data', { ...PAYMENT, paid_amount: 999999 });

    expect(r.status).toBe(200);
    const paid = updates.find((u) => u.status === 'Paid');
    expect(paid.paid_amount).toBe(1000.07);
  });
});
