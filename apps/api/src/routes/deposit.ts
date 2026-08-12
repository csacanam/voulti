// src/routes/deposit.ts
import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { HDWalletService } from '../blockchain/services/HDWalletService';
import { NETWORKS, type NetworkName, getNetworkByChainId } from '../blockchain/config/networks';
import { getNetworkGasHealth, getAllNetworkGasHealth } from '../business/networkGasHealth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function depositRoutes(app: FastifyInstance) {

  // Generate a deposit address for an invoice
  app.post('/generate', async (req, res) => {
    try {
      const { invoiceId, chainId, tokenAddress, tokenSymbol, tokenDecimals, expectedAmount } = req.body as {
        invoiceId: string;
        chainId: number;
        tokenAddress: string;
        tokenSymbol: string;
        tokenDecimals: number;
        expectedAmount: string;
      };

      if (!invoiceId || !chainId || !tokenAddress || !tokenSymbol || !expectedAmount) {
        return res.status(400).send({ error: 'Missing required fields' });
      }

      // Validate invoice exists and is Pending
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, status, expires_at')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        return res.status(404).send({ error: 'Invoice not found' });
      }

      if (invoice.status !== 'Pending') {
        return res.status(400).send({ error: `Invoice is ${invoice.status}, cannot generate deposit address` });
      }

      // Resolve network name from chainId
      let network: NetworkName;
      try {
        network = getNetworkByChainId(chainId);
      } catch {
        return res.status(400).send({ error: `Unsupported chain ID: ${chainId}` });
      }

      // Refuse before the payer is committed. Filtering the network out of the
      // checkout list is not enough on its own: a tab opened before the hot
      // wallet ran low, or any direct call, reaches this endpoint with a
      // network the list would no longer offer. This is the point where the
      // payer is about to be handed an address and send real money to it, so
      // it is the only place the check actually protects anyone.
      const gasHealth = await getNetworkGasHealth(network);
      if (!gasHealth.depositEnabled) {
        return res.status(503).send({
          error: 'This network is temporarily unavailable for deposits. Please choose another one.',
          code: 'NETWORK_GAS_DEPLETED',
          network,
        });
      }

      // Generate deposit address
      const deposit = await HDWalletService.generateDepositAddress(
        invoiceId,
        network,
        { address: tokenAddress, symbol: tokenSymbol, decimals: tokenDecimals },
        expectedAmount
      );

      // Update invoice payment_method
      await supabase
        .from('invoices')
        .update({ payment_method: 'address' })
        .eq('id', invoiceId);

      return res.send({
        success: true,
        data: {
          address: deposit.address,
          network: deposit.network,
          chainId: deposit.chain_id,
          tokenSymbol: deposit.token_symbol,
          tokenAddress: deposit.token_address,
          expectedAmount: deposit.expected_amount,
          expiresAt: invoice.expires_at,
          status: deposit.status,
        },
      });
    } catch (error: any) {
      console.error('Generate deposit address error:', error);
      return res.status(500).send({ error: error.message || 'Failed to generate deposit address' });
    }
  });

  // Which networks can currently accept a pay-by-address deposit.
  // Read by the checkout to grey out networks the sweeper could not fund.
  app.get('/networks', async (_req, res) => {
    try {
      const health = await getAllNetworkGasHealth();

      return res.send({
        success: true,
        data: health.map(h => ({
          network: h.network,
          chainId: h.chainId,
          depositEnabled: h.depositEnabled,
        })),
      });
    } catch (error: any) {
      console.error('Network gas health error:', error);

      // Fail open: the checkout falls back to its configured list rather than
      // showing a payer no networks at all because one query failed.
      return res.status(500).send({ error: error.message || 'Failed to read network availability' });
    }
  });

  // Get deposit status for an invoice
  app.get('/status/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params as { invoiceId: string };

      const { data: deposits, error } = await supabase
        .from('deposit_addresses')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).send({ error: 'Failed to fetch deposit status' });
      }

      // Also check invoice status
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoiceId)
        .single();

      return res.send({
        success: true,
        data: {
          invoiceStatus: invoice?.status || 'Unknown',
          deposits: deposits || [],
        },
      });
    } catch (error: any) {
      console.error('Get deposit status error:', error);
      return res.status(500).send({ error: error.message || 'Failed to get deposit status' });
    }
  });
}
