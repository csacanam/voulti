// src/business/networkGasHealth.ts
//
// Decides whether the hot wallet can still afford to take a pay-by-address
// deposit on a given network.
//
// The failure this prevents: a payer picks a network, gets a derived address,
// sends real money to it, and only then does the sweep discover the hot wallet
// has no native token left to fund gas with. The tokens sit at an address the
// payer cannot spend from, and the only signal anyone gets is a Telegram alert
// after five failed retries. Refusing the deposit up front costs one donation;
// accepting it costs someone else's money.

import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { NETWORKS, type NetworkName } from '../blockchain/config/networks';
import { getProvider } from '../blockchain/utils/web3';
import { reservePerSweep } from '../blockchain/config/gas';
import { LATE_DEPOSIT_WINDOW_MS } from '../blockchain/services/SweepService';
import { sendTelegramAlert } from '../utils/notify';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

/** Below this many further sweeps of headroom, stop handing out addresses. */
const DISABLE_BELOW_SWEEPS = Number(process.env.GAS_GATE_DISABLE_BELOW || 10);

/** Below this many, still accept deposits but start asking for a top-up. */
const WARN_BELOW_SWEEPS = Number(process.env.GAS_GATE_WARN_BELOW || 50);

/**
 * Every status SweepService still polls. All of them can still need gas — an
 * expired deposit is refunded, which is a transfer the hot wallet funds too.
 */
const LIVE_STATUSES = ['awaiting', 'partial', 'detected', 'sweeping', 'failed', 'expired'];

/** Health is read on every checkout page load; the RPCs are rate-limited. */
const CACHE_TTL_MS = Number(process.env.GAS_GATE_CACHE_MS || 60_000);

/** Floor on repeat alerts for a network that stays unhealthy. */
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export type GasHealthLevel = 'ok' | 'low' | 'depleted' | 'unknown';

export interface NetworkGasHealth {
  network: string;
  chainId: number;
  /** Whether /deposit/generate should hand out an address on this network. */
  depositEnabled: boolean;
  level: GasHealthLevel;
  /** Deposits already in flight whose gas is spoken for. */
  committed: number;
  /** Further deposits the remaining balance can carry. */
  headroom: number;
  balance: string;
  symbol: string;
  /**
   * Set when the balance could not be read, which is NOT the same as the
   * network being out of gas — see the fail-open note in getNetworkGasHealth.
   */
  readError?: string;
}

const cache = new Map<string, { at: number; value: NetworkGasHealth }>();
const lastAlert = new Map<string, { level: GasHealthLevel; at: number }>();

function hotWalletAddress(): string | null {
  const key = process.env.BACKEND_PRIVATE_KEY;
  if (!key) return null;
  try {
    return new ethers.Wallet(key).address;
  } catch {
    return null;
  }
}

/**
 * Deposits per network that SweepService will still act on, and whose gas is
 * therefore already committed.
 *
 * Bounded by the same rule the sweeper uses — the invoice expired less than
 * LATE_DEPOSIT_WINDOW_MS ago — rather than by row status alone. Counting every
 * historical `failed` row instead would make `committed` grow without limit
 * and leave a network disabled forever on the strength of deposits nothing
 * will ever touch again.
 */
async function countCommittedDeposits(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const { data: deposits, error } = await supabase
    .from('deposit_addresses')
    .select('network, invoice_id')
    .in('status', LIVE_STATUSES);

  if (error || !deposits || deposits.length === 0) return counts;

  const invoiceIds = [...new Set(deposits.map((d: any) => d.invoice_id))];
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, expires_at')
    .in('id', invoiceIds);

  const cutoff = Date.now() - LATE_DEPOSIT_WINDOW_MS;
  const stillWatched = new Set(
    (invoices || [])
      .filter((inv: any) => {
        // No expiry recorded means nothing has ruled it out yet — count it.
        if (!inv.expires_at) return true;
        return new Date(inv.expires_at).getTime() > cutoff;
      })
      .map((inv: any) => inv.id)
  );

  for (const d of deposits as any[]) {
    if (!stillWatched.has(d.invoice_id)) continue;
    counts[d.network] = (counts[d.network] || 0) + 1;
  }

  return counts;
}

async function alertOnce(network: string, level: GasHealthLevel, health: NetworkGasHealth): Promise<void> {
  const previous = lastAlert.get(network);
  const repeatingTooSoon =
    previous?.level === level && Date.now() - previous.at < ALERT_COOLDOWN_MS;
  if (repeatingTooSoon) return;

  lastAlert.set(network, { level, at: Date.now() });

  const heading =
    level === 'depleted'
      ? `🛑 <b>${network}: pay-by-address deshabilitado</b>`
      : level === 'low'
        ? `⚠️ <b>${network}: gas bajo</b>`
        : `ℹ️ <b>${network}: no se pudo leer el saldo de gas</b>`;

  const body = health.readError
    ? [`<b>Error:</b> <code>${health.readError.slice(0, 300)}</code>`, '', 'La red sigue habilitada — un RPC caído no es una red sin gas.']
    : [
        `<b>Saldo:</b> ${health.balance} ${health.symbol}`,
        `<b>Depósitos en vuelo:</b> ${health.committed}`,
        `<b>Margen restante:</b> ${health.headroom} depósitos`,
        '',
        level === 'depleted'
          ? 'No se entregarán más direcciones en esta red hasta recargar.'
          : 'Recarga antes de que se agote.',
      ];

  await sendTelegramAlert(`gas_${level}_${network}`, [heading, '', ...body].join('\n'));
}

/**
 * Gas health for one network.
 *
 * Fails open on purpose. A public RPC answering 429 tells us nothing about the
 * hot wallet's balance, and the same distinction is already load-bearing in
 * getCommerceNetworkStatus, where treating an unreadable network as inactive
 * made the dashboard report healthy commerces as broken. The two mistakes are
 * not symmetric: closing a healthy network turns donations away silently,
 * while leaving a truly empty one open produces a failed sweep, which already
 * retries and already alerts.
 */
export async function getNetworkGasHealth(
  network: NetworkName | string,
  committedOverride?: number
): Promise<NetworkGasHealth> {
  const config = NETWORKS[network as NetworkName];
  const symbol = config?.nativeCurrency?.symbol || '';
  const base: NetworkGasHealth = {
    network: String(network),
    chainId: config?.chainId || 0,
    depositEnabled: true,
    level: 'unknown',
    committed: 0,
    headroom: 0,
    balance: '0',
    symbol,
  };

  if (!config) {
    return { ...base, depositEnabled: false, level: 'unknown', readError: 'Unknown network' };
  }

  const hot = hotWalletAddress();
  if (!hot) {
    // Nothing can sweep without the key, so this is a real "no", not a read
    // failure — handing out an address here guarantees stuck funds.
    return { ...base, depositEnabled: false, level: 'depleted', readError: 'BACKEND_PRIVATE_KEY not configured' };
  }

  const cached = cache.get(String(network));
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  let health: NetworkGasHealth;

  try {
    const provider = getProvider(String(network));
    const [balance, feeData] = await Promise.all([
      provider.getBalance(hot),
      provider.getFeeData(),
    ]);

    // Priced the way ensureGas prices it: at maxFeePerGas, because that is what
    // the node reserves. Pricing at gasPrice reports roughly twice the headroom
    // that actually exists.
    const pricePerGas =
      feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    const reserve = reservePerSweep(pricePerGas);

    const committed =
      committedOverride ?? (await countCommittedDeposits())[String(network)] ?? 0;

    const spokenFor = reserve * BigInt(committed);
    const available = balance > spokenFor ? balance - spokenFor : 0n;
    const headroom = reserve > 0n ? Number(available / reserve) : 0;

    const level: GasHealthLevel =
      headroom < DISABLE_BELOW_SWEEPS ? 'depleted' : headroom < WARN_BELOW_SWEEPS ? 'low' : 'ok';

    health = {
      ...base,
      depositEnabled: level !== 'depleted',
      level,
      committed,
      headroom,
      balance: Number(ethers.formatEther(balance)).toFixed(6),
      symbol,
    };
  } catch (err: any) {
    health = { ...base, depositEnabled: true, level: 'unknown', readError: err.message || 'balance read failed' };
  }

  cache.set(String(network), { at: Date.now(), value: health });

  if (health.level !== 'ok') {
    // Never let a failed alert be what closes a network, or breaks a checkout.
    alertOnce(String(network), health.level, health).catch(() => {});
  }

  return health;
}

/**
 * Gas health for every production network, for the checkout's network list.
 * Counts committed deposits once instead of once per network.
 */
export async function getAllNetworkGasHealth(): Promise<NetworkGasHealth[]> {
  const names = Object.keys(NETWORKS).filter(n => n !== 'hardhat');

  let committed: Record<string, number> = {};
  try {
    committed = await countCommittedDeposits();
  } catch (err: any) {
    // An unreadable commitment count must not close every network at once.
    console.warn('[networkGasHealth] Could not count committed deposits:', err.message);
  }

  const results = await Promise.all(
    names.map(n => getNetworkGasHealth(n, committed[n] ?? 0))
  );

  const order = ['celo', 'arbitrum', 'polygon', 'base', 'bsc'];
  return results.sort((a, b) => order.indexOf(a.network) - order.indexOf(b.network));
}

/** Drops cached health, so a top-up shows up without waiting out the TTL. */
export function clearGasHealthCache(network?: string): void {
  if (network) cache.delete(network);
  else cache.clear();
}
