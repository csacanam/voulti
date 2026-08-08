import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MAX_ATTEMPTS, describeSchedule } from '../business/webhookRetry';

/**
 * The documentation lies eventually. These tests make it lie loudly.
 *
 * Twice in one day a document described behaviour the code no longer had: the
 * dashboard said the webhook fires "when an invoice is paid" long after we
 * started delivering on Expired and Refunded, and skill.md promised that a
 * permanent link without `?currency=` falls back to the merchant's account
 * currency, hours after that fallback was replaced by a picker.
 *
 * Neither was caught by review, because nobody re-reads prose when they change
 * a constant. So the constants read the prose instead.
 *
 * Scope, honestly: this catches claims that can be tied to a literal in the
 * source. It cannot catch a sentence describing what a React component does on
 * screen — the `?currency=` case is still only caught by a human. What it does
 * cover is every number, status list and "no auth needed" claim, which is where
 * the documentation is most confidently wrong.
 */

const REPO = join(__dirname, '../../../..');
const read = (p: string) => readFileSync(join(REPO, p), 'utf8');

const SKILL = read('apps/checkout/public/skill.md');
const DEV_TAB = read('apps/merchant/app/(merchant)/receive/page.tsx');
const LOCALE_ES = read('apps/merchant/lib/locales/es.ts');
const LOCALE_EN = read('apps/merchant/lib/locales/en.ts');
const NOTIFICATIONS = read('apps/api/src/business/notificationService.ts');
const DELIVERY = read('apps/api/src/business/webhookDelivery.ts');
const INDEX = read('apps/api/src/index.ts');
const INVOICE_ROUTES = read('apps/api/src/routes/invoices.ts');
const COMMERCE_ROUTES = read('apps/api/src/routes/commerces.ts');

/** Everything a reader could be told, in one haystack. */
const ALL_DOCS = [SKILL, DEV_TAB, LOCALE_ES, LOCALE_EN].join('\n');

describe('the webhook statuses the docs promise', () => {
  it('match the statuses the delivery query actually selects', () => {
    // notificationService.getInvoicesNeedingUrlConfirmation()
    const match = NOTIFICATIONS.match(/\.in\('status',\s*\[([^\]]+)\]\)/);
    expect(match, 'could not find the status filter — did the query change shape?').toBeTruthy();

    const actual = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(actual).toEqual(['Expired', 'Paid', 'Refunded']);

    // Every one of them must be named where a reader would look.
    for (const status of actual) {
      expect(SKILL, `skill.md never mentions the ${status} webhook`).toContain(status);
      expect(ALL_DOCS, `the dashboard never mentions ${status}`).toContain(status);
    }
  });
});

describe('the numbers the docs quote', () => {
  it('quote the real attempt count', () => {
    // The number lives in the retry schedule now, not in a loose constant —
    // reading it from there is what makes this test survive the next change.
    expect(NOTIFICATIONS).toContain('private maxRetries = MAX_ATTEMPTS');

    // Both surfaces tell an integrator how many times we will knock.
    expect(ALL_DOCS, `docs never state the ${MAX_ATTEMPTS} attempts`).toMatch(
      new RegExp(`${MAX_ATTEMPTS} times|${MAX_ATTEMPTS} attempts|${MAX_ATTEMPTS} intentos|${MAX_ATTEMPTS} veces`)
    );
  });

  it('quote the real backoff schedule', () => {
    // A merchant plans their retry tolerance around these numbers. If the
    // schedule moves and the sentence does not, they plan around fiction.
    expect(ALL_DOCS, `docs never state the schedule "${describeSchedule()}"`).toContain(describeSchedule());
  });

  it('quote the real delivery timeout', () => {
    const timeoutMs = Number(DELIVERY.match(/WEBHOOK_TIMEOUT_MS = (\d+)/)![1]);
    const seconds = timeoutMs / 1000;

    expect(ALL_DOCS, `docs never mention the ${seconds}s timeout`).toMatch(
      new RegExp(`${seconds} ?s\\b|${seconds} seconds|${seconds} segundos`)
    );
  });

  it('quote the real rate limit', () => {
    const max = Number(INDEX.match(/max:\s*(\d+)/)![1]);
    const window = INDEX.match(/timeWindow:\s*'([^']+)'/)![1];

    expect(window).toBe('1 minute');
    expect(SKILL, `skill.md does not state the ${max}/min limit`).toContain(`${max} requests/minute`);
  });
});

describe('endpoints the docs present as needing no auth', () => {
  /**
   * The bug this exists for: the dashboard showed
   *   curl https://api.voulti.com/invoices/by-commerce/<id>
   * as a plain command for two years' worth of readers. It carries requireAuth
   * and answers 401. A developer copying it gets a failure with no explanation,
   * from the page that is supposed to be the explanation.
   */
  const authedRoutes = (source: string, prefix: string) =>
    [...source.matchAll(/app\.(get|post|put|delete)\(\s*'([^']+)'\s*,\s*\{\s*preHandler:\s*requireAuth/g)].map(
      (m) => `${m[1].toUpperCase()} ${prefix}${m[2] === '/' ? '' : m[2]}`
    );

  const AUTHED = [...authedRoutes(INVOICE_ROUTES, '/invoices'), ...authedRoutes(COMMERCE_ROUTES, '/commerces')];

  it('finds the authenticated routes at all', () => {
    // If the parse silently returned nothing, every assertion below would pass
    // vacuously and the test would be decoration.
    expect(AUTHED.length).toBeGreaterThan(5);
    expect(AUTHED).toContain('GET /invoices/by-commerce/:commerceId');
    expect(AUTHED).toContain('GET /commerces/:id/balances');
  });

  /** `curl <base>/path` with no Authorization header anywhere in the command. */
  const publicCurls = (source: string) =>
    [...source.matchAll(/curl (?:-X (\w+) )?(?:\$\{apiBase\}|https:\/\/api\.voulti\.com)([^\s`'"]*)/g)]
      .filter((m) => !m[0].includes('Authorization'))
      .map((m) => ({ method: (m[1] || 'GET').toUpperCase(), path: m[2] }));

  /** `/invoices/{invoice_id}` and `/invoices/<id>` both mean `/invoices/:id`. */
  const toPattern = (method: string, path: string) => {
    const normalised = path
      .replace(/\$\{cid\}/g, ':id')
      .replace(/\{[^}]+\}/g, ':id')
      .replace(/<[^>]+>/g, ':id');
    return `${method} ${normalised}`;
  };

  const isAuthed = (pattern: string) =>
    AUTHED.some((route) => {
      // Compare shape, not parameter names: :id and :commerceId are the same slot.
      const generic = (s: string) => s.replace(/:[A-Za-z]+/g, ':x');
      return generic(route) === generic(pattern);
    });

  it('are actually public, in the dashboard', () => {
    const offenders = publicCurls(DEV_TAB)
      .map(({ method, path }) => toPattern(method, path))
      .filter(isAuthed);

    expect(offenders, 'the Developers tab shows an authenticated endpoint as a bare curl').toEqual([]);
  });

  it('are actually public, in skill.md', () => {
    const offenders = publicCurls(SKILL)
      .map(({ method, path }) => toPattern(method, path))
      .filter(isAuthed);

    expect(offenders, 'skill.md shows an authenticated endpoint as needing no auth').toEqual([]);
  });
});

describe('error messages the docs quote', () => {
  it('exist verbatim in the routes that return them', () => {
    // Only the ones skill.md quotes as literal JSON, e.g. {"error":"..."}.
    const quoted = [...SKILL.matchAll(/\{"error":"([^"…]+)…?"\}/g)].map((m) => m[1]);
    expect(quoted.length, 'no quoted error strings found — did the table change format?').toBeGreaterThan(3);

    const routeSource = INVOICE_ROUTES + COMMERCE_ROUTES;
    const missing = quoted.filter((msg) => !routeSource.includes(msg));

    expect(missing, 'skill.md quotes an error message no route produces').toEqual([]);
  });
});

describe('the currencies the docs list', () => {
  it('are the ones the invoice route validates against', () => {
    // The route validates against the fiat_exchange_rates table, so the list
    // cannot be read from source. What we *can* enforce is that the docs never
    // quietly grow a currency the product does not sell.
    const documented = SKILL.match(/Supported: ([^—]+)—/)![1];
    const codes = [...documented.matchAll(/`([A-Z]{3})`/g)].map((m) => m[1]).sort();

    expect(codes).toEqual(['ARS', 'BRL', 'COP', 'EUR', 'MXN', 'USD']);
  });
});
