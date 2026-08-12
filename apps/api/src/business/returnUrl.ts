// src/business/returnUrl.ts
//
// Where the payer's browser is sent once an invoice reaches a final status.
//
// This is the one field in the invoice payload that points a person somewhere,
// which makes it the one field an open-redirect can hide in. The exposure is
// unusually sharp here because POST /invoices takes no authentication and
// identifies the merchant by `commerce_id` alone, which is public by design:
// without a check, anyone can mint an invoice against a trusted merchant's id,
// point it at a site they control, and hand out a voulti.com link that carries
// that merchant's name and bounces to a forgery.
//
// So a return_url is only accepted when its host is on a list the merchant
// wrote while authenticated with their wallet. The attacker above cannot write
// that list, which is the whole defence — proving domain ownership by DNS
// would harden a different and much weaker case (a merchant listing a domain
// they do not own) and is deliberately not what stands between this endpoint
// and a phishing trampoline.

/** Substituted with the real invoice id at redirect time. */
export const INVOICE_ID_PLACEHOLDER = '{invoice_id}';

/** A syntactically valid id used to validate the template as it will resolve. */
const SAMPLE_INVOICE_ID = '00000000-0000-0000-0000-000000000000';

export const MAX_RETURN_URL_LENGTH = 500;

export type ReturnUrlRejection =
  | 'not-a-string'
  | 'too-long'
  | 'unparseable'
  | 'bad-scheme'
  | 'has-credentials'
  | 'no-allowlist'
  | 'host-not-allowed';

export type ReturnUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: ReturnUrlRejection; message: string };

/**
 * Normalise a host for comparison.
 *
 * The trailing dot matters: `example.com.` is a valid absolute name that
 * resolves to the same server, so leaving it in place would let one spelling
 * of an allowed domain be treated as a different one.
 */
function normaliseHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/**
 * Whether `host` is `domain` or a subdomain of it.
 *
 * The dot is not decoration. A bare `host.endsWith(domain)` also accepts
 * `notpeewah.co` for an allowlist entry of `peewah.co`, and registering a
 * lookalike domain is the cheapest step in the whole attack.
 */
function hostMatches(host: string, domain: string): boolean {
  const h = normaliseHost(host);
  const d = normaliseHost(domain);
  if (!d) return false;
  return h === d || h.endsWith(`.${d}`);
}

/** Localhost over plain http stays usable for integrators building locally. */
function isLoopback(hostname: string): boolean {
  const h = normaliseHost(hostname);
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

/**
 * Validate a return_url template against a commerce's allowlist.
 *
 * Validation runs against the URL *after* placeholder substitution, not
 * against the template. A template is not what the payer's browser will
 * follow, and checking the wrong one of the two is how `https://{invoice_id}
 * .evil.com/` passes a host check and then resolves somewhere else entirely.
 */
export function validateReturnUrl(
  candidate: unknown,
  allowedDomains: string[] | null | undefined
): ReturnUrlCheck {
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    return {
      ok: false,
      reason: 'not-a-string',
      message: 'return_url must be a non-empty string',
    };
  }

  if (candidate.length > MAX_RETURN_URL_LENGTH) {
    return {
      ok: false,
      reason: 'too-long',
      message: `return_url must be at most ${MAX_RETURN_URL_LENGTH} characters`,
    };
  }

  const resolved = resolveReturnUrl(candidate, SAMPLE_INVOICE_ID);

  let url: URL;
  try {
    url = new URL(resolved);
  } catch {
    return {
      ok: false,
      reason: 'unparseable',
      message: 'return_url must be an absolute URL, including the scheme',
    };
  }

  // Rejected outright rather than left to the host check. `javascript:` and
  // `data:` are not redirect targets at all, and the parser's idea of a "host"
  // for them is not something a domain allowlist should be reasoning about.
  const httpsOnly = url.protocol === 'https:';
  const localHttp = url.protocol === 'http:' && isLoopback(url.hostname);
  if (!httpsOnly && !localHttp) {
    return {
      ok: false,
      reason: 'bad-scheme',
      message: 'return_url must use https (http is only accepted for localhost)',
    };
  }

  // `https://peewah.co@evil.com/` has hostname evil.com, so the check below
  // already catches it — but a URL that *reads* as one host and resolves to
  // another has no legitimate use here and should not be stored.
  if (url.username || url.password) {
    return {
      ok: false,
      reason: 'has-credentials',
      message: 'return_url must not contain credentials',
    };
  }

  const domains = (allowedDomains || []).filter(d => typeof d === 'string' && d.trim() !== '');

  if (domains.length === 0) {
    return {
      ok: false,
      reason: 'no-allowlist',
      message:
        'This commerce has no return URL domains configured. The merchant must add one from ' +
        'their dashboard before return_url can be used.',
    };
  }

  if (!domains.some(d => hostMatches(url.hostname, d))) {
    return {
      ok: false,
      reason: 'host-not-allowed',
      message:
        `return_url host "${url.hostname}" is not among this commerce's allowed domains ` +
        `(${domains.join(', ')})`,
    };
  }

  // The template is what gets stored: substitution happens per redirect, and
  // storing the resolved sample would send every payer to the same fake id.
  return { ok: true, url: candidate };
}

/** Replace every occurrence of the placeholder with a real invoice id. */
export function resolveReturnUrl(template: string, invoiceId: string): string {
  return template.split(INVOICE_ID_PLACEHOLDER).join(invoiceId);
}

/**
 * Validate a domain a merchant is adding to their allowlist.
 *
 * Accepts a bare hostname, and also tolerates a full URL pasted in, because
 * that is what someone copying from their browser bar will hand over.
 */
export function normaliseAllowedDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  let value = input.trim().toLowerCase();
  if (!value) return null;

  if (value.includes('://')) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  }

  // Strip anything that is not part of the name: a path, a port, credentials.
  value = normaliseHost(value.split('/')[0].split(':')[0].split('@').pop() || '');

  if (isLoopback(value)) return value;

  // A single label ("com", "peewah") is either a typo or a wildcard over a
  // whole TLD; neither is something to accept into a redirect allowlist.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value)) {
    return null;
  }

  return value;
}
