# Voulti Checkout

Customer-facing payment page for **Voulti** — a crypto payment gateway for merchants and AI agents: a no-auth REST API to accept USDC, USDT and stablecoins on 5 networks (Celo, Base, Arbitrum, Polygon, BSC) with instant self-custody settlement and a 1% fee.

This app serves `voulti.com`: the landing page, the hosted checkout (`/checkout/:invoice_id`), the permanent merchant payment page (`/pay/:commerce_id`), and the agent/LLM surfaces (`/skill.md`, `/llms.txt`).

## What it does

- **Hosted checkout**: the payer opens an invoice link, connects any wallet (MetaMask, MiniPay, Valora…) or pays by deposit address (QR), picks token + network, and pays. Voulti handles conversion and settles straight to the merchant's wallet.
- **Two payment methods**: Connect Wallet (approve + pay against the on-chain contracts) or Pay by Address (HD-wallet deposit detection and sweep).
- **Partial/over payment handling**: auto-refund on overpayment, wait state on partial.
- **i18n**: Spanish and English.

## Stack

React + Vite + TypeScript + Tailwind, ethers/wagmi for on-chain interaction. Talks to the backend at `apps/api` (`api.voulti.com`) and the Deramp proxy contracts deployed on all 5 mainnets (see `contracts/core/deployed-addresses/PRODUCTION.md`).

## Development

```bash
pnpm install
pnpm dev        # Vite dev server
pnpm build      # production build
```

Deployed on Vercel (`voulti.com` / `www.voulti.com`).

## Integration (for developers and agents)

You don't integrate this app directly — you create invoices against the API and send payers here:

```bash
curl -X POST https://api.voulti.com/invoices \
  -H "Content-Type: application/json" \
  -d '{"commerce_id":"<id>","amount_fiat":50,"reference":"order-123"}'
# → data.id → send the payer to https://voulti.com/checkout/<data.id>
```

Full guides: [`/skill.md`](https://voulti.com/skill.md) (AI agents) · [`/llms.txt`](https://voulti.com/llms.txt) (LLM index) · Developers page in the [merchant dashboard](https://app.voulti.com) · root [README](../../README.md).
