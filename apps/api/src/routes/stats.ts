import { FastifyInstance } from 'fastify';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { NETWORKS } from '../blockchain/config/networks';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const STORAGE_ABI = [
  'function serviceFeeBalances(address token) view returns (uint256)',
];

export async function statsRoutes(app: FastifyInstance) {

  app.get('/', async (req, res) => {
    try {
      // Get token rates from DB
      const { data: tokenRates } = await supabase
        .from('tokens')
        .select('symbol, rate_to_usd')
        .eq('is_enabled', true);

      const rates: Record<string, number> = {};
      for (const t of tokenRates || []) {
        rates[t.symbol] = t.rate_to_usd || 0;
      }

      const fees: {
        network: string;
        chainId: number;
        symbol: string;
        feeBalance: string;
        feeUsd: string;
      }[] = [];

      let totalFeeUsd = 0;

      const promises = Object.entries(CONTRACTS).map(async ([networkName, contracts]) => {
        if (!contracts.DERAMP_STORAGE || networkName === 'hardhat') return;

        const networkTokens = TOKENS[networkName];
        if (!networkTokens) return;

        const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
        if (!networkConfig) return;

        try {
          const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
            name: networkConfig.name,
            chainId: networkConfig.chainId,
          });

          const storage = new ethers.Contract(contracts.DERAMP_STORAGE, STORAGE_ABI, provider);

          for (const [, tokenInfo] of Object.entries(networkTokens)) {
            try {
              const raw = await storage.serviceFeeBalances(tokenInfo.address);
              const formatted = ethers.formatUnits(raw, tokenInfo.decimals);
              const balance = parseFloat(formatted);

              if (balance > 0) {
                const tokenRate = rates[tokenInfo.symbol] || 0;
                const usdValue = balance * tokenRate;

                fees.push({
                  network: networkName,
                  chainId: networkConfig.chainId,
                  symbol: tokenInfo.symbol,
                  feeBalance: formatted,
                  feeUsd: usdValue.toFixed(6),
                });

                totalFeeUsd += usdValue;
              }
            } catch {
              // skip token
            }
          }
        } catch {
          // skip network
        }
      });

      await Promise.all(promises);

      return res.send({
        revenue: {
          totalUsd: totalFeeUsd.toFixed(2),
          byNetwork: fees,
        },
        networks: Object.entries(CONTRACTS)
          .filter(([name, c]) => c.DERAMP_PROXY && name !== 'hardhat')
          .map(([name]) => name),
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to fetch stats' });
    }
  });
}
