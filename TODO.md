# TODO — crecimiento y distribución para agentes/devs

Contexto: Voulti tiene la tesis agent más fuerte del portafolio ("tu agente puede cobrar en crypto" — API REST pública sin auth) pero la superficie developer empaquetable era casi inexistente. Estado al 12 jul 2026. Hecho ya: ✅ skill instalable (`npx skills add csacanam/voulti`), ✅ skill.md web ampliado (webhook, estados, errores), ✅ llms.txt en voulti.com.

## Distribución

- [ ] **Demo en X** — el de mayor potencial del portafolio: "mi agente de Claude cobró $5 USDC por un servicio — 3 prompts", con el link de checkout real pagándose en video y `npx skills add csacanam/voulti` en el post.
- [ ] PRs a awesome-lists (awesome-celo, listas de crypto payments / MiniPay).
- [x] MCP server construido y probado (12 jul): `mcp/` con 3 tools sin auth (create_invoice con reference/expires_at, get_invoice, get_payment_link), smoke test contra producción. README raíz con sección For AI agents.
- [x] `voulti-mcp@0.1.0` PUBLICADO (12 jul): npm (cold-install npx verificado) + registro MCP oficial (`io.github.csacanam/voulti`, verificado en la API del registro). Instalación: `claude mcp add voulti -- npx -y voulti-mcp`.
- [ ] Registro ERC-8004 (opcional, si se posiciona como servicio para agentes): registry `0x8004A169…` en Celo/Base; modelo: comprabtc.

## Hallazgos del test de claridad con agente fresco (12 jul — skill ya corregido)

- [x] Campo `reference`/`memo` en invoices (12 jul): opcional ≤200 chars en POST, vuelve en respuestas, listado y webhook. **Requiere migración** (ver abajo).
- [x] Firma de webhooks (12 jul): HMAC-SHA256 estilo Stripe (`X-Voulti-Signature: t=...,v1=...`) con `webhook_secret` por comercio; backward-compatible (sin secret = sin header). Snippet de verificación en el skill.
- [x] Migración `2026-07-12_reference_and_webhook_secret.sql` corrida en Supabase (12 jul) y API deployado — verificado en producción.
- [x] Mostrar el `webhook_secret` en la página Developers del merchant app (12 jul): endpoint autenticado GET /commerces/:id/webhook-secret + componente Reveal/Copy con formato de firma; ejemplos de la página actualizados con `reference`.
- [ ] Publicar schemas de respuesta de la API (el doc decía `invoice_id` pero el campo real es `data.id` — ya corregido en el skill).
- [ ] Modo sandbox/test — hoy la única forma de probar una integración es con dinero real.
- [ ] API de creación de comercios (multi-tenant) — hoy el signup es manual en app.voulti.com, lo que hace posible "mi plataforma cobra a mis clientes" pero NO "plataforma donde cada usuario mío cobra" (marketplaces). Es LA feature que convertiría a Voulti en infraestructura tipo Stripe Connect.

## Developer experience

- [ ] Decidir: publicar SDK mínimo en npm (`@voulti/checkout`: createInvoice/getInvoice/webhook verify) o doctrina explícita "no SDK, es solo REST" bien documentada. Hoy no hay ningún paquete publicado (`packages/shared` es private).
- [x] READMEs de apps reescritos (12 jul): marca Voulti, 5 mainnets, frase canónica GEO idéntica en los tres, endpoints actuales (reference, webhook firmado, webhook-secret) y links a skill/llms.txt.
- [ ] Documentación pública de la API en el sitio (hoy vive en `apps/api/docs/FRONTEND_INTEGRATION.md` y la página in-app Developers).

## Calidad

- [ ] CI para apps y API (hoy solo `contracts/payouts` tiene workflow).
- [ ] Tests del backend (`apps/api` sin suites).
- [ ] Limpiar `apps/api/src/routes/invoices.ts.backup`.

## Mantenimiento

- [ ] Skill duplicado: `skills/voulti/SKILL.md` ↔ `apps/checkout/public/skill.md`. Al editar uno, copiar al otro.
