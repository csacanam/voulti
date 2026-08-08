import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';
import { NETWORKS } from '../blockchain/config/networks';
import { getProvider } from '../blockchain/utils/web3';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const STORAGE_ABI = ['function getServiceFeeBalance(address) view returns (uint256)'];
const ACCESS_ABI = [
  'function getDefaultAdminRole() view returns (bytes32)',
  'function getTreasuryManagerRole() view returns (bytes32)',
  'function hasRole(bytes32,address) view returns (bool)',
];

/** Production networks only — `hardhat` is a local chain and its rows are dev noise. */
const prodNetworks = () =>
  Object.entries(CONTRACTS).filter(([name]) => name !== 'hardhat');

/**
 * What the protocol can actually claim, read from the contract rather than
 * summed from the database.
 *
 * The two agree today, but only one of them is what `withdrawServiceFeesToTreasury`
 * will transfer — and a withdrawal button must never be driven by an estimate.
 */
async function readOnChainFees() {
  const rows: { network: string; symbol: string; balance: string; tokenAddress: string }[] = [];

  await Promise.all(
    prodNetworks().map(async ([network, contracts]) => {
      if (!contracts.DERAMP_STORAGE) return;
      const tokens = TOKENS[network];
      if (!tokens) return;

      try {
        const storage = new ethers.Contract(
          contracts.DERAMP_STORAGE,
          STORAGE_ABI,
          getProvider(network)
        );

        for (const token of Object.values(tokens)) {
          const raw: bigint = await storage.getServiceFeeBalance(token.address);
          if (raw === 0n) continue;
          rows.push({
            network,
            symbol: token.symbol,
            balance: ethers.formatUnits(raw, token.decimals),
            tokenAddress: token.address,
          });
        }
      } catch (err: any) {
        console.error(`[stats] fee read failed on ${network}:`, err.message);
      }
    })
  );

  return rows;
}

/** Ask the contract who may withdraw, instead of keeping a second list here. */
async function canWithdraw(wallet: string, network: string): Promise<boolean> {
  const contracts = CONTRACTS[network];
  if (!contracts?.ACCESS_MANAGER) return false;

  const am = new ethers.Contract(contracts.ACCESS_MANAGER, ACCESS_ABI, getProvider(network));
  const [adminRole, treasuryRole] = await Promise.all([
    am.getDefaultAdminRole(),
    am.getTreasuryManagerRole(),
  ]);
  const [isAdmin, isTreasury] = await Promise.all([
    am.hasRole(adminRole, wallet),
    am.hasRole(treasuryRole, wallet),
  ]);
  return Boolean(isAdmin || isTreasury);
}

export async function statsRoutes(app: FastifyInstance) {

  app.get('/', async (req, res) => {
    try {
      // `amount_usd` is not a column — GET /invoices computes it per request.
      // Volume is derived below from paid_amount, which is stored.
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('paid_token, paid_network, fee_amount, paid_amount, paid_at')
        .eq('status', 'Paid');

      // Reporting zero payments because the query failed would be a confident
      // wrong answer, and this feeds a page someone withdraws money from.
      if (invoicesError) {
        return res.status(500).send({ error: `Could not read payments: ${invoicesError.message}` });
      }

      const { data: tokenRates } = await supabase
        .from('tokens')
        .select('symbol, rate_to_usd')
        .eq('is_enabled', true);

      const rates: Record<string, number> = {};
      for (const t of tokenRates || []) rates[t.symbol] = t.rate_to_usd || 0;

      const [feeRows, commerceCount] = await Promise.all([
        readOnChainFees(),
        supabase.from('commerces').select('id', { count: 'exact', head: true }),
      ]);

      let claimableUsd = 0;
      const claimable = feeRows.map(r => {
        const usd = Number(r.balance) * (rates[r.symbol] || 0);
        claimableUsd += usd;
        return { ...r, usd: usd.toFixed(6) };
      });

      // Lifetime totals come from the database, which is the only place that
      // remembers fees already withdrawn. Network names are lower-cased first:
      // rows were written as both `celo` and `Celo`, and counting them apart
      // split one network into two.
      const paid = invoices || [];
      const lifetime = new Map<string, number>();
      let volumeUsd = 0;

      for (const inv of paid) {
        const network = (inv.paid_network || '').toLowerCase();
        if (network === 'hardhat') continue;

        // Settled crypto valued at today's rate — an approximation of volume,
        // not what the payer was quoted at the time.
        volumeUsd += Number(inv.paid_amount || 0) * (rates[inv.paid_token] || 0);

        if (!inv.paid_token || !inv.fee_amount) continue;
        const key = `${network}:${inv.paid_token}`;
        lifetime.set(key, (lifetime.get(key) || 0) + Number(inv.fee_amount));
      }

      let lifetimeUsd = 0;
      const earned = [...lifetime.entries()].map(([key, total]) => {
        const [network, symbol] = key.split(':');
        const usd = total * (rates[symbol] || 0);
        lifetimeUsd += usd;
        return { network, symbol, amount: total.toFixed(6), usd: usd.toFixed(6) };
      });

      return res.send({
        payments: {
          count: paid.length,
          volumeUsd: volumeUsd.toFixed(2),
          commerces: commerceCount.count ?? 0,
        },
        revenue: {
          // Already collected, across the protocol's whole life.
          earnedUsd: lifetimeUsd.toFixed(lifetimeUsd < 0.01 ? 6 : 2),
          earned,
          // Sitting in the contracts right now, withdrawable.
          claimableUsd: claimableUsd.toFixed(claimableUsd < 0.01 ? 6 : 2),
          claimable,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to fetch stats' });
    }
  });

  /**
   * Who is allowed to withdraw protocol revenue, according to the contract.
   * Public so the stats view can show it without the caller being that wallet.
   */
  app.get('/treasury', async (req, res) => {
    try {
      const operator = process.env.BACKEND_PRIVATE_KEY
        ? new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY).address
        : null;

      // Optional: ask about a specific wallet, so the stats page knows whether
      // to offer the withdraw action to whoever just connected. Only decides
      // what the UI shows — the contract is what actually allows or refuses.
      const { address } = req.query as { address?: string };
      const caller = address && ethers.isAddress(address) ? ethers.getAddress(address) : null;

      const holders = await Promise.all(
        prodNetworks().map(async ([network, contracts]) => ({
          network,
          operator,
          operatorCanWithdraw: operator ? await canWithdraw(operator, network).catch(() => false) : false,
          callerCanWithdraw: caller ? await canWithdraw(caller, network).catch(() => false) : false,
          proxy: contracts.DERAMP_PROXY || null,
        }))
      );

      return res.send({ success: true, data: holders });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to read treasury roles' });
    }
  });

}
