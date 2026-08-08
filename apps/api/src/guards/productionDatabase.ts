/**
 * Refuse to start a local server against the production database.
 *
 * `apps/api/.env` points at the production Supabase project. That is correct
 * for the deployed API and a loaded gun on a laptop: every route here writes —
 * invoices, sweep state, whitelists — so a local run is not a read-only
 * inspection, it is production traffic from a dev machine.
 *
 * The sweeper already refuses to move funds when its mnemonic does not match
 * the database. This is the same idea one level up: money is not the only thing
 * worth not corrupting.
 *
 * Opt-out rather than opt-in, deliberately. The failure mode is forgetting, and
 * a guard you must remember to enable guards nothing.
 */

export interface GuardEnv {
  PORT?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  ALLOW_PROD_DB?: string;
}

export interface GuardVerdict {
  block: boolean;
  reason?: string;
}

export function checkProductionDatabase(env: GuardEnv): GuardVerdict {
  // DigitalOcean sets PORT; that is the deployed API, where a remote database
  // is the whole point.
  if (env.PORT || env.NODE_ENV === 'production') return { block: false };

  if (env.ALLOW_PROD_DB === '1') return { block: false };

  const url = env.SUPABASE_URL || '';

  // No URL at all fails on its own a moment later, with a clearer message than
  // anything this guard would invent.
  if (!url) return { block: false };

  if (/localhost|127\.0\.0\.1|\[::1\]/.test(url)) return { block: false };

  return {
    block: true,
    reason: `SUPABASE_URL points at a remote project (${redact(url)})`,
  };
}

/** Enough of the host to recognise, not enough to paste anywhere useful. */
export function redact(url: string): string {
  return url.replace(/(https?:\/\/[a-z0-9]{4})[a-z0-9]+/i, '$1…');
}

export function guardProductionDatabase(env: GuardEnv = process.env as GuardEnv): void {
  const verdict = checkProductionDatabase(env);
  if (!verdict.block) return;

  console.error(
    [
      '',
      '  Refusing to start: this looks like a local run against a remote database.',
      '',
      `  ${verdict.reason}`,
      '',
      '  Every route in this API writes. Pointing a laptop at the production',
      '  project means invoices, sweep state and whitelists change for real.',
      '',
      '  If you meant it:  ALLOW_PROD_DB=1 npm run dev',
      '',
    ].join('\n')
  );
  process.exit(1);
}
