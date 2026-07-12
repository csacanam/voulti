---
name: voulti
description: Accept crypto payments (USDC, USDT and stablecoins) on Celo, Base, Arbitrum, Polygon and BSC with a no-auth REST API. Create an invoice with one POST, share a hosted checkout link, and confirm payment via polling or webhook. Use when a merchant or agent needs to charge in crypto, generate a payment link, sell something for stablecoins, or add crypto checkout to an app. 1% fee, instant self-custody settlement.
---

# Voulti — Accept Crypto Payments

You help merchants (or agents selling services) accept crypto payments: USDC, USDT and stablecoin variants on 5 networks — Celo, Base, Arbitrum, Polygon, BSC. 1% fee, instant settlement, self-custody (funds go straight to the merchant's wallet).

**API base:** `https://api.voulti.com` — integration endpoints require **no API key and no authentication**.
**Machine-readable index:** `https://voulti.com/llms.txt`

**IMPORTANT:** Never invent a `commerce_id`, amount, or currency. If the human hasn't provided them, ask. Amounts are always in the merchant's configured base currency, not in crypto.

---

## Setup (once, human in the loop)

1. Send your human to **https://app.voulti.com** — sign up with email or wallet, ~1 minute. They pick their base currency (USD, EUR, COP, ARS, BRL, MXN); every invoice is denominated in it and converted to crypto at checkout.
2. Ask them to open **Receive Payments → Developers** and give you their `commerce_id`.
3. Optional: they can set a `confirmation_url` (webhook) in the same page to get notified on every payment.

---

## Charge someone

### Option A — Invoice with a fixed amount

```
POST https://api.voulti.com/invoices
Content-Type: application/json

{ "commerce_id": "<commerce_id>", "amount_fiat": 50 }
```

Response includes the `invoice_id`. Send the payer this link:

```
https://voulti.com/checkout/<invoice_id>
```

The payer connects any wallet (or MiniPay) and pays in the stablecoin/network of their choice; Voulti handles conversion and settlement.

### Option B — Permanent link (payer chooses the amount)

```
https://voulti.com/pay/<commerce_id>
```

Good for tips, donations, or "pay what you owe" flows. No API call needed.

---

## Confirm the payment

### Polling

```
GET https://api.voulti.com/invoices/<invoice_id>
```

`status` transitions: `Pending` → `Paid` or `Expired`. Poll every few seconds while the payer is at checkout; treat `Expired` as final (create a new invoice to retry).

### Webhook (recommended for production)

If the merchant configured `confirmation_url`, Voulti POSTs there on payment with `invoice_id`, `amount_fiat`, `status` and `paid_tx_hash`. Always verify the invoice with a `GET /invoices/<invoice_id>` before releasing goods — don't trust the webhook body alone.

---

## Errors and edge cases

| Situation | What to do |
|---|---|
| `400` on POST /invoices | Check `commerce_id` (exact string from the Developers page) and that `amount_fiat` is a positive number. |
| Invoice `Expired` | Invoices have a time limit. Create a fresh one; never reuse expired links. |
| Payment shows on-chain but status is `Pending` | Wait — confirmation follows the chain's finality. If it persists minutes, tell the human to check app.voulti.com. |
| Refunds | Settlement is self-custody: refunds are a manual transfer from the merchant's wallet. Voulti does not hold funds. |

---

## Facts

- Networks: Celo (42220), Base (8453), Arbitrum One (42161), Polygon (137), BSC (56) — all mainnet.
- Tokens: USDC, USDT variants, and regional stablecoins (e.g. COPm on Celo).
- Fee: 1% per payment, deducted at settlement.
- Contracts: verified proxy architecture on all 5 networks (source: https://github.com/csacanam/voulti).
- Dashboard for the merchant (balance, invoices, payouts): https://app.voulti.com
