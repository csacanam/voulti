-- Migración correctiva. Se puede correr ANTES o DESPUÉS del deploy: no agrega
-- columnas, solo rellena las que quedaron nulas. Cuanto antes, mejor — cada
-- minuto que pasa son webhooks reales saliendo sin firmar.

-- El backfill del 2026-07-12 le dio secreto a todos los comercios que existían
-- ESE día, y nada sostuvo el invariante después: POST /commerces nunca escribió
-- webhook_secret, así que todo comercio creado desde entonces nació con NULL y
-- se quedó así para siempre.
--
-- Lo que eso provoca no se parece a un problema de configuración: sin secreto,
-- deliverWebhook omite la cabecera X-Voulti-Signature por completo (el `else if
-- (secret)` de webhookDelivery.ts). El comercio recibe notificaciones de pago
-- reales sin firma — y si verifica la firma, que es lo que skill.md le dice que
-- haga, rechaza las 8 entregas, se agotan los reintentos en dos días, y nunca
-- se entera de que le pagaron.
--
-- El agujero se cierra en el código (el insert de POST /commerces ya genera
-- uno). Esto repara a los que ya nacieron rotos.

-- Antes de correrlo, mirá a cuántos afecta — si son varios, es un aviso a
-- clientes y no solo un fix:
--
--   SELECT id, name, created_at FROM public.commerces WHERE webhook_secret IS NULL;

UPDATE public.commerces
SET webhook_secret = encode(gen_random_bytes(32), 'hex')
WHERE webhook_secret IS NULL;

-- Debe devolver 0.
-- SELECT count(*) FROM public.commerces WHERE webhook_secret IS NULL;
