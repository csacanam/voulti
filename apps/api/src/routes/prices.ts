// src/routes/prices.ts
import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { TokenPriceService } from '../business/tokenPrices';
import { FiatRateService } from '../business/fiatRates';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function pricesRoutes(app: FastifyInstance) {

  // Get fiat rates and token rates (public, for frontend)
  app.get('/rates', async (req, res) => {
    try {
      const { data: fiatRates } = await supabase
        .from('fiat_exchange_rates')
        .select('currency_code, usd_to_currency_rate');

      const { data: tokenRates } = await supabase
        .from('tokens')
        .select('symbol, rate_to_usd')
        .eq('is_enabled', true);

      return res.send({
        fiat: Object.fromEntries((fiatRates || []).map((r: any) => [r.currency_code, r.usd_to_currency_rate])),
        tokens: Object.fromEntries((tokenRates || []).map((t: any) => [t.symbol, t.rate_to_usd])),
      });
    } catch (error: any) {
      return res.status(500).send({ error: 'Failed to fetch rates' });
    }
  });

  // Endpoint for external worker - update token prices
  app.post('/update-token-prices', async (req, res) => {
    try {
      const tokenService = new TokenPriceService();
      await tokenService.updateAllTokenPrices();
      
      return res.send({
        success: true,
        message: 'Token prices updated successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error updating token prices:', error);
      return res.status(500).send({
        error: error.message || 'Failed to update token prices',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Endpoint for external worker - update fiat rates
  app.post('/update-fiat-rates', async (req, res) => {
    try {
      const fiatService = new FiatRateService();
      await fiatService.updateAllFiatRates();
      
      return res.send({
        success: true,
        message: 'Fiat rates updated successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error updating fiat rates:', error);
      return res.status(500).send({
        error: error.message || 'Failed to update fiat rates',
        timestamp: new Date().toISOString()
      });
    }
  });
}
