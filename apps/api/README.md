# Voulti API

Backend for **Voulti** — a crypto payment gateway for merchants and AI agents: a no-auth REST API to accept USDC, USDT and stablecoins on 5 networks (Celo, Base, Arbitrum, Polygon, BSC) with instant self-custody settlement and a 1% fee.

Fastify + TypeScript + Supabase, serving `api.voulti.com`.

## Core endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `POST /invoices` | none | Create an invoice: `{ commerce_id, amount_fiat, reference?, expires_at? }` → `data.id`. Default expiration: 1 hour |
| `GET /invoices/:id` | none | Invoice status: `Pending` → `Paid` \| `Expired` (includes `paid_tx_hash`, `payment_method`, `reference`) |
| `GET /invoices/by-commerce/:id` | wallet (SIWE) | Merchant's invoice list |
| `PUT /commerces/:id/webhook` | wallet (SIWE) | Set the merchant's `confirmation_url` |
| `GET /commerces/:id/webhook-secret` | wallet (SIWE) | Webhook signing secret (HMAC) |
| `GET /commerces/:id/balances` | none | Aggregated multi-chain balances |

**Webhooks**: on payment, POSTs to the merchant's `confirmation_url` with the invoice payload (`invoice_id`, `amount_fiat`, `status`, `paid_tx_hash`, `reference`, …), signed with `X-Voulti-Signature: t=<unix>,v1=<HMAC-SHA256(secret, t.body)>`, with retries and on-chain verification before notifying.

## Architecture notes

- **Self-custody settlement**: funds go straight to the merchant's wallet through the Deramp proxy contracts (verified on all 5 mainnets — `contracts/core/deployed-addresses/PRODUCTION.md`). Voulti never holds funds.
- **HD-wallet deposits**: pay-by-address flow with automatic deposit detection and sweep (cron-driven — see root README for cron jobs).
- **Notification pipeline**: `src/business/notificationService.ts` — webhook + email confirmations, batched, with blockchain status verification before notifying.
- **DB**: Supabase/Postgres. Canonical schema in `db/schema.sql`, incremental migrations in `db/migrations/` (run in Supabase before deploying code that depends on them).

## Development

```bash
pnpm install
pnpm dev        # nodemon + ts-node
pnpm build && pnpm start
```

Requires Supabase credentials and per-network RPC configuration via environment variables.

## Docs

Integration guides in [`docs/`](docs/) (start at `DOCUMENTATION_INDEX.md`) · Agent guide: [voulti.com/skill.md](https://voulti.com/skill.md) · LLM index: [voulti.com/llms.txt](https://voulti.com/llms.txt) · Root [README](../../README.md).
