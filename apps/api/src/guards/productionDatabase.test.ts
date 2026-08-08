import { describe, it, expect } from 'vitest';
import { checkProductionDatabase, redact } from './productionDatabase';

const PROD = 'https://abcdefghijklmnop.supabase.co';

describe('checkProductionDatabase', () => {
  it('blocks a bare local run against a remote project', () => {
    // The case this exists for: `npm run dev` on a laptop, .env pointing at
    // production, every write route live.
    expect(checkProductionDatabase({ SUPABASE_URL: PROD }).block).toBe(true);
  });

  it('lets the deployed API through — PORT is set by the platform', () => {
    expect(checkProductionDatabase({ SUPABASE_URL: PROD, PORT: '8080' }).block).toBe(false);
  });

  it('lets NODE_ENV=production through', () => {
    expect(checkProductionDatabase({ SUPABASE_URL: PROD, NODE_ENV: 'production' }).block).toBe(false);
  });

  it('lets a deliberate override through', () => {
    expect(checkProductionDatabase({ SUPABASE_URL: PROD, ALLOW_PROD_DB: '1' }).block).toBe(false);
  });

  it('does not accept a truthy-looking override that is not exactly "1"', () => {
    // "0" and "false" are the strings people set when they mean *off*.
    expect(checkProductionDatabase({ SUPABASE_URL: PROD, ALLOW_PROD_DB: '0' }).block).toBe(true);
    expect(checkProductionDatabase({ SUPABASE_URL: PROD, ALLOW_PROD_DB: 'false' }).block).toBe(true);
  });

  it('allows a local database', () => {
    for (const url of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) {
      expect(checkProductionDatabase({ SUPABASE_URL: url }).block, url).toBe(false);
    }
  });

  it('stays out of the way when there is no URL at all', () => {
    // That fails on its own a moment later with a clearer message.
    expect(checkProductionDatabase({}).block).toBe(false);
    expect(checkProductionDatabase({ SUPABASE_URL: '' }).block).toBe(false);
  });

  it('does not print the whole project ref in the reason', () => {
    const { reason } = checkProductionDatabase({ SUPABASE_URL: PROD });
    expect(reason).toBeTruthy();
    expect(reason).not.toContain('abcdefghijklmnop');
  });
});

describe('redact', () => {
  it('keeps enough of the host to recognise and drops the rest', () => {
    expect(redact(PROD)).toBe('https://abcd….supabase.co');
  });
});
