import { timingSafeEqual } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

function matches(provided: unknown, expected: string): boolean {
  const given = Buffer.from(typeof provided === 'string' ? provided : '');
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

let warned = false;

/**
 * For the job endpoints an external scheduler hits every minute or hour
 * (prices, expiry, email and webhook queues). They were open to anyone, so
 * anyone could make us burn CoinGecko/OpenExchangeRates quota, RPC calls and
 * outbound webhook traffic on demand.
 *
 * Enforced only once CRON_SECRET is set, because the scheduler sends no header
 * today and a hard requirement would stop every job on deploy. To turn it on:
 * add `X-Cron-Secret: <value>` to each scheduled job, then set CRON_SECRET.
 */
export async function requireCronSecret(req: FastifyRequest, res: FastifyReply) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    if (!warned) {
      console.warn('[security] CRON_SECRET is not set — job endpoints accept unauthenticated calls');
      warned = true;
    }
    return;
  }
  if (!matches(req.headers['x-cron-secret'], expected)) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
}

/**
 * Same header and secret as /admin. Fails closed: with no ADMIN_SECRET the
 * route is off (501, never 503 — App Platform swallows a 503 from the app).
 */
export async function requireAdminSecret(req: FastifyRequest, res: FastifyReply) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(501).send({ error: 'ADMIN_SECRET not configured — admin routes disabled' });
  }
  if (!matches(req.headers['x-admin-secret'], expected)) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
}
