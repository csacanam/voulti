-- Migración aditiva. ORDEN: correr esto en Supabase ANTES de deployar el API
-- que la usa (el código nuevo escribe y selecciona invoices.payer_address).

-- Dirección desde la que llegó el dinero.
--
-- No confundir con wallet_address, que guarda la dirección de depósito que
-- genera Voulti: esa es NUESTRA, no del comprador. Esta es lo más cercano a
-- una identidad que permite cripto — no dice quién es, pero sí permite
-- reconocer que dos pagos vinieron del mismo origen.
--
-- Se llena en el barrido (el remitente de la transferencia al depósito) y en
-- el pago por wallet conectada (quien firmó la transacción). Queda en null
-- para los pagos anteriores a este cambio: no se puede reconstruir sin
-- reescanear logs de meses.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payer_address text;

COMMENT ON COLUMN public.invoices.payer_address IS
  'Dirección del pagador. Distinta de wallet_address, que es la dirección de depósito generada por Voulti.';
