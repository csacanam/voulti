# Voulti

Crypto payment gateway for merchants. Accept USDC, USDT and stablecoins on 5 networks.

## Architecture

```
apps/
  checkout/     React + Vite — customer payment page
  merchant/     Next.js — merchant dashboard
  api/          Fastify — backend API

contracts/
  core/         DerampProxy + modules (Hardhat, Solidity ^0.8.28)

packages/
  shared/       Shared utilities
```

## Networks

| Network | Chain ID | Tokens |
|---------|----------|--------|
| Celo | 42220 | USDC, USDT, COPm |
| Arbitrum | 42161 | USDC, USD₮0 |
| Polygon | 137 | USDC, USDT0 |
| Base | 8453 | USDC |
| BSC | 56 | USDC, USDT |

## Features

- **Self-service registration** — merchant connects wallet, names business, done
- **Two payment methods** — Connect Wallet or Pay by Address (QR + deposit)
- **Multi-chain balances** — aggregated by token, network auto-selected
- **Send funds** — withdraw to any wallet from dashboard
- **HD wallet sweep** — automatic deposit detection and settlement
- **Partial/over payment handling** — auto-refund on overpay, wait on partial
- **i18n** — Spanish and English

## Smart Contracts

Modular proxy architecture deployed on 5 networks:

- **DerampProxy** — entry point, routes calls to modules
- **DerampStorage** — centralized data store
- **AccessManager** — roles, token/commerce whitelisting
- **InvoiceManager** — invoice lifecycle
- **PaymentProcessor** — payment execution, fee calculation
- **TreasuryManager** — service fee collection
- **WithdrawalManager** — commerce fund withdrawals

See [contracts/core/deployed-addresses/PRODUCTION.md](contracts/core/deployed-addresses/PRODUCTION.md) for all addresses.

## Operator Wallet

`0x21581Cb82D9a66126fBe7639f4AF55DdfEA48E26` — deploys contracts, whitelists commerces, sends gas for HD wallet sweeps.

## Local Development

```bash
# Prerequisites: Node 18+, pnpm
pnpm install
cd contracts/core && npm install

# Start Hardhat node (terminal 1)
npx hardhat node

# Deploy + setup (terminal 2)
cd contracts/core
npx hardhat run scripts/setup-local.ts --network localhost

# Start API (terminal 3)
pnpm dev:api

# Start checkout (terminal 4)
pnpm dev:checkout

# Start merchant dashboard (terminal 5)
pnpm dev:merchant
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /commerces | Privy | Register commerce |
| GET | /commerces/:id | Public | Commerce info |
| GET | /commerces/:id/balances | Privy | Multi-chain balances |
| POST | /invoices | Privy | Create invoice |
| GET | /invoices/:id | Public | Invoice details + tokens |
| POST | /blockchain/create | Public | Create on-chain invoice |
| GET | /blockchain/status/:id | Public | On-chain invoice status |
| POST | /deposit/generate | Public | Generate HD deposit address |
| GET | /deposit/status/:id | Public | Deposit monitoring status |
| GET | /stats | Public | Revenue stats (building in public) |
| GET | /prices/rates | Public | Fiat + token rates from DB |
| POST | /prices/update-fiat-rates | Cron | Update fiat rates (OpenExchangeRates) |
| POST | /prices/update-token-prices | Cron | Update token prices (CoinGecko) |

## Cron Jobs

Configure these as scheduled jobs in DigitalOcean (or any scheduler):

| Job | URL | Schedule | Description |
|-----|-----|----------|-------------|
| Fiat rates | `POST /prices/update-fiat-rates` | Every hour | Updates USD→COP/EUR/BRL/MXN/ARS rates from OpenExchangeRates |
| Token prices | `POST /prices/update-token-prices` | Every hour | Updates USDC/USDT/COPm rates from CoinGecko |
| Expire invoices | `POST /orders/expire-orders` | Every minute | Marks expired invoices as Expired |
| Process emails | `POST /notifications/process-emails` | Every minute | Sends payment confirmation emails via Resend |
| Process webhooks | `POST /notifications/process-url-confirmations` | Every minute | Calls commerce confirmation URLs |

Base URL: `https://api.voulti.com`

Requires env vars: `OPENEXCHANGERATE_APPID`, `COINGECKO_APIKEY`, `RESEND_APIKEY`.

## Environment Variables

See [.env.example](.env.example) for all required variables.
