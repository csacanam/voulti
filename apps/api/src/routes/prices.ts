// src/routes/prices.ts
import { FastifyInstance } from 'fastify';
import { TokenPriceService } from '../business/tokenPrices';
import { FiatRateService } from '../business/fiatRates';

export async function pricesRoutes(app: FastifyInstance) {
  
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
