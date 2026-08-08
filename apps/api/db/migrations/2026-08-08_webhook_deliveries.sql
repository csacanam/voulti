-- Migración aditiva. ORDEN: correr esto en Supabase ANTES de deployar el API
-- que la usa (el código nuevo inserta en webhook_deliveries).

-- Historial de entregas de webhook.
--
-- Hasta hoy, un webhook fallido dejaba dos rastros en la invoice:
-- confirmation_url_response (booleano) y confirmation_url_retries (contador).
-- Eso alcanza para que el cron sepa a quién reintentar, y para nada más. El
-- comercio recibía un correo que decía "HTTP Error Response" — cierto e
-- inútil — y cuando falló de verdad tuvimos que ir a excavar a mano.
--
-- Un intento es un hecho con hora, resultado y respuesta. Esta tabla lo trata
-- como tal, y convierte "no me llega el webhook" en "mirá: 404 desde las
-- 3:41, siete intentos".
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Null cuando la entrega es una prueba disparada desde el dashboard: no
  -- corresponde a ningún cobro real, y no debe impedir borrar una invoice.
  invoice_id   uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  commerce_id  uuid NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,

  -- El status que se anunció: Paid, Expired o Refunded.
  event        text NOT NULL,

  -- Se guarda la URL usada, no se lee de commerces al mostrar: si el comercio
  -- la cambia, el historial tiene que seguir diciendo a dónde se mandó.
  url          text NOT NULL,

  ok           boolean NOT NULL,
  status_code  integer,          -- null si no hubo respuesta HTTP (DNS, timeout, conexión rechazada)
  response_body text,            -- recortado a 500 caracteres en el código
  error        text,             -- el motivo cuando no hubo respuesta
  duration_ms  integer NOT NULL,
  signed       boolean NOT NULL, -- false = el comercio no tiene secreto y nadie pudo verificar nada
  is_test      boolean NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now()
);

-- El acceso real es "las últimas entregas de esta invoice" y "las últimas de
-- este comercio". Sin estos índices, ambas consultas escanean toda la tabla,
-- que es la única que crece sin techo en todo el esquema.
CREATE INDEX IF NOT EXISTS webhook_deliveries_invoice_idx
  ON public.webhook_deliveries (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS webhook_deliveries_commerce_idx
  ON public.webhook_deliveries (commerce_id, created_at DESC);

COMMENT ON TABLE public.webhook_deliveries IS
  'Un renglón por intento de entrega de webhook, con lo que respondió el servidor del comercio.';
