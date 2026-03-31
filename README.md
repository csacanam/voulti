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
| POST | /api/commerces | Privy | Register commerce |
| GET | /api/commerces/:id | Public | Commerce info |
| GET | /api/commerces/:id/balances | Privy | Multi-chain balances |
| POST | /api/invoices | Privy | Create invoice |
| GET | /api/invoices/:id | Public | Invoice details + tokens |
| POST | /api/blockchain/create | Public | Create on-chain invoice |
| GET | /api/blockchain/status/:id | Public | On-chain invoice status |
| POST | /api/deposit/generate | Public | Generate HD deposit address |
| GET | /api/deposit/status/:id | Public | Deposit monitoring status |
| GET | /api/stats | Public | Revenue stats (building in public) |

## Environment Variables

See [.env.example](.env.example) for all required variables.
