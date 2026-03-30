// src/routes/orders.ts
import { FastifyInstance } from 'fastify';
import { ExpireOrdersService } from '../business/expireOrders';

export async function ordersRoutes(app: FastifyInstance) {
  
  // Endpoint for external worker - expire pending orders
  app.post('/expire-orders', async (req, res) => {
    try {
      const expireService = new ExpireOrdersService();
      await expireService.expirePendingOrders();
      
      return res.send({
        success: true,
        message: 'Pending orders expiration completed successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error expiring orders:', error);
      return res.status(500).send({
        error: error.message || 'Failed to expire orders',
        timestamp: new Date().toISOString()
      });
    }
  });
}
