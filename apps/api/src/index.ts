import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import { invoicesRoutes } from './routes/invoices';
import { blockchainRoutes } from './routes/blockchain';
import { commercesRoutes } from './routes/commerces';
import { pricesRoutes } from './routes/prices';
import { ordersRoutes } from './routes/orders';
import { notificationsRoutes } from './routes/notifications';
import { payoutsRoutes } from './routes/payouts';
import { depositRoutes } from './routes/deposit';
import { sweepService } from './blockchain/services/SweepService';
import cors from '@fastify/cors';

async function main() {
  const app = Fastify();

  await app.register(cors, {
    origin: true, // or an array like ['https://yourdomain.com']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Ping endpoint
  app.get('/ping', async (request, reply) => {
    return { 
      pong: true, 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
  });
  
  app.register(invoicesRoutes, { prefix: '/api/invoices' });
  app.register(blockchainRoutes, { prefix: '/api/blockchain' });
  app.register(commercesRoutes, { prefix: '/api/commerces' });
  app.register(pricesRoutes, { prefix: '/api/prices' });
  app.register(ordersRoutes, { prefix: '/api/orders' });
  app.register(notificationsRoutes, { prefix: '/api/notifications' });
  app.register(payoutsRoutes, { prefix: '/api/payouts' });
  app.register(depositRoutes, { prefix: '/api/deposit' });

  const port = Number(process.env.PORT || 3000);
  // Use 0.0.0.0 only if port is 8080 (typical for DigitalOcean), otherwise 127.0.0.1
  const host = port === 8080 ? '0.0.0.0' : '127.0.0.1';

  app.listen({ port, host }, async (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server running at ${address}`);
    sweepService.start();
  });

  // Graceful shutdown
  const shutdown = () => {
    sweepService.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

}

main();
