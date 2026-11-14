import { describe, it, expect, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import { requireAdminSecret, requireCronSecret } from './workerSecret';

async function hit(guard: any, headers: Record<string, string> = {}) {
  const app = Fastify();
  app.post('/job', { preHandler: guard }, async () => ({ ran: true }));
  const res = await app.inject({ method: 'POST', url: '/job', headers });
  await app.close();
  return res.statusCode;
}

afterEach(() => vi.unstubAllEnvs());

describe('requireCronSecret', () => {
  it('lets the scheduler through until CRON_SECRET is set, so deploying does not stop the jobs', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(await hit(requireCronSecret)).toBe(200);
  });

  it('refuses a call without the header once it is set', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret');
    expect(await hit(requireCronSecret)).toBe(401);
    expect(await hit(requireCronSecret, { 'x-cron-secret': 'wrong!' })).toBe(401);
    expect(await hit(requireCronSecret, { 'x-cron-secret': 's3cret' })).toBe(200);
  });
});

describe('requireAdminSecret', () => {
  it('fails closed without ADMIN_SECRET', async () => {
    vi.stubEnv('ADMIN_SECRET', '');
    expect(await hit(requireAdminSecret, { 'x-admin-secret': '' })).toBe(501);
  });

  it('needs the exact secret', async () => {
    vi.stubEnv('ADMIN_SECRET', 'adm1n');
    expect(await hit(requireAdminSecret)).toBe(401);
    expect(await hit(requireAdminSecret, { 'x-admin-secret': 'adm1n' })).toBe(200);
  });
});
