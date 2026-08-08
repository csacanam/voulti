-- Additive migration. ORDER: run this in Supabase BEFORE deploying the API
-- that uses it (the new code writes and filters on this column).

-- When this invoice's webhook may be attempted again.
--
-- Until now there was no such thing. The delivery query selected every invoice
-- with `confirmation_url_retries < 5` and nothing else, so the gap between
-- retries was simply the cron interval: all five attempts burned within
-- minutes of each other, and then the invoice left the queue permanently.
--
-- That turns a three-minute deploy on the merchant's side into a payment they
-- are never told about. Backing off — 1m, 5m, 30m, 2h, 6h, 12h, 24h — spans
-- roughly two days instead, which is the shape Stripe and Shopify use, and it
-- is the difference between surviving an outage and merely noticing one.
--
-- Null means "eligible now": that is what a first attempt looks like, and what
-- every invoice already queued looks like after this migration.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS confirmation_url_next_retry_at timestamptz;

-- The delivery query runs on every cron tick and filters on exactly this.
CREATE INDEX IF NOT EXISTS invoices_webhook_retry_idx
  ON public.invoices (confirmation_url_next_retry_at)
  WHERE confirmation_url_response = false;

COMMENT ON COLUMN public.invoices.confirmation_url_next_retry_at IS
  'Earliest time the webhook may be retried. Null means eligible now.';
