import { describe, it, expect } from 'vitest';
import {
  validateReturnUrl,
  resolveReturnUrl,
  normaliseAllowedDomain,
  MAX_RETURN_URL_LENGTH,
} from '../business/returnUrl';

/**
 * The attack this file is really testing:
 *
 * POST /invoices takes no authentication and identifies the merchant by a
 * commerce_id that sits in the address bar of every payment link. Without a
 * check, anyone mints an invoice against a real merchant, points return_url at
 * a site they control, and hands out a voulti.com link carrying that merchant's
 * name that bounces to a forgery.
 *
 * Every `expect(...ok).toBe(false)` below is one spelling of that attack.
 */

const ALLOWED = ['peewah.co'];

const accepts = (url: string, domains = ALLOWED) =>
  validateReturnUrl(url, domains).ok;

describe('validateReturnUrl — hosts that must be accepted', () => {
  it('accepts the exact domain', () => {
    expect(accepts('https://peewah.co/gracias')).toBe(true);
  });

  it('accepts subdomains', () => {
    expect(accepts('https://www.peewah.co/gracias')).toBe(true);
    expect(accepts('https://tienda.peewah.co/gracias')).toBe(true);
    expect(accepts('https://a.b.peewah.co/gracias')).toBe(true);
  });

  it('accepts the placeholder, query strings and ports', () => {
    expect(accepts('https://peewah.co/gracias?id={invoice_id}')).toBe(true);
    expect(accepts('https://peewah.co/{invoice_id}/certificado')).toBe(true);
    expect(accepts('https://peewah.co:8443/gracias')).toBe(true);
  });

  it('is case-insensitive and tolerates a trailing dot', () => {
    // `PEEWAH.CO` and `peewah.co.` reach the same server; treating either as a
    // different host would reject a merchant's own site.
    expect(accepts('https://PEEWAH.CO/gracias')).toBe(true);
    expect(accepts('https://peewah.co./gracias')).toBe(true);
  });

  it('matches against any domain in the list', () => {
    expect(accepts('https://peewah.org/x', ['peewah.co', 'peewah.org'])).toBe(true);
  });
});

describe('validateReturnUrl — the attack', () => {
  it('rejects an unrelated host', () => {
    expect(accepts('https://evil.com/gracias')).toBe(false);
  });

  it('rejects a lookalike that merely ends with the domain', () => {
    // The bug a bare endsWith() would have. Registering notpeewah.co is the
    // cheapest step in the whole attack, so this is the case that matters most.
    expect(accepts('https://notpeewah.co/gracias')).toBe(false);
    expect(accepts('https://peewah.co.evil.com/gracias')).toBe(false);
    expect(accepts('https://xpeewah.co/gracias')).toBe(false);
  });

  it('rejects credentials that make the URL read as the allowed host', () => {
    // Reads as peewah.co to a human; resolves to evil.com in a browser.
    expect(accepts('https://peewah.co@evil.com/gracias')).toBe(false);
    expect(accepts('https://peewah.co:x@evil.com/gracias')).toBe(false);
  });

  it('rejects a placeholder that would move the host after substitution', () => {
    // Validating the template instead of what the browser will follow is how
    // this one slips through.
    expect(accepts('https://{invoice_id}.evil.com/gracias')).toBe(false);
  });

  it('rejects schemes that are not redirects at all', () => {
    expect(accepts('javascript:alert(1)')).toBe(false);
    expect(accepts('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(accepts('file:///etc/passwd')).toBe(false);
  });

  it('rejects plain http on a non-loopback host', () => {
    expect(accepts('http://peewah.co/gracias')).toBe(false);
  });

  it('rejects a relative URL', () => {
    expect(accepts('/gracias')).toBe(false);
    expect(accepts('peewah.co/gracias')).toBe(false);
  });
});

describe('validateReturnUrl — no allowlist means no return_url', () => {
  it('rejects everything when the commerce configured nothing', () => {
    // The default has to be closed. A commerce that never opted in must not be
    // usable as a trampoline by someone who found its public commerce_id.
    for (const domains of [null, undefined, [], ['']]) {
      const result = validateReturnUrl('https://peewah.co/gracias', domains as any);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('no-allowlist');
    }
  });

  it('says what is missing, not just that it failed', () => {
    const result = validateReturnUrl('https://peewah.co/gracias', []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/dashboard/i);
  });
});

describe('validateReturnUrl — input hygiene', () => {
  it('rejects non-strings and blanks', () => {
    for (const bad of [null, undefined, 42, {}, [], '', '   ']) {
      expect(validateReturnUrl(bad, ALLOWED).ok).toBe(false);
    }
  });

  it('rejects a URL past the length limit', () => {
    const long = 'https://peewah.co/' + 'a'.repeat(MAX_RETURN_URL_LENGTH);
    const result = validateReturnUrl(long, ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too-long');
  });

  it('returns the template, not the sample-resolved URL', () => {
    // Storing the resolved sample would send every payer to the same fake id.
    const template = 'https://peewah.co/gracias?id={invoice_id}';
    const result = validateReturnUrl(template, ALLOWED);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url).toBe(template);
  });

  it('allows http on localhost so integrators can build locally', () => {
    expect(accepts('http://localhost:3000/gracias', ['localhost'])).toBe(true);
    expect(accepts('http://127.0.0.1:3000/gracias', ['127.0.0.1'])).toBe(true);
    // Still only when the merchant actually listed it.
    expect(accepts('http://localhost:3000/gracias', ALLOWED)).toBe(false);
  });
});

describe('resolveReturnUrl', () => {
  const id = 'b3d1f0a2-0000-4000-8000-000000000001';

  it('substitutes every occurrence', () => {
    expect(resolveReturnUrl('https://peewah.co/{invoice_id}/x?i={invoice_id}', id)).toBe(
      `https://peewah.co/${id}/x?i=${id}`
    );
  });

  it('leaves a URL without the placeholder untouched', () => {
    expect(resolveReturnUrl('https://peewah.co/gracias', id)).toBe('https://peewah.co/gracias');
  });
});

describe('normaliseAllowedDomain', () => {
  it('accepts a bare hostname', () => {
    expect(normaliseAllowedDomain('peewah.co')).toBe('peewah.co');
    expect(normaliseAllowedDomain('  PEEWAH.CO  ')).toBe('peewah.co');
  });

  it('accepts a pasted URL, because that is what people copy', () => {
    expect(normaliseAllowedDomain('https://peewah.co/gracias')).toBe('peewah.co');
    expect(normaliseAllowedDomain('https://www.peewah.co')).toBe('www.peewah.co');
  });

  it('strips ports and credentials', () => {
    expect(normaliseAllowedDomain('peewah.co:8443')).toBe('peewah.co');
    expect(normaliseAllowedDomain('user@peewah.co')).toBe('peewah.co');
  });

  it('rejects a single label, which would open a whole TLD', () => {
    expect(normaliseAllowedDomain('com')).toBeNull();
    expect(normaliseAllowedDomain('peewah')).toBeNull();
  });

  it('rejects junk', () => {
    for (const bad of ['', '   ', '...', 'peewah..co', '-peewah.co', 42, null]) {
      expect(normaliseAllowedDomain(bad as any)).toBeNull();
    }
  });

  it('keeps localhost usable', () => {
    expect(normaliseAllowedDomain('localhost')).toBe('localhost');
  });
});
