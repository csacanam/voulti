import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * What the poll cycle is allowed to ask the database for.
 *
 * The decision tree is covered next door in SweepService.decisions.test.ts;
 * this file is about the rows that never reach it. Every deposit address ever
 * created used to stay in the poll set for good: past the late-arrival window
 * the loop could only skip it, but it skipped it after reading its invoice —
 * one query per dead row, every fifteen seconds, forever. A campaign with a
 * few thousand unpaid attempts left that cost behind permanently, and the
 * cycle is sequential, so it also stretched detection for everyone else.
 *
 * The stub below therefore models the filter rather than ignoring it: it
 * applies the `or(...)` the service sends, so a test can tell the difference
 * between "the row came back and was skipped" and "the row never came back".
 */

let world: { deposit: any; invoice: any }[] = [];
let balances: Record<string, bigint> = {};
const invoiceReads: string[] = [];
const depositWrites: { id: string; payload: any }[] = [];
let crossNetworkScans = 0;

/**
 * The three PostgREST operators the poll query actually uses. Anything else
 * throws rather than silently passing, so a future filter cannot be waved
 * through by a stub that quietly ignores it.
 */
function matchesOr(filter: string, invoice: any): boolean {
  return filter.split(',').some(clause => {
    const [column, op, ...rest] = clause.split('.');
    const value = rest.join('.');
    const actual = invoice?.[column];

    if (op === 'is') {
      if (value !== 'null') throw new Error(`stub does not model is.${value}`);
      return actual === null || actual === undefined;
    }
    if (op === 'eq') return String(actual) === value;
    if (op === 'gt') {
      return actual != null && new Date(actual).getTime() > new Date(value).getTime();
    }
    throw new Error(`stub does not model operator "${op}"`);
  });
}

function stubSupabase() {
  const chain = (table: string) => {
    const state: any = { statuses: null, or: null, single: false, id: null };

    const self: any = {
      select: () => self,
      in: (_c: string, v: any) => { state.statuses = v; return self; },
      eq: (c: string, v: any) => { if (c === 'id') state.id = v; return self; },
      lt: () => self,
      order: () => self,
      limit: () => self,
      or: (filter: string, opts?: any) => { state.or = { filter, opts }; return self; },
      single: () => { state.single = true; return self; },
      update: (payload: any) => { state.update = payload; return self; },
      then: (res: any) => Promise.resolve(resolve()).then(res),
    };

    const resolve = () => {
      if (table === 'invoices') {
        if (state.update) return { data: null, error: null };
        invoiceReads.push(state.id);
        return { data: world.find(r => r.deposit.invoice_id === state.id)?.invoice, error: null };
      }

      if (table === 'deposit_addresses') {
        if (state.update) {
          depositWrites.push({ id: state.id, payload: state.update });
          return { data: null, error: null };
        }

        // The wrong-network scan asks for exactly these two statuses.
        if (state.statuses?.length === 2) {
          crossNetworkScans += 1;
          return { data: [], error: null };
        }

        const rows = world
          .filter(r => state.statuses?.includes(r.deposit.status))
          .filter(r => !state.or || matchesOr(state.or.filter, r.invoice))
          .map(r => r.deposit);

        return { data: state.single ? rows[0] : rows, error: null };
      }

      return { data: null, error: null };
    };

    return self;
  };

  return { from: (t: string) => chain(t) };
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => stubSupabase() }));
vi.mock('../../utils/notify', () => ({ sendTelegramAlert: async () => true }));
vi.mock('../utils/web3', () => ({
  getProvider: () => ({ getBalance: async () => 0n }),
  getWallet: () => ({ address: '0xhot' }),
}));
vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  class FakeContract {
    constructor(public target: string) {}
    async balanceOf(addr: string) { return balances[addr.toLowerCase()] ?? 0n; }
  }
  return { ...actual, ethers: { ...actual.ethers, Contract: FakeContract as any } };
});

const HD = '0xdeadbeef00000000000000000000000000000002';
const HOURS = 3_600_000;

const deposit = (over: Partial<any> = {}) => ({
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
  status: 'detected',
  sweep_retries: 0,
  sweep_error: null,
  pay_invoice_tx_hash: null,
  gas_tx_hash: null,
  approve_tx_hash: null,
  refund_tx_hash: null,
  created_at: new Date().toISOString(),
  ...over,
});

const agoHours = (h: number) => new Date(Date.now() - h * HOURS).toISOString();

async function runCycle() {
  const { SweepService } = await import('./SweepService');
  const service: any = new SweepService();
  await service.pollCycle();
  return service;
}

beforeEach(() => {
  world = [];
  balances = { [HD.toLowerCase()]: 0n };
  invoiceReads.length = 0;
  depositWrites.length = 0;
  crossNetworkScans = 0;
  vi.clearAllMocks();
});

describe('rows that have left the late-arrival window', () => {
  it('never reaches the poll again — not even to be read and skipped', async () => {
    // 25h past expiry: one hour outside LATE_DEPOSIT_WINDOW_MS.
    world = [{ deposit: deposit({ status: 'expired' }), invoice: { status: 'Pending', expires_at: agoHours(25) } }];

    await runCycle();

    expect(invoiceReads).toEqual([]);
    expect(depositWrites).toEqual([]);
  });

  it('stays out however long the service runs', async () => {
    world = [{ deposit: deposit({ status: 'failed', sweep_retries: 5 }), invoice: { status: 'Pending', expires_at: agoHours(24 * 30) } }];

    await runCycle();
    await runCycle();
    await runCycle();

    expect(invoiceReads).toEqual([]);
  });

  it('is the filter doing the work, not an empty poll set', async () => {
    // Identical row, one hour *inside* the window: proves the assertions above
    // distinguish "filtered out" from "nothing to do".
    world = [{ deposit: deposit(), invoice: { status: 'Pending', expires_at: agoHours(23) } }];

    await runCycle();

    expect(invoiceReads).toEqual(['inv-1']);
    expect(depositWrites.map(w => w.payload.status)).toEqual(['expired']);
  });
});

describe('rows the filter must not touch', () => {
  it('keeps watching a deposit whose invoice has not expired', async () => {
    world = [{ deposit: deposit({ status: 'awaiting' }), invoice: { status: 'Pending', expires_at: new Date(Date.now() + HOURS).toISOString() } }];

    await runCycle();

    expect(invoiceReads).toEqual(['inv-1']);
  });

  it('keeps a deposit whose invoice records no expiry', async () => {
    // Nothing has ruled it out, so nothing may drop it — the same reading
    // networkGasHealth uses when it counts committed deposits.
    world = [{ deposit: deposit({ status: 'awaiting' }), invoice: { status: 'Pending', expires_at: null } }];

    await runCycle();

    expect(invoiceReads).toEqual(['inv-1']);
  });

  it('keeps a settled invoice in range however old it is, so orphaned tokens still come back', async () => {
    // A `Paid` invoice is handled before expiry is ever considered. Filtering
    // it out on age would strand tokens that arrived at the deposit address
    // after the payer settled from a wallet.
    world = [{ deposit: deposit({ status: 'sweeping' }), invoice: { status: 'Paid', expires_at: agoHours(24 * 30) } }];

    await runCycle();

    expect(invoiceReads).toEqual(['inv-1']);
    expect(depositWrites.map(w => w.payload.status)).toEqual(['expired']);
  });
});

describe('wrong-network scan cadence', () => {
  afterEach(() => vi.useRealTimers());

  it('runs on the first cycle after a boot', async () => {
    world = [{ deposit: deposit({ status: 'awaiting' }), invoice: { status: 'Pending', expires_at: null } }];

    await runCycle();

    expect(crossNetworkScans).toBe(1);
  });

  it('does not repeat it on every poll cycle', async () => {
    world = [{ deposit: deposit({ status: 'awaiting' }), invoice: { status: 'Pending', expires_at: null } }];

    const { SweepService } = await import('./SweepService');
    const service: any = new SweepService();
    await service.pollCycle();
    await service.pollCycle();
    await service.pollCycle();

    expect(crossNetworkScans).toBe(1);
  });

  it('runs again once the interval has passed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
    world = [{ deposit: deposit({ status: 'awaiting' }), invoice: { status: 'Pending', expires_at: null } }];

    const { SweepService } = await import('./SweepService');
    const service: any = new SweepService();
    await service.pollCycle();
    vi.setSystemTime(new Date('2026-09-15T12:00:14.000Z')); // one poll interval later
    await service.pollCycle();
    expect(crossNetworkScans).toBe(1);

    vi.setSystemTime(new Date('2026-09-15T12:01:01.000Z')); // past the scan interval
    await service.pollCycle();
    expect(crossNetworkScans).toBe(2);
  });
});
