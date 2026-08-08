-- Migración aditiva. ORDEN: correr esto en Supabase ANTES de deployar el API
-- que la usa (el código nuevo escribe y selecciona invoices.description).

-- Concepto del cobro, en lenguaje humano: "Suscripción octubre", "Mesa 4".
--
-- Distinto de `reference`, y complementario:
--   reference   → identificador del comercio, para cuadrar con SU sistema.
--                 Privado: no se le muestra al pagador.
--   description → qué se está comprando. Se le MUESTRA al pagador en el
--                 checkout, porque un monto sin concepto no le dice qué está
--                 pagando.
--
-- Mezclarlos en un solo campo obliga a elegir entre poder buscar por id o
-- poder mostrar algo legible, y termina sin servir para ninguna de las dos.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.invoices.description IS
  'Concepto visible para el pagador en el checkout. Distinto de reference, que es el identificador privado del comercio.';
