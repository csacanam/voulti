import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The sweep decision tree — which deposit gets settled, refunded, expired or
 * left alone. Every branch here decides what happens to money that a payer
 * already sent, so a wrong turn is not a rendering bug.
 *
 * Each case encodes something that went wrong in production on 2026-08-07:
 * a full deposit that could not be swept stayed stuck forever, a late payment
 * landed at an address nothing looked at again, and a refund on an already
 * settled invoice rewrote it to Expired — telling a merchant a completed sale
 * had failed.
 */

const writes: { table: string; payload: any }[] = [];
const alerts: string[] = [];
let deposits: any[] = [];
let invoice: any = {};
let balances: Record<string, bigint> = {};

function stubSupabase() {
  const chain = (table: string) => {
    const state: any = { table, single: false, statuses: null };
    const self: any = {
      select: () => self,
      in: (_c: string, v: any) => { state.statuses = v; return self; },
      eq: () => self,
      lt: () => self,
      order: () => self,
      limit: () => self,
      or: () => self,
      single: () => { state.single = true; return self; },
      update: (p: any) => { writes.push({ table, payload: p }); return self; },
      then: (res: any) => Promise.resolve(resolve()).then(res),
    };
    const resolve = () => {
      if (table === 'invoices') return { data: invoice, error: null };
      if (table === 'deposit_addresses') {
        // the wrong-network sweep asks for a different status set; keep it empty
        if (state.statuses && state.statuses.length === 2) return { data: [], error: null };
        return { data: state.single ? deposits[0] : deposits, error: null };
      }
      return { data: null, error: null };
    };
    return self;
  };
  return { from: (t: string) => chain(t) };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../../utils/notify', () => ({
  sendTelegramAlert: async (key: string) => { alerts.push(key); return true; },
}));

// A provider that answers balanceOf from `balances` and nothing else, so no
// test can accidentally depend on a live chain.
vi.mock('../utils/web3', () => ({
  getProvider: () => ({ getBalance: async () => 0n }),
  getWallet: () => ({ address: '0xhot' }),
}));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  class FakeContract {
    target: string;
    constructor(address: string) { this.target = address; }
    async balanceOf(addr: string) { return balances[addr.toLowerCase()] ?? 0n; }
  }
  return {
    ...actual,
    ethers: { ...actual.ethers, Contract: FakeContract as any },
  };
});

const HD = '0xdeadbeef00000000000000000000000000000001';

const baseDeposit = {
  id: 'dep-1',
  invoice_id: 'inv-1',
  network: 'celo',
  chain_id: 42220,
  address: HD,
  derivation_index: 1,
  token_address: '0xtoken',
  token_symbol: 'USDT',
  token_decimals: 6,
  expected_amount: '1.0',
  detected_amount: null,
  status: 'awaiting',
  sweep_retries: 0,
  sweep_error: null,
  pay_invoice_tx_hash: null,
  gas_tx_hash: null,
  approve_tx_hash: null,
  refund_tx_hash: null,
  created_at: new Date().toISOString(),
};

const past = () => new Date(Date.now() - 3600_000).toISOString();
const future = () => new Date(Date.now() + 3600_000).toISOString();

async function runCycle(dep: any, inv: any, bal: bigint = 0n) {
  writes.length = 0;
  alerts.length = 0;
  deposits = [dep];
  invoice = inv;
  balances = { [HD.toLowerCase()]: bal };
  const { sweepService } = await import('./SweepService');
  await (sweepService as any).pollCycle();
  return { writes: [...writes], alerts: [...alerts] };
}

const statusWrites = (w: typeof writes) =>
  w.filter(x => x.table === 'deposit_addresses' && x.payload.status).map(x => x.payload.status);

beforeEach(() => vi.clearAllMocks());

describe('expired invoices', () => {
  it('marks an expired deposit with no funds as expired, without refunding', async () => {
    const r = await runCycle({ ...baseDeposit, status: 'detected' }, { status: 'Pending', expires_at: past() }, 0n);
    expect(statusWrites(r.writes)).toEqual(['expired']);
    expect(r.alerts).toEqual([]);
  });

  it('does not rewrite a deposit already marked expired', async () => {
    const r = await runCycle({ ...baseDeposit, status: 'expired' }, { status: 'Pending', expires_at: past() }, 0n);
    expect(r.writes).toEqual([]);
  });

  it('reconsiders a deposit that already gave up on sweeping', async () => {
    // `failed` used to drop out of the poll entirely, stranding the money.
    const r = await runCycle(
      { ...baseDeposit, status: 'failed', sweep_retries: 5 },
      { status: 'Pending', expires_at: past() },
      0n
    );
    expect(statusWrites(r.writes)).toEqual(['expired']);
  });

  it('stops watching once the late-arrival window has closed', async () => {
    // `detected`, not `expired`: with the window bound removed this deposit
    // would be written to `expired`, so the assertion can actually tell the
    // two behaviours apart. Starting from `expired` made it vacuous.
    const longAgo = new Date(Date.now() - 25 * 3600_000).toISOString();
    const r = await runCycle({ ...baseDeposit, status: 'detected' }, { status: 'Pending', expires_at: longAgo }, 0n);
    expect(r.writes).toEqual([]);
  });
});

describe('still-valid invoices', () => {
  it('leaves a deposit alone once its retries are spent', async () => {
    // Waits for an operator or for expiry; must not spin on-chain forever.
    const r = await runCycle(
      { ...baseDeposit, status: 'failed', sweep_retries: 5 },
      { status: 'Pending', expires_at: future() },
      0n
    );
    expect(r.writes).toEqual([]);
  });

  it('does nothing while no funds have arrived', async () => {
    const r = await runCycle({ ...baseDeposit, status: 'awaiting' }, { status: 'Pending', expires_at: future() }, 0n);
    expect(r.writes).toEqual([]);
  });
});

describe('already-settled invoices', () => {
  it('never rewrites the invoice when cleaning up a settled deposit', async () => {
    const r = await runCycle({ ...baseDeposit, status: 'sweeping' }, { status: 'Paid', expires_at: past() }, 0n);
    expect(r.writes.filter(w => w.table === 'invoices')).toEqual([]);
  });

  it('records a deposit that settled but never finished bookkeeping as swept', async () => {
    // Recording it as expired would deny a payment that demonstrably happened.
    const r = await runCycle(
      { ...baseDeposit, status: 'sweeping', pay_invoice_tx_hash: '0xabc' },
      { status: 'Paid', expires_at: past() },
      0n
    );
    expect(statusWrites(r.writes)).toEqual(['swept']);
  });

  it('does not re-scan a deposit it already gave up identifying a payer for', async () => {
    const r = await runCycle(
      { ...baseDeposit, status: 'failed', sweep_retries: 5 },
      { status: 'Paid', expires_at: past() },
      0n
    );
    expect(r.writes).toEqual([]);
  });
});
