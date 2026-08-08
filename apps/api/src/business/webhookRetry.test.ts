import { describe, it, expect } from 'vitest';
import {
  RETRY_DELAYS_MS,
  MAX_ATTEMPTS,
  nextRetryAt,
  isExhausted,
  shouldEmailMerchant,
  describeSchedule,
} from './webhookRetry';

const NOW = Date.UTC(2026, 7, 8, 12, 0, 0);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('the retry schedule', () => {
  it('spreads attempts across days, not minutes', () => {
    // The bug this replaces: no backoff at all, so all attempts landed within
    // one cron interval of each other and a short outage consumed every one.
    const total = RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(24 * HOUR);
  });

  it('only ever waits longer', () => {
    for (let i = 1; i < RETRY_DELAYS_MS.length; i++) {
      expect(RETRY_DELAYS_MS[i]).toBeGreaterThan(RETRY_DELAYS_MS[i - 1]);
    }
  });

  it('retries the first failure quickly, because most are a restart', () => {
    expect(RETRY_DELAYS_MS[0]).toBeLessThanOrEqual(5 * MINUTE);
  });
});

describe('nextRetryAt', () => {
  it('waits one minute after the first failure', () => {
    expect(nextRetryAt(1, NOW)!.getTime()).toBe(NOW + MINUTE);
  });

  it('follows the schedule for each subsequent failure', () => {
    RETRY_DELAYS_MS.forEach((delay, i) => {
      expect(nextRetryAt(i + 1, NOW)!.getTime(), `failure ${i + 1}`).toBe(NOW + delay);
    });
  });

  it('returns null once the schedule runs out, which is what stops the loop', () => {
    expect(nextRetryAt(MAX_ATTEMPTS, NOW)).toBeNull();
    expect(nextRetryAt(MAX_ATTEMPTS + 5, NOW)).toBeNull();
  });

  it('never returns a time in the past', () => {
    for (let n = 1; n <= MAX_ATTEMPTS; n++) {
      const at = nextRetryAt(n, NOW);
      if (at) expect(at.getTime()).toBeGreaterThan(NOW);
    }
  });
});

describe('isExhausted', () => {
  it('is false while attempts remain', () => {
    for (let n = 1; n < MAX_ATTEMPTS; n++) expect(isExhausted(n), `failure ${n}`).toBe(false);
  });

  it('is true on the last failure — the point of no return', () => {
    // getInvoicesNeedingUrlConfirmation filters on retries < MAX_ATTEMPTS, so
    // this is the moment the invoice leaves the delivery queue for good.
    expect(isExhausted(MAX_ATTEMPTS)).toBe(true);
  });

  it('agrees with nextRetryAt about when it is over', () => {
    // Two ways to say "stop" that must never disagree: one drives the column,
    // the other drives the alert.
    for (let n = 1; n <= MAX_ATTEMPTS + 2; n++) {
      expect(nextRetryAt(n, NOW) === null, `failure ${n}`).toBe(isExhausted(n));
    }
  });
});

describe('shouldEmailMerchant', () => {
  it('emails on the first failure', () => {
    expect(shouldEmailMerchant(1)).toBe(true);
  });

  it('emails when we give up', () => {
    expect(shouldEmailMerchant(MAX_ATTEMPTS)).toBe(true);
  });

  it('stays quiet in between', () => {
    // One email per attempt was five for a single payment, and would have been
    // eight under this schedule — all about a problem the merchant learned
    // about in the first one.
    for (let n = 2; n < MAX_ATTEMPTS; n++) expect(shouldEmailMerchant(n), `failure ${n}`).toBe(false);
  });

  it('sends exactly two emails across a fully failed delivery', () => {
    const sent = Array.from({ length: MAX_ATTEMPTS }, (_, i) => shouldEmailMerchant(i + 1)).filter(Boolean);
    expect(sent).toHaveLength(2);
  });
});

describe('describeSchedule', () => {
  it('reads the way the docs quote it', () => {
    expect(describeSchedule()).toBe('1m, 5m, 30m, 2h, 6h, 12h, 24h');
  });
});
