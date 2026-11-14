import { lookup as dnsLookup, LookupAddress } from 'dns';
import { BlockList, isIP } from 'net';
import { Agent } from 'undici';

/**
 * Where a webhook is allowed to go: public hosts, and nothing else.
 *
 * The webhook URL is chosen by whoever signs up, and the dashboard shows them
 * the status and first 500 bytes of whatever answers. Without this module that
 * is a free, self-service SSRF: point the URL at 127.0.0.1, a VPC address or
 * the cloud metadata service and read the reply back through our own UI. A
 * "commerce" named ctfprobe did exactly the reconnaissance for it.
 *
 * Checking the URL when it is saved is not enough on its own, for two reasons:
 *
 * - DNS is not stable. A hostname can resolve to a public address when saved
 *   and to 169.254.169.254 when delivered (DNS rebinding).
 * - Redirects. A public endpoint answering 302 to an internal address used to
 *   be followed, and fetch turns the POST into a GET on the way — which is the
 *   method metadata services answer.
 *
 * So the authoritative check runs on the address the socket actually connects
 * to (`webhookDispatcher`), and redirects are not followed at all. The
 * save-time check exists to tell a merchant now rather than at their first sale.
 */

const BLOCKED = new BlockList();

// IPv4: everything that is not routable on the public internet.
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, home of the cloud metadata service
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, includes broadcast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv4');
}

// IPv6. IPv4-mapped and NAT64 addresses are unwrapped and checked as IPv4 in
// isBlockedAddress, so they are not listed here.
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(net, prefix, 'ipv6');
}

/** The IPv4 address hiding inside an IPv4-mapped (::ffff:a.b.c.d) or NAT64
 *  (64:ff9b::a.b.c.d) IPv6 address, if there is one. */
function embeddedIPv4(addr: string): string | null {
  const lower = addr.toLowerCase();
  const dotted = lower.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hex = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

/** True for any address a webhook must not reach. Unparseable counts as blocked. */
export function isBlockedAddress(addr: string): boolean {
  const bare = addr.replace(/^\[|\]$/g, '');
  const family = isIP(bare);
  if (family === 4) return BLOCKED.check(bare, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIPv4(bare);
    if (v4) return BLOCKED.check(v4, 'ipv4');
    return BLOCKED.check(bare, 'ipv6');
  }
  return true;
}

export const BLOCKED_TARGET_CODE = 'EWEBHOOK_BLOCKED_TARGET';

export const BLOCKED_TARGET_MESSAGE =
  'The webhook URL points to a private or reserved address. Webhooks are only delivered to public hosts.';

function blockedError(): NodeJS.ErrnoException {
  const err: NodeJS.ErrnoException = new Error(BLOCKED_TARGET_MESSAGE);
  err.code = BLOCKED_TARGET_CODE;
  return err;
}

/**
 * dns.lookup with every answer checked. One private answer blocks the whole
 * name: picking the public one would leave the socket free to try the rest.
 */
function guardedLookup(hostname: string, options: any, callback: any): void {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(blockedError());
    }
    if (options?.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

let allowPrivateTargets = false;

/**
 * The delivery tests run a real receiver on 127.0.0.1, which is exactly what
 * this module refuses. They switch the guard off explicitly; nothing outside a
 * vitest run can.
 */
export function allowPrivateTargetsForTests(enabled: boolean): void {
  if (process.env.VITEST !== 'true') {
    throw new Error('allowPrivateTargetsForTests is only callable from tests');
  }
  allowPrivateTargets = enabled;
}

const guardedAgent = new Agent({ connect: { lookup: guardedLookup } });
const testAgent = new Agent();

/** The dispatcher every webhook request goes through. */
export function webhookDispatcher(): Agent {
  return allowPrivateTargets ? testAgent : guardedAgent;
}

/**
 * Checks that need no network: scheme and literal addresses. A literal IP in
 * the URL never reaches the lookup hook — the socket connects to it directly —
 * so this is the check that covers it at delivery time.
 *
 * Returns an error message, or null if the URL may be used.
 */
export function checkWebhookUrlStatic(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'The webhook URL is not a valid URL.';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'The webhook URL must use https.';
  }
  if (url.username || url.password) {
    return 'The webhook URL must not contain credentials.';
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return BLOCKED_TARGET_MESSAGE;
  }
  if (isIP(host) && !allowPrivateTargets && isBlockedAddress(host)) {
    return BLOCKED_TARGET_MESSAGE;
  }
  return null;
}

/**
 * What PUT /webhook runs before storing a URL. Stricter than delivery: new URLs
 * must be https (existing http ones still deliver, to public hosts only), and
 * a hostname that resolves to a private address is refused now rather than
 * failing silently later. A name that does not resolve yet is accepted —
 * merchants set this up before their DNS is live.
 */
export async function validateWebhookUrlForSave(raw: string): Promise<string | null> {
  const staticError = checkWebhookUrlStatic(raw);
  if (staticError) return staticError;

  const url = new URL(raw);
  if (url.protocol !== 'https:') return 'The webhook URL must use https.';

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return null;

  const addresses = await new Promise<LookupAddress[] | null>((resolve) =>
    dnsLookup(host, { all: true }, (err, addrs) => resolve(err ? null : addrs))
  );
  if (addresses && addresses.some((a) => isBlockedAddress(a.address))) {
    return BLOCKED_TARGET_MESSAGE;
  }
  return null;
}

/** True if a fetch error, or anything in its cause chain, is our refusal. */
export function isBlockedTargetError(err: any): boolean {
  for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
    if (e.code === BLOCKED_TARGET_CODE) return true;
  }
  return false;
}
