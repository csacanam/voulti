# TODO — crecimiento y distribución para agentes/devs

Contexto: Voulti tiene la tesis agent más fuerte del portafolio ("tu agente puede cobrar en crypto" — API REST pública sin auth) pero la superficie developer empaquetable era casi inexistente. Estado al 12 jul 2026. Hecho ya: ✅ skill instalable (`npx skills add csacanam/voulti`), ✅ skill.md web ampliado (webhook, estados, errores), ✅ llms.txt en voulti.com.

## Distribución

- [ ] **Demo en X** — el de mayor potencial del portafolio: "mi agente de Claude cobró $5 USDC por un servicio — 3 prompts", con el link de checkout real pagándose en video y `npx skills add csacanam/voulti` en el post.
- [ ] PRs a awesome-lists (awesome-celo, listas de crypto payments / MiniPay).
- [ ] Considerar MCP server con tools `create_invoice` / `check_payment` (distribución dentro de Claude/Cursor).
- [ ] Registro ERC-8004 (opcional, si se posiciona como servicio para agentes): registry `0x8004A169…` en Celo/Base; modelo: comprabtc.

## Hallazgos del test de claridad con agente fresco (12 jul — skill ya corregido)

- [ ] Campo `reference`/`memo` en invoices — sin él, quien cobra a varios clientes debe llevar el mapeo invoice↔cliente por fuera.
- [ ] Documentar firma/secreto del webhook (hoy el integrador no puede verificar autenticidad del POST).
- [ ] Publicar schemas de respuesta de la API (el doc decía `invoice_id` pero el campo real es `data.id` — ya corregido en el skill).
- [ ] Modo sandbox/test — hoy la única forma de probar una integración es con dinero real.
- [ ] API de creación de comercios (multi-tenant) — hoy el signup es manual en app.voulti.com, lo que hace posible "mi plataforma cobra a mis clientes" pero NO "plataforma donde cada usuario mío cobra" (marketplaces).

## Developer experience

- [ ] Decidir: publicar SDK mínimo en npm (`@voulti/checkout`: createInvoice/getInvoice/webhook verify) o doctrina explícita "no SDK, es solo REST" bien documentada. Hoy no hay ningún paquete publicado (`packages/shared` es private).
- [ ] **READMEs de apps desactualizados**: `apps/checkout/README.md` y `apps/api/README.md` aún dicen "Deramp" y Celo Alfajores testnet; `apps/merchant` describe "PYUSD instant payouts". Alinear con el README raíz (5 mainnets, marca Voulti). Restan en GEO (los LLMs leen los READMEs).
- [ ] Documentación pública de la API en el sitio (hoy vive en `apps/api/docs/FRONTEND_INTEGRATION.md` y la página in-app Developers).

## Calidad

- [ ] CI para apps y API (hoy solo `contracts/payouts` tiene workflow).
- [ ] Tests del backend (`apps/api` sin suites).
- [ ] Limpiar `apps/api/src/routes/invoices.ts.backup`.

## Mantenimiento

- [ ] Skill duplicado: `skills/voulti/SKILL.md` ↔ `apps/checkout/public/skill.md`. Al editar uno, copiar al otro.
