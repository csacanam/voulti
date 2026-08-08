---
name: voulti
description: Accept crypto payments (USDC, USDT and stablecoins) on Celo, Base, Arbitrum, Polygon and BSC with a no-auth REST API. Create an invoice with one POST, share a hosted checkout link, and confirm payment via polling or webhook. Use when a merchant or agent needs to charge in crypto, generate a payment link, sell something for stablecoins, or add crypto checkout to an app. 1% fee, instant self-custody settlement.
---

# Voulti — Accept Crypto Payments

You help merchants (or agents selling services) accept crypto payments: USDC, USDT and stablecoin variants on 5 networks — Celo, Base, Arbitrum, Polygon, BSC. 1% fee, instant settlement, self-custody (funds go straight to the merchant's wallet).

**API base:** `https://api.voulti.com` — integration endpoints require **no API key and no authentication**.
**Machine-readable index:** `https://voulti.com/llms.txt`

**IMPORTANT:** Never invent a `commerce_id`, amount, or currency. If the human hasn't provided them, ask. Amounts are always in a fiat currency you state explicitly per invoice, never in crypto.

---

## Setup (once, human in the loop)

1. Send your human to **https://app.voulti.com** — sign up with email or wallet, ~1 minute. They pick a currency for their dashboard totals, but that does **not** limit what they can charge in: you choose the currency on every invoice.
2. Ask them to open **Receive Payments → Developers** and give you their `commerce_id`.
3. Optional: they can set a `confirmation_url` (webhook) in the same page to get notified on every payment. That page also holds the **webhook signing secret** — ask for it at the same time if you are going to verify signatures (you should; see below). It must reach your server as a secret, not live in client code.

**Call the API from a server, never from the browser.** The endpoints need no key, but `api.voulti.com` does not send CORS headers for third-party origins, so a `fetch` from page JavaScript is blocked. Server-side is also where you want invoice creation anyway: the amount is decided by your code, not by whoever has the page open.

---

## Charge someone

### Option A — Invoice with a fixed amount

```
POST https://api.voulti.com/invoices
Content-Type: application/json

{ "commerce_id": "<commerce_id>", "amount_fiat": 50, "currency": "USD" }
```

**`currency` is required and you pick it per invoice.** A merchant is not tied to one: `50` + `"USD"` is fifty dollars, `50` + `"COP"` is fifty pesos, and the same merchant can issue both. Supported: `USD`, `EUR`, `COP`, `ARS`, `BRL`, `MXN` — anything else is rejected with `400` listing the valid ones. It only decides the unit the payer sees quoted; settlement is in stablecoins regardless.

**Ask the human which currency the price is in — never guess.** Charging 50 in the wrong currency is a real mispricing, not a formatting detail.

The merchant's own `currency` (from `GET /commerces/<id>`) is only the unit their dashboard totals are displayed in. It is **not** a default for your invoices and reading it is not a substitute for asking. `GET https://api.voulti.com/commerces/<commerce_id>` is public, needs no auth, and is still useful for the symbol, the limits, and to confirm the `commerce_id` is real:

```json
{ "success": true, "data": { "id": "...", "name": "Peewah", "currency": "COP",
  "currency_symbol": "$", "supported_tokens": ["USDC","USDT"],
  "min_amount": null, "max_amount": null } }
```

Call it once before charging: it confirms the currency, gives you a symbol for your UI, and exposes any `min_amount`/`max_amount` limits (`null` means unbounded). It also doubles as a check that the `commerce_id` is real before you build a whole flow on it.

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

A past or unparseable `expires_at` is rejected with `400` (`"expires_at must be in the future"` / `"must be a valid ISO 8601 date"`), so you cannot accidentally hand a payer a link that was dead on arrival. There is **no maximum**, though: a date ten years out is accepted without complaint. Prefer a window you would actually honour — a link that stays payable for a year is a link whose price is a year stale.

The payer connects any wallet (or MiniPay) and pays in the stablecoin/network of their choice; Voulti handles conversion and settlement.

**Two optional text fields, and they are not interchangeable:**

| Field | Who sees it | What it is for |
|---|---|---|
| `reference` (≤ 200 chars) | **Only you.** Never shown to the payer. | Your own order id or client name. Comes back in the invoice responses and the webhook, so you can match a payment to your system. |
| `description` (≤ 300 chars) | **The payer**, on the checkout, under the amount. | What is being bought — "October subscription", "Table 4". An amount on its own asks someone to send money without saying what for. |

Putting an order id in `description` shows the payer a string that means nothing to them; putting a human phrase in `reference` leaves you unable to match it to anything. Send both:

```json
{ "commerce_id": "...", "amount_fiat": 150, "currency": "USD",
  "reference": "ord_8814", "description": "Logo design — 50% deposit" }
```

Both come back on `POST /invoices` and in the webhook payload. Neither is searchable, so keep your own id → invoice mapping at creation time.

### Option B — Permanent link (payer chooses the amount)

```
https://voulti.com/pay/<commerce_id>?currency=USD
```

Good for tips, donations, or "pay what you owe" flows. No API call needed — the payer types an amount and the invoice is created for them.

**Always include `?currency=`.** It takes any of the supported codes and the payer types the amount in it. Omit it and the payer is shown a currency picker with nothing pre-selected — they cannot continue until they choose, because a link that never stated a unit has no unit to infer, and USD against COP is three orders of magnitude. That fallback is a safety net for a hand-edited URL, not a mode to build on: a link you generate should always carry the code. The code is validated server-side against the same whitelist as every invoice, so editing the URL by hand cannot invent a currency.

The same merchant can hand out one link per audience — `?currency=EUR` abroad, `?currency=COP` at home — without changing anything account-wide.

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
  "status": "Paid", "expires_at": "...", "paid_at": "...", "amount_usd": "0.31",
  "usd_to_fiat_rate": 3181.1, "commerce_name": "...", "commerce_wallet": "0x…",
  "paid_tx_hash": "0x…", "paid_token": "USDT", "paid_network": "celo",
  "paid_amount": 0.31471, "wallet_address": "0x…", "description": "Logo design", "tokens": [ … ] }
```

**`reference` and `created_at` are not on this response.** `reference` comes back on `POST /invoices` and in the webhook payload, but `GET /invoices/<id>` does not echo it — so you cannot use it to identify an invoice you fetched by id, and there is no way to search by it. Store your own id → invoice mapping at creation time. Likewise, capture `created_at` from the POST response if you need it; the GET will not give it back.

`status` transitions: `Pending` → `Paid`, `Expired` or `Refunded` — **and `Expired` → `Refunded`**. Only `Paid` and `Refunded` are truly final.

> ⚠️ **`Expired` is not the end of the story.** Voulti watches the deposit address for 24h after expiry, so an invoice you already saw as `Expired` can flip to `Refunded` later, when late funds arrive and are sent back. If your poller stops re-checking on `Expired`, you will never learn the payer actually paid — and they *will* contact the merchant saying so. Keep re-checking expired invoices for 24h, or rely on the webhook, which fires again on the flip.

| Status | Meaning |
|---|---|
| `Paid` | Settled on-chain. The funds are in the merchant's wallet. This is the only status that means "release the goods". Final. |
| `Expired` | The time limit passed and nothing had arrived *yet*. May still become `Refunded` within 24h. |
| `Refunded` | Money reached the deposit address but never settled — it arrived after expiry, or too late to complete. Voulti returned it to the sending address automatically. **The merchant receives nothing**, so treat it like `Expired` for fulfilment, but expect the payer to say they paid: they did, and they already have it back. |

Note `paid_amount` is the **crypto** amount actually transferred (e.g. `0.31471` USDT), not the fiat total — compare `amount_fiat` if you need to verify the price. Poll every few seconds while the payer is at checkout; if the link was sent for later (chat/email), check when the payer says they paid — or rely on the webhook. Never reuse an expired link; create a new invoice instead.

**Where the money lands (tell your human this):** Voulti never holds funds. Settlement is instant and self-custody — the crypto goes straight to the **wallet configured in the merchant account at signup** (visible in the dashboard), minus the 1% fee. Voulti does not "deposit" anything later; the merchant's own wallet balance is the source of truth.

### Webhook (recommended for production)

If the merchant configured `confirmation_url`, Voulti POSTs there a **bare** JSON body (no `{success, data}` wrapper):

```json
{ "invoice_id": "4310057f-3150-42c9-8099-244c494f87bf", "amount_fiat": 1000,
  "fiat_currency": "COP", "status": "Paid", "paid_at": "2026-08-07T05:51:30.771+00:00",
  "paid_tx_hash": "0xfbff…afe11", "paid_token": "USDT", "paid_network": "celo",
  "paid_amount": 0.31471, "reference": "ord_9db61d37" }
```

> ⚠️ **The invoice id is `invoice_id` here, not `id`.** `GET /invoices/<id>` returns it as `id`; the webhook calls it `invoice_id`. Destructuring `{ id }` from this body gets `undefined` and — since you look the order up by it — silently fails every delivery. There is no `commerce_id` in the payload either, so if you serve several merchants, map them by the invoice ids you stored at creation.

Deduplicate on `invoice_id` plus `status`: there is no delivery id or attempt counter, and the same final status can arrive more than once.

**It fires on every final status, not just `Paid`** — `Expired` and `Refunded` arrive here too, so branch on `status` rather than assuming a delivery means money. On `Expired` and `Refunded` the payment fields (`paid_tx_hash`, `paid_amount`, `paid_at`…) are `null`.

**Delivery is batched, not instantaneous.** A background worker sweeps confirmed invoices and posts them, so the webhook lands seconds after settlement rather than the moment the payer's transaction confirms. If a human is watching a screen, poll alongside the webhook — whichever arrives first wins, and both should reach the same end state.

**`Expired` arrives even for invoices nobody ever opened.** A link that was never clicked still becomes `Expired` and still fires a webhook, so you can rely on it to close out abandoned carts. Expiry is detected by a periodic sweep rather than at the exact second, so expect the status to flip up to ~5 minutes after `expires_at`, with the webhook following seconds later. Don't treat a `Pending` invoice as live purely because `expires_at` has not passed yet, and don't treat one as dead the instant it does.

**Your endpoint must be reachable from the public internet.** Voulti calls it from its own servers, so `localhost`, `127.0.0.1`, a private IP, or anything behind a VPN or a firewall will never receive a delivery — and the failure is invisible from your side, because nothing arrives to log. If you are building on a laptop, put it behind a tunnel (`ngrok http 3000`, `cloudflared tunnel`) and give the merchant the public URL. A path that requires the merchant's own auth middleware will also fail: Voulti sends no credentials, so the webhook route must be exempt from whatever protects the rest of the app.

**Check it before you build the rest.** Once the merchant has saved the URL, they can fire a real delivery of each event at it from **Receive Payments → Developers → Test my webhook** in their dashboard. It shows the status code, the round-trip time and your response body, so a `404` from a wrong path or a `401` from your own middleware is visible in seconds instead of after a payment. Those deliveries carry `test: true` and announce no money. Every attempt, real or test, is kept under **Delivery history** in the charge's detail — ask the merchant to read it to you rather than guessing why nothing arrived.

> ⚠️ **Do not test your deduplication against a real invoice id.** If you key your cache on `invoice_id` + `status` and fire a test at yourself using a real charge's id, you poison that key — and the *genuine* delivery that follows is discarded as a duplicate, silently, with a `200` that looks like success. The dashboard's test button avoids this by sending `invoice_id: "00000000-0000-0000-0000-000000000000"`, which cannot collide with anything. A manual resend from the dashboard *is* the same event again and your cache should treat it as a duplicate — that is correct, and it is why the merchant reads Delivery history rather than your logs to confirm a resend went out.

**Retries back off, so a short outage is survivable.** A delivery that does not answer `2xx` within 2 s is retried on this schedule: 1m, 5m, 30m, 2h, 6h, 12h, 24h — 8 attempts spanning about two days. **Your handler must be idempotent**: the same event will arrive more than once whenever a response is slow or lost, and the merchant can also replay it by hand from their dashboard. Match on `invoice_id` and ignore what you have already processed. After the last attempt the invoice leaves the delivery queue for good; only a manual resend brings it back.

**`test: true` means nobody paid.** The merchant can fire any of the three events at their own URL from the dashboard's *Test my webhook* button. Those deliveries are byte-identical to real ones except for a `test: true` field, are signed with the same secret, and carry `invoice_id: "00000000-0000-0000-0000-000000000000"`. Return `2xx` so the merchant sees their endpoint works — and ship nothing. Real deliveries never carry the field at all, so branch on its presence, not on its value.

**Verify the signature.** The `X-Voulti-Signature: t=<unix_seconds>,v1=<hex>` header carries an HMAC-SHA256 of `` `${t}.${rawBody}` `` keyed with the commerce's webhook signing secret. It is present **whenever that commerce has a signing secret configured, and absent when it does not** — so if your handler rejects unsigned deliveries (it should), make sure the merchant actually set a secret, or every delivery will `401` and burn every attempt we make.

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
import { after } from "next/server"; // Next.js 15+; in FastAPI this is BackgroundTasks

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

**Treat the whole payload as untrusted, not just `status`.** It is tempting to re-check the status against the API but still persist `paid_tx_hash`, `paid_amount` or `paid_at` from the body — especially as a fallback when the API returns `null`. Don't. A forged delivery then writes a real-looking transaction hash onto an unpaid invoice, and your dashboard shows a payment that never happened even though the status stayed correct. **Use the body for `invoice_id` and nothing else**; take every other field from the `GET` response.

**Answer `2xx` unless you actually want a retry.** Any non-2xx answer costs one of the **8 attempts** described above, and once the last one is spent the invoice leaves the delivery queue permanently — only a manual resend from the merchant's dashboard brings it back. Return `200` for anything a retry cannot fix (unknown invoice, duplicate delivery, order already handled) and reserve `5xx` for genuinely transient problems. A re-check that throws because of a client-side bug will otherwise burn every attempt across two days and look, from the merchant's side, exactly like an outage.

---

## Errors and edge cases

Failures do **not** use the `{ success, data }` envelope — they come back as `{ "error": "<message>" }` with no `success` field. Read `error` to tell them apart.

| Situation | What to do |
|---|---|
| `404 {"error":"Commerce not found"}` on POST /invoices | The `commerce_id` is wrong — copy it exactly from the Developers page. Note this is a `404`, not a `400`. |
| `400 {"error":"Missing required fields: commerce_id, amount_fiat"}` | One of those two is absent. Note the message names only them: `currency` is required too and has its own error, below. |
| `400 {"error":"currency is required — the price currency is chosen per invoice…"}` | You omitted `currency`. There is no default and the merchant's account currency is deliberately not used as one: inferring a price currency from a display setting is how `50` quietly becomes dollars for one merchant and pesos for another. Ask the human and send it. |
| `400 {"error":"reference must be a string of at most 200 characters"}` | Your own order id got too long, or you sent a number. Both `reference` and `description` must be strings; `description` has its own limit of 300. |
| `400 {"error":"expires_at must be a valid ISO 8601 date"}` | Unparseable timestamp. Send `2026-07-15T00:00:00Z`, not a locale-formatted date, and not a Unix epoch. |
| `400 {"error":"amount_fiat must be a positive number"}` | It has to be a JSON number greater than zero — not a string like `"1000"`, not zero, not negative. |
| `400 {"error":"expires_at must be in the future"}` | You sent a date that has already passed. Send a future ISO 8601 timestamp or omit the field for the 1-hour default. |
| `400 {"error":"Commerce is not enabled on any network…"}` | **You cannot fix this — the human must.** The merchant is not whitelisted on-chain anywhere, so no invoice can be created at all. Send them to app.voulti.com → Account → Networks to enable one. Do not retry in a loop; nothing about your request is wrong. |
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
- Tokens: USDC and USDT variants only. Regional stablecoins (COPm on Celo) are retired: still swept if one is already in flight, but no longer offered on new invoices.
- Fee: 1% per payment, deducted at settlement.
- Rate limit: 100 requests/minute per IP, reported in the `x-ratelimit-*` response headers.
- Envelopes differ by endpoint: `POST /invoices` and `GET /commerces/<id>` wrap in `{ success, data }`; `GET /invoices/<id>` and the webhook payload are bare objects; errors are `{ error }`.
- **There is no public way to list a commerce's invoices** — the only public reads are `GET /invoices/<id>` (one at a time) and `GET /commerces/<id>`. Persist every invoice id you create; you cannot ask for them back later. Building a "who has paid" dashboard means one GET per open invoice, so keep the 100/min limit in mind and stop polling invoices that reached a final status.
- No sandbox or testnet — all 5 networks are mainnet, so an end-to-end payment test costs real money. Keep the test invoice small.
- Contracts: verified proxy architecture on all 5 networks (source: https://github.com/csacanam/voulti).
- Dashboard for the merchant (balance, invoices, payouts): https://app.voulti.com
