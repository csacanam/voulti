import { FastifyInstance } from 'fastify';
import { ethers } from 'ethers';
import { NETWORKS } from '../blockchain/config/networks';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';

const STORAGE_ABI = [
  'function serviceFeeBalances(address token) view returns (uint256)',
];

export async function statsRoutes(app: FastifyInstance) {

  // Public stats endpoint — no auth required
  app.get('/', async (req, res) => {
    try {
      const fees: {
        network: string;
        chainId: number;
        token: string;
        symbol: string;
        decimals: number;
        feeBalance: string;
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
                fees.push({
                  network: networkName,
                  chainId: networkConfig.chainId,
                  token: tokenInfo.address,
                  symbol: tokenInfo.symbol,
                  decimals: tokenInfo.decimals,
                  feeBalance: formatted,
                });

                // Rough USD estimate (stablecoins ~= $1)
                totalFeeUsd += balance;
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
