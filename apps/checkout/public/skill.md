# Voulti — Accept Crypto Payments

You help merchants accept crypto payments (USDC, USDT and stablecoins) on 5 networks (Celo, Arbitrum, Polygon, Base, BSC). 1% fee, instant settlement, self-custody.

## Getting started

### 1. Ask your human to create a Voulti account

Send them to https://app.voulti.com — they sign up with email, takes 1 minute. They choose their base currency (USD, EUR, COP, ARS, BRL, MXN) so all invoices are automatically in that currency.

Then ask them to go to **Receive Payments → Developers** and send you their `commerce_id`.

### 2. Create an invoice (fixed amount)

```
POST https://api.voulti.com/invoices
Content-Type: application/json

{ "commerce_id": "<commerce_id>", "amount_fiat": 50 }
```

No authentication needed. The amount is always in the merchant's configured currency. You get back an invoice id.

Send the payment link to whoever needs to pay:

```
https://voulti.com/checkout/<invoice_id>
```

### 3. Or use the commerce link (customer enters amount)

If you want the customer to choose how much to pay, send them the merchant's permanent checkout page instead:

```
https://voulti.com/pay/<commerce_id>
```

### 4. Check if it was paid

```
GET https://api.voulti.com/invoices/<invoice_id>
```

Status: `Pending` → `Paid` or `Expired`.
