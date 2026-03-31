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
import { statsRoutes } from './routes/stats';
import { cronRoutes } from './routes/cron';
import { sweepService } from './blockchain/services/SweepService';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

async function main() {
  const app = Fastify();

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true; // allow all in dev if not set

  await app.register(cors, {
    origin: allowedOrigins,
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
  
  app.register(invoicesRoutes, { prefix: '/invoices' });
  app.register(blockchainRoutes, { prefix: '/blockchain' });
  app.register(commercesRoutes, { prefix: '/commerces' });
  app.register(pricesRoutes, { prefix: '/prices' });
  app.register(ordersRoutes, { prefix: '/orders' });
  app.register(notificationsRoutes, { prefix: '/notifications' });
  app.register(payoutsRoutes, { prefix: '/payouts' });
  app.register(depositRoutes, { prefix: '/deposit' });
  app.register(statsRoutes, { prefix: '/stats' });
  app.register(cronRoutes, { prefix: '/cron' });

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
