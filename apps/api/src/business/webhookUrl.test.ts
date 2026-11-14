import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, Server } from 'http';

// Every name resolves to loopback, the way a rebinding attacker's DNS would
// answer at delivery time. Mocked rather than relying on public DNS: tests may
// not reach the network.
vi.mock('dns', async (importOriginal) => {
  const real = await importOriginal<typeof import('dns')>();
  const lookup = (_host: string, opts: any, cb: any) => {
    if (typeof opts === 'function') cb = opts;
    const answer = [{ address: '127.0.0.1', family: 4 }];
    opts?.all ? cb(null, answer) : cb(null, '127.0.0.1', 4);
  };
  return { ...real, lookup, default: { ...real, lookup } };
});

import { deliverWebhook, buildTestPayload } from './webhookDelivery';
import {
  BLOCKED_TARGET_MESSAGE,
  checkWebhookUrlStatic,
  isBlockedAddress,
  validateWebhookUrlForSave,
} from './webhookUrl';

const payload = buildTestPayload('Paid', { amount_fiat: 1, fiat_currency: 'USD' });

let server: Server | null = null;
let hits = 0;

async function receiver(): Promise<number> {
  hits = 0;
  server = createServer((_req, res) => {
    hits++;
    res.writeHead(200).end('internal data');
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return (server!.address() as any).port;
}

afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
});

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1',
    '64:ff9b::a9fe:a9fe', '[::1]', 'not-an-ip',
  ])('blocks %s', (addr) => {
    expect(isBlockedAddress(addr)).toBe(true);
  });

  it.each(['8.8.8.8', '172.86.112.201', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111'])(
    'allows public %s',
    (addr) => {
      expect(isBlockedAddress(addr)).toBe(false);
    }
  );
});

describe('checkWebhookUrlStatic', () => {
  it.each([
    'http://127.0.0.1:8080/hook',
    'http://169.254.169.254/metadata/v1/',
    'https://[::1]/hook',
    'http://localhost:3000/hook',
    'http://api.localhost/hook',
    'http://2130706433/hook', // 127.0.0.1 as one integer; URL normalises it
    'http://0x7f.1/hook',
  ])('refuses %s', (url) => {
    expect(checkWebhookUrlStatic(url)).toBe(BLOCKED_TARGET_MESSAGE);
  });

  it('refuses other schemes and embedded credentials', () => {
    expect(checkWebhookUrlStatic('file:///etc/passwd')).toMatch(/https/);
    expect(checkWebhookUrlStatic('gopher://example.com')).toMatch(/https/);
    expect(checkWebhookUrlStatic('https://user:pw@example.com/hook')).toMatch(/credentials/);
    expect(checkWebhookUrlStatic('not a url')).toMatch(/valid URL/);
  });
});

describe('validateWebhookUrlForSave', () => {
  it('requires https for new URLs', async () => {
    expect(await validateWebhookUrlForSave('http://8.8.8.8/hook')).toMatch(/https/);
  });

  it('refuses a hostname that resolves to a private address', async () => {
    expect(await validateWebhookUrlForSave('https://merchant.example/hook')).toBe(BLOCKED_TARGET_MESSAGE);
  });
});

describe('deliverWebhook refuses internal targets', () => {
  it('does not connect to a literal loopback address', async () => {
    const port = await receiver();
    const result = await deliverWebhook(`http://127.0.0.1:${port}/hook`, 'secret', payload);

    expect(hits).toBe(0);
    expect(result.ok).toBe(false);
    expect(result.body).toBeNull();
    expect(result.error).toBe(BLOCKED_TARGET_MESSAGE);
  });

  it('checks the address DNS returns at delivery time, not the name', async () => {
    // Saved as a public-looking name; resolves to loopback when we deliver.
    const port = await receiver();
    const result = await deliverWebhook(`http://rebind.example:${port}/hook`, 'secret', payload);

    expect(hits).toBe(0);
    expect(result.ok).toBe(false);
    expect(result.body).toBeNull();
    expect(result.error).toBe(BLOCKED_TARGET_MESSAGE);
  });
});
