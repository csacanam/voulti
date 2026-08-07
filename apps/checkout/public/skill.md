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
3. Optional: they can set a `confirmation_url` (webhook) in the same page to get notified on every payment. That page also holds the **webhook signing secret** — ask for it at the same time if you are going to verify signatures (you should; see below). It must reach your server as a secret, not live in client code.

**Call the API from a server, never from the browser.** The endpoints need no key, but `api.voulti.com` does not send CORS headers for third-party origins, so a `fetch` from page JavaScript is blocked. Server-side is also where you want invoice creation anyway: the amount is decided by your code, not by whoever has the page open.

---

## Charge someone

### Option A — Invoice with a fixed amount

```
POST https://api.voulti.com/invoices
Content-Type: application/json

{ "commerce_id": "<commerce_id>", "amount_fiat": 50 }
```

`amount_fiat` is in the merchant's base currency — **confirm which currency their account uses before charging** (`50` means $50 USD or 50 COP depending on their setup; the response tells you via `fiat_currency`).

Response (`201`):

```json
{ "success": true, "data": { "id": "<invoice_id>", "commerce_id": "...", "amount_fiat": 50,
  "fiat_currency": "USD", "status": "Pending", "expires_at": "...", "created_at": "..." } }
```

The invoice id is **`data.id`**. Send the payer this link:

```
https://voulti.com/checkout/<invoice_id>
```

**Expiration:** invoices expire in **1 hour** by default. If the payer won't pay right away, pass a custom `expires_at` (ISO 8601) when creating: `{ "commerce_id": "...", "amount_fiat": 150, "expires_at": "2026-07-15T00:00:00Z" }` — or use the permanent link (Option B) for slow payers.

The payer connects any wallet (or MiniPay) and pays in the stablecoin/network of their choice; Voulti handles conversion and settlement.

**Charging several clients?** Pass an optional `reference` (string, ≤ 200 chars) when creating the invoice — your own order id, client name, or memo. It comes back in the invoice responses and in the webhook payload, so you always know who paid what:

```json
{ "commerce_id": "...", "amount_fiat": 150, "reference": "andres-logo-2026" }
```

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

> ⚠️ **The response envelope is not the same as on POST.** `POST /invoices`
> wraps the invoice in `{ "success": true, "data": {…} }`, but
> `GET /invoices/<id>` returns the invoice object **bare, at the top level** —
> there is no `data` field to read. A client that assumes one shape for both
> silently gets `undefined` and, if it does this inside a webhook handler, can
> fail every delivery. Read `id`/`status` directly here, `data.id`/`data.status`
> on create.

```json
{ "id": "<invoice_id>", "commerce_id": "...", "amount_fiat": 50, "fiat_currency": "USD",
  "status": "Paid", "expires_at": "...", "paid_at": "...", "payment_method": "address",
  "paid_tx_hash": "0x…", "paid_token": "USDT", "paid_network": "celo",
  "paid_amount": 0.31471, "reference": "...", "tokens": [ … ] }
```

`status` transitions: `Pending` → `Paid`, `Expired` **or `Refunded`**. All three are final.

| Status | Meaning |
|---|---|
| `Paid` | Settled on-chain. The funds are in the merchant's wallet. This is the only status that means "release the goods". |
| `Expired` | The time limit passed and nothing was received. |
| `Refunded` | Money reached the deposit address but never settled — it arrived after expiry, or too late to complete. Voulti returned it to the sending address automatically. **The merchant receives nothing**, so treat it like `Expired` for fulfilment, but expect the payer to say they paid: they did, and they already have it back. |

Note `paid_amount` is the **crypto** amount actually transferred (e.g. `0.31471` USDT), not the fiat total — compare `amount_fiat` if you need to verify the price. Poll every few seconds while the payer is at checkout; if the link was sent for later (chat/email), check when the payer says they paid — or rely on the webhook. Never reuse an expired link; create a new invoice instead.

**Where the money lands (tell your human this):** Voulti never holds funds. Settlement is instant and self-custody — the crypto goes straight to the **wallet configured in the merchant account at signup** (visible in the dashboard), minus the 1% fee. Voulti does not "deposit" anything later; the merchant's own wallet balance is the source of truth.

### Webhook (recommended for production)

If the merchant configured `confirmation_url`, Voulti POSTs there with `invoice_id`, `amount_fiat`, `fiat_currency`, `status`, `paid_tx_hash`, `paid_token`, `paid_network`, `paid_amount`, `paid_at` and `reference`.

**It fires on every final status, not just `Paid`** — `Expired` and `Refunded` arrive here too, so branch on `status` rather than assuming a delivery means money. On `Expired` and `Refunded` the payment fields (`paid_tx_hash`, `paid_amount`, `paid_at`…) are `null`.

**Delivery is batched, not instantaneous.** A background worker sweeps confirmed invoices and posts them, so the webhook lands seconds after settlement rather than the moment the payer's transaction confirms. If a human is watching a screen, poll alongside the webhook — whichever arrives first wins, and both should reach the same end state.

**`Expired` arrives even for invoices nobody ever opened.** A link that was never clicked still becomes `Expired` and still fires a webhook, so you can rely on it to close out abandoned carts. Expiry is detected by a periodic sweep rather than at the exact second, so expect the status to flip up to ~5 minutes after `expires_at`, with the webhook following seconds later. Don't treat a `Pending` invoice as live purely because `expires_at` has not passed yet, and don't treat one as dead the instant it does.

**Verify the signature.** Signed webhooks carry an `X-Voulti-Signature: t=<unix>,v1=<hex>` header — HMAC-SHA256 of `` `${t}.${rawBody}` `` with the commerce's webhook signing secret:

```js
import { createHmac, timingSafeEqual } from "crypto";

function verifyVoultiWebhook(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader) return false;
  const { t, v1 } = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("="))
  );
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false; // replay guard

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(a, b);
}
```

Pass the **raw** body, not the re-serialized JSON — `JSON.stringify(JSON.parse(body))` changes the bytes and the signature will never match.

**You have ~2 seconds to respond — and the confirming `GET` alone takes longer than that budget allows.** Voulti aborts the delivery after roughly 2s and counts it as a failure. That is not enough room to call `GET /invoices/<id>` *before* replying: measured against production the round-trip is **1.2–1.8s** on its own, and any tunnel, cold start or database write on top of it pushes you over. A handler that is otherwise completely correct will sit in a retry loop for this reason alone, and the merchant will get failure emails that look like an outage.

So split it in two: **verify the signature, respond `200`, and do the re-check and fulfilment after the response is sent** — `after()` in Next.js, `BackgroundTasks` in FastAPI, or a queue. The signature check stays *before* the `200`, so an unauthenticated call is never acknowledged.

```js
export async function POST(req) {
  const rawBody = await req.text();
  if (!verifyVoultiWebhook(rawBody, req.headers.get("x-voulti-signature"), secret)) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }
  after(() => fulfill(JSON.parse(rawBody))); // re-check + deliver goods, off the critical path
  return Response.json({ received: true });  // well inside the 2s budget
}
```

Defense in depth still applies: even with a valid signature, confirm with `GET /invoices/<invoice_id>` before releasing goods — just do it *after* you have answered, minding the envelope difference above. If that deferred work fails, the invoice stays unfulfilled and polling will catch it; nothing is released on an unverified webhook either way.

**Answer `2xx` unless you actually want a retry.** Voulti retries up to **5 times** on any non-2xx response and emails the merchant on every failure; once the 5th is spent the invoice leaves the delivery queue permanently. Return `200` for anything a retry cannot fix (unknown invoice, duplicate delivery, order already handled) and reserve `5xx` for genuinely transient problems. A re-check that throws because of a client-side bug will otherwise burn all five attempts and look, from the merchant's inbox, exactly like an outage.

---

## Errors and edge cases

Failures do **not** use the `{ success, data }` envelope — they come back as `{ "error": "<message>" }` with no `success` field. Read `error` to tell them apart.

| Situation | What to do |
|---|---|
| `404 {"error":"Commerce not found"}` on POST /invoices | The `commerce_id` is wrong — copy it exactly from the Developers page. Note this is a `404`, not a `400`. |
| `400 {"error":"Missing required fields: commerce_id, amount_fiat"}` | Both fields are required; `amount_fiat` must be a positive number. |
| `404 {"error":"Invoice not found"}` on GET | Wrong or mistyped invoice id. |
| `429` / requests suddenly rejected | You are over the **100 requests per minute per IP** limit. Watch the `x-ratelimit-remaining` header and back off; poll one invoice every few seconds, not every invoice every second. |
| Invoice `Expired` | Invoices have a time limit. Create a fresh one; never reuse expired links. |
| Payment shows on-chain but status is `Pending` | Wait — confirmation follows the chain's finality. If it persists minutes, tell the human to check app.voulti.com. |
| Payer sent to the deposit address **after** the invoice expired | Voulti keeps watching that address for 24h and returns the funds to the sending address. The invoice becomes `Refunded`, not `Paid` — a late payment is never credited. Tell the payer to expect the money back and use a fresh invoice. |
| Invoice went `Refunded` | Nothing settled, so nothing is owed to the merchant. The payer has already been repaid automatically; no action needed beyond not fulfilling the order. |
| Refunding a **completed** sale (`Paid`) | Voulti never holds funds — a settled payment is already in the merchant's wallet, so reversing it is a manual transfer they make themselves. Only unsettled deposits are returned automatically. |

---

## Facts

- Networks: Celo (42220), Base (8453), Arbitrum One (42161), Polygon (137), BSC (56) — all mainnet.
- Tokens: USDC, USDT variants, and regional stablecoins (e.g. COPm on Celo).
- Fee: 1% per payment, deducted at settlement.
- Rate limit: 100 requests/minute per IP, reported in the `x-ratelimit-*` response headers.
- Envelopes differ by endpoint: `POST /invoices` wraps in `{ success, data }`; `GET /invoices/<id>` and the webhook payload are bare objects; errors are `{ error }`.
- No sandbox or testnet — all 5 networks are mainnet, so an end-to-end payment test costs real money. Keep the test invoice small.
- Contracts: verified proxy architecture on all 5 networks (source: https://github.com/csacanam/voulti).
- Dashboard for the merchant (balance, invoices, payouts): https://app.voulti.com
