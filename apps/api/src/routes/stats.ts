import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function statsRoutes(app: FastifyInstance) {

  app.get('/', async (req, res) => {
    try {
      // Get all paid invoices with fee data
      const { data: invoices } = await supabase
        .from('invoices')
        .select('paid_token, paid_network, fee_amount')
        .eq('status', 'Paid')
        .gt('fee_amount', 0);

      // Get token rates from DB
      const { data: tokenRates } = await supabase
        .from('tokens')
        .select('symbol, rate_to_usd')
        .eq('is_enabled', true);

      const rates: Record<string, number> = {};
      for (const t of tokenRates || []) {
        rates[t.symbol] = t.rate_to_usd || 0;
      }

      // Aggregate fees by token+network
      const byNetwork: { network: string; symbol: string; feeBalance: string; feeUsd: string }[] = [];
      let totalFeeUsd = 0;

      const agg = new Map<string, { network: string; symbol: string; total: number }>();

      for (const inv of invoices || []) {
        if (!inv.paid_token || !inv.fee_amount) continue;
        const key = `${inv.paid_network}:${inv.paid_token}`;
        const existing = agg.get(key);
        if (existing) {
          existing.total += Number(inv.fee_amount);
        } else {
          agg.set(key, { network: inv.paid_network || '', symbol: inv.paid_token, total: Number(inv.fee_amount) });
        }
      }

      for (const [, entry] of agg) {
        const rate = rates[entry.symbol] || 0;
        const usd = entry.total * rate;
        totalFeeUsd += usd;
        byNetwork.push({
          network: entry.network,
          symbol: entry.symbol,
          feeBalance: entry.total.toFixed(6),
          feeUsd: usd.toFixed(6),
        });
      }

      return res.send({
        revenue: {
          totalUsd: totalFeeUsd < 0.01 ? totalFeeUsd.toFixed(6) : totalFeeUsd.toFixed(2),
          byNetwork,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to fetch stats' });
    }
  });
}
