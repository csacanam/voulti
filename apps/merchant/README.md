# Voulti Merchant Dashboard

Merchant dashboard for **Voulti** — a crypto payment gateway for merchants and AI agents: a no-auth REST API to accept USDC, USDT and stablecoins on 5 networks (Celo, Base, Arbitrum, Polygon, BSC) with instant self-custody settlement and a 1% fee.

This app serves `app.voulti.com`: self-service merchant signup (wallet or email via Privy/SIWE), balances, invoices, payouts, and the **Developers** page.

## What it does

- **Self-service registration**: connect wallet or email, name the business, pick base currency (USD, EUR, COP, ARS, BRL, MXN) — done, you get a `commerce_id`.
- **Receive Payments → Developers**: the integration hub — `commerce_id`, live curl snippets (create invoice with `reference`, check status), webhook URL configuration, and the **webhook signing secret** (reveal/copy) for verifying `X-Voulti-Signature`.
- **Balances & payouts**: aggregated multi-chain balances by token, withdraw to any wallet, cross-chain payouts to local stablecoins via Squid Router (`contracts/payouts`).
- **i18n**: Spanish and English.

## Stack

Next.js + TypeScript + Tailwind + Privy (wallet/email auth with SIWE). Talks to `apps/api` (`api.voulti.com`).

## Development

```bash
pnpm install
pnpm dev        # Next.js on :3001
pnpm build && pnpm start
```

Requires `NEXT_PUBLIC_PRIVY_APP_ID` (from [dashboard.privy.io](https://dashboard.privy.io)) and the API base URL. Deployed on Vercel (`app.voulti.com`).

## Related

Agent guide: [voulti.com/skill.md](https://voulti.com/skill.md) · LLM index: [voulti.com/llms.txt](https://voulti.com/llms.txt) · Root [README](../../README.md).
