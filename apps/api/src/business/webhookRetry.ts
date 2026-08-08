/**
 * When to knock again after a webhook fails.
 *
 * There was no answer to this before: the delivery query selected everything
 * with `retries < 5` and nothing about *when*, so the gap between attempts was
 * whatever the cron interval happened to be. All five went out within minutes
 * and the invoice then left the queue for good — which means a three-minute
 * deploy on the merchant's side permanently cost them a payment notification.
 *
 * The shape below spans ~45 hours across 8 attempts, which is roughly what
 * Stripe (3 days) and Shopify (48h) do. The first retry is fast because most
 * failures are a restart, and the tail is slow because anything still failing
 * after two hours needs a human, not another request.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Delay before retry N, indexed from zero: RETRY_DELAYS_MS[0] is the wait after
 * the first failure. Its length is the number of retries, so the total number
 * of attempts is this + 1.
 */
export const RETRY_DELAYS_MS = [
  1 * MINUTE,
  5 * MINUTE,
  30 * MINUTE,
  2 * HOUR,
  6 * HOUR,
  12 * HOUR,
  24 * HOUR,
];

/** Attempts in total, first delivery included. */
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

/**
 * When the next attempt becomes eligible, or null when there will not be one.
 *
 * `failureCount` is the number of failures *including* the one just recorded,
 * so the first failure passes 1.
 */
export function nextRetryAt(failureCount: number, now: number = Date.now()): Date | null {
  if (failureCount < 1) return new Date(now);

  const delay = RETRY_DELAYS_MS[failureCount - 1];
  if (delay === undefined) return null; // exhausted

  return new Date(now + delay);
}

/** Whether this failure was the last one we will act on. */
export function isExhausted(failureCount: number): boolean {
  return failureCount >= MAX_ATTEMPTS;
}

/**
 * Whether to email the merchant about this particular failure.
 *
 * Previously every failure sent one, which was five emails for a single
 * payment. Stretching the schedule to two days would have made that eight — a
 * mailbox filling up about one problem the merchant already knows about after
 * the first message. They get told when it starts and when we give up.
 */
export function shouldEmailMerchant(failureCount: number): boolean {
  return failureCount === 1 || isExhausted(failureCount);
}

/** Human-readable schedule, for docs and for the failure email. */
export function describeSchedule(): string {
  const label = (ms: number) =>
    ms >= HOUR ? `${ms / HOUR}h` : `${ms / MINUTE}m`;
  return RETRY_DELAYS_MS.map(label).join(', ');
}
