-- Migración aditiva. ORDEN: correr esto en Supabase ANTES de deployar el API
-- que la usa (el código nuevo selecciona commerces.webhook_secret).
-- Requiere pgcrypto (habilitado por defecto en Supabase).

-- 1. Referencia/memo opcional por invoice (mapeo cliente↔cobro del integrador)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reference text;

-- 2. Secreto de firma de webhooks por comercio (HMAC-SHA256)
ALTER TABLE public.commerces ADD COLUMN IF NOT EXISTS webhook_secret text;

-- Backfill: todo comercio existente recibe un secreto (hex de 64 chars)
UPDATE public.commerces
SET webhook_secret = encode(gen_random_bytes(32), 'hex')
WHERE webhook_secret IS NULL;
