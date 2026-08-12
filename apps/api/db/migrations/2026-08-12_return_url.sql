-- Migración aditiva. ORDEN: correr esto en Supabase ANTES de deployar el API
-- que la usa (el código nuevo selecciona commerces.return_url_domains y escribe
-- invoices.return_url). Al revés, POST /invoices falla con 500 en TODOS los
-- cobros, no solo en los que manden return_url.

-- A dónde vuelve el navegador del pagador cuando el cobro llega a estado final.
-- Se guarda la plantilla, no la URL resuelta: puede contener {invoice_id}, que
-- se sustituye al momento de redirigir.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS return_url text;

COMMENT ON COLUMN public.invoices.return_url IS
  'Plantilla de URL de retorno. Puede contener {invoice_id}. Validada contra commerces.return_url_domains al crear el cobro.';

-- Dominios a los que este comercio autoriza volver.
--
-- Existe porque POST /invoices no pide autenticación y el commerce_id es
-- público — está en la barra de direcciones de /pay/:commerceId. Sin esta
-- lista, cualquiera crea un cobro contra un comercio real y le pone una URL de
-- retorno propia: el link sale con el nombre y el logo del comercio, en el
-- dominio de Voulti, y rebota al sitio del atacante. Es el mismo motivo por el
-- que OAuth 2.0 obliga a pre-registrar redirect_uri, con client_id en lugar de
-- commerce_id.
--
-- La única ruta que la escribe pide requireAuth y compara la wallet del dueño,
-- que es exactamente lo que el atacante no tiene. Y arranca vacía a propósito:
-- un comercio que nunca la configuró rechaza cualquier return_url.
ALTER TABLE public.commerces ADD COLUMN IF NOT EXISTS return_url_domains text[];

COMMENT ON COLUMN public.commerces.return_url_domains IS
  'Dominios autorizados como destino de return_url. Vacío o NULL rechaza todo. Solo escribible por el dueño autenticado.';
