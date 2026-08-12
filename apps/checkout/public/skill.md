---
name: voulti
description: Accept crypto payments (USDC, USDT and stablecoins) on Celo, Base, Arbitrum, Polygon and BSC with a no-auth REST API. Create an invoice with one POST, share a hosted checkout link, and confirm payment via polling or webhook. Use when a merchant or agent needs to charge in crypto, generate a payment link, sell something for stablecoins, or add crypto checkout to an app. 1% fee, settled on-chain to a balance the merchant withdraws.
---

# Voulti — Accept Crypto Payments

You help merchants (or agents selling services) accept crypto payments: USDC, USDT and stablecoin variants on 5 networks — Celo, Base, Arbitrum, Polygon, BSC. 1% fee, settled on-chain into a balance the merchant withdraws from their dashboard — **not** straight to their wallet. See "Where the money actually is" before telling anyone where to look for their money.

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
  "fiat_currency": "USD", "status": "Pending", "expires_at": "...", "created_at": "...",
  "reference": null, "description": null, "return_url": null } }
```

The invoice id is **`data.id`**. Send the payer this link:

```
https://voulti.com/checkout/<invoice_id>
```

**Expiration:** invoices expire in **1 hour** by default. If the payer won't pay right away, pass a custom `expires_at` (ISO 8601) when creating: `{ "commerce_id": "...", "amount_fiat": 150, "currency": "USD", "expires_at": "2026-07-15T00:00:00Z" }` — or use the permanent link (Option B) for slow payers.

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

#### Sending the payer back to your site — `return_url`

Without it the payer finishes on Voulti's page and has no way back to you. Pass `return_url` when creating the invoice and Voulti sends them to it once the invoice reaches a final status:

```json
{ "commerce_id": "...", "amount_fiat": 150, "currency": "USD",
  "return_url": "https://yourdomain.com/orders/8814/thanks?invoice={invoice_id}" }
```

`{invoice_id}` is substituted with the real id. Use it — without it the payer arrives and you have no idea which invoice they just paid, and any state you kept in their session is gone the moment they finish paying on a different device than they started on.

> ⚠️ **The domain must be authorised first, or you get a `400`.** Ask the merchant to add it under **Receive Payments → Developers → Return domains** *before* you send this field. A commerce with no domains configured refuses every `return_url` — that is the default, not a misconfiguration.
>
> This exists because `POST /invoices` needs no credentials and the `commerce_id` is public (it is in the address bar of every `/pay/` link). Without the check, anyone could create an invoice against a merchant and point the payer at a site of their choosing, on Voulti's domain and under that merchant's name. The allowlist can only be edited by the merchant signed into their dashboard, which is what makes it worth anything.

Matching is by domain: an entry of `yourdomain.com` also accepts `www.yourdomain.com` and `shop.yourdomain.com`, but not `notyourdomain.com`. `https` only, except `localhost` for local development. Rejections come back as `400` with a `code` of `return_url:no-allowlist` or `return_url:host-not-allowed`, so you can tell "the merchant has not set this up" apart from "I sent the wrong host".

**Timing:** the redirect fires at the final status, not when the payer signs. Signing is not settlement — redirecting there would land them on your page while the chain is still confirming, and you would show them "pending" anyway. A paid invoice redirects on a short countdown; expired and refunded ones only offer a button, so the payer can read what happened.

> ⚠️ **Never trust the landing URL as proof of payment.** The payer controls their address bar, so anyone can open your thank-you page with any invoice id in it. Before you release anything of value there — a download, a certificate, a licence key — call `GET /invoices/<invoice_id>` and check `status` is `Paid`. This is the same rule as the webhook section below, and it matters more here, because a page that hands out something valuable is a page someone has a reason to forge their way into.

**Building the page.** It gets one query parameter and must decide everything else for itself. Note it has to handle **all three** final statuses, not just `Paid`: expired and refunded invoices show the payer a button back to you as well, so they can and will arrive here having paid nothing.

```tsx
// app/orders/[id]/thanks/page.tsx
export default async function Thanks({ searchParams }) {
  const { invoice } = await searchParams

  // Bare object, no { success, data } wrapper on this endpoint.
  const res = await fetch(`https://api.voulti.com/invoices/${invoice}`, { cache: "no-store" })
  if (!res.ok) return <p>We could not find that payment.</p>
  const { status, paid_amount, paid_token, paid_tx_hash } = await res.json()

  // The only branch that may release anything. Everything the payer is told
  // below comes from this response, never from the URL they arrived with.
  if (status === "Paid") {
    return <Certificate amount={paid_amount} token={paid_token} tx={paid_tx_hash} />
  }

  // Reached the address but arrived too late; Voulti already sent it back.
  // The payer genuinely paid, so do not tell them nothing happened.
  if (status === "Refunded") return <p>Your payment arrived late and has been returned.</p>

  if (status === "Expired") return <p>This charge expired. <a href="/checkout">Start again</a></p>

  // Pending: they opened the link by hand, or reloaded it early.
  return <p>We have not received this payment yet.</p>
}
```

**Do not fulfil here.** This page runs when a browser happens to load it — a payer who closes the tab on the redirect never triggers it, and one who refreshes triggers it five times. Fulfil from the webhook, which retries for two days and does not depend on anyone's browser, and let this page only *report* what the webhook already recorded. Reading it as the confirmation and shipping from it is how an order goes unfilled because someone's phone died on the redirect.

`cache: "no-store"` is not decoration: a framework that caches this fetch will show the next payer the previous one's status.

### Option B — Permanent link (payer chooses the amount)

```
https://voulti.com/pay/<commerce_id>?currency=USD
```

Good for tips, donations, or "pay what you owe" flows. No API call needed — the payer types an amount and the invoice is created for them.

**Always include `?currency=`.** It takes any of the supported codes and the payer types the amount in it. Omit it and the payer is shown a currency picker with nothing pre-selected — they cannot continue until they choose, because a link that never stated a unit has no unit to infer, and USD against COP is three orders of magnitude. That fallback is a safety net for a hand-edited URL, not a mode to build on: a link you generate should always carry the code. The code is validated server-side against the same whitelist as every invoice, so editing the URL by hand cannot invent a currency.

The same merchant can hand out one link per audience — `?currency=EUR` abroad, `?currency=COP` at home — without changing anything account-wide.

---

### Cancelling a charge nobody paid

```
PUT https://api.voulti.com/invoices/<invoice_id>/status
{ "status": "Expired" }
```

The one write on an invoice a merchant may make, and the only one. It needs the merchant's dashboard session, not the no-auth access the rest of this file uses, so **you cannot call it from an integration** — and that is a limit of the current design, not an oversight you can work around. Every other endpoint here is unauthenticated and identified only by `commerce_id`, which is public; a cancel endpoint on those terms would let anyone with a charge link kill anyone's payment. Until there are API keys, cancelling stays behind the dashboard.

**So do not design a flow that needs it.** Set `expires_at` to the window you actually want when you create the charge — that is the cancellation, decided up front. A quote good for ten minutes should be created with ten minutes on it, not created open-ended and revoked later. If a human must call one off early, they can, from **Receive Payments** in their dashboard.

`Paid` and `Refunded` are settled on-chain and cannot be set by hand at all; a charge that is already anything other than `Pending` answers `409`.

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
  "paid_amount": 0.31471, "wallet_address": "0x…", "description": "Logo design",
  "return_url": "https://yourdomain.com/orders/8814/thanks?invoice=<invoice_id>", "tokens": [ … ] }
```

> ⚠️ **`amount_usd` and `usd_to_fiat_rate` are recomputed on every read, at today's rate.** They are not stored with the invoice, so a charge created months ago comes back priced at this morning's exchange rate — including one that is `Expired`, which quotes a price nobody can pay any more, and one that is `Paid`, where the number never matches what actually settled. For accounting, use `paid_amount` with `paid_token`: those are recorded at settlement and do not move. Treat `amount_usd` as a live quote for a `Pending` invoice and ignore it everywhere else.

**`return_url` comes back already resolved**, on both this response and `POST /invoices` — the `{invoice_id}` placeholder is substituted for you, so the value is the URL the payer will actually be sent to, not the template you submitted. It is `null` when the invoice has none, which is also the case for every invoice created before you started sending the field.

**`reference` and `created_at` are not on this response.** `reference` comes back on `POST /invoices` and in the webhook payload, but `GET /invoices/<id>` does not echo it — so you cannot use it to identify an invoice you fetched by id, and there is no way to search by it. Store your own id → invoice mapping at creation time. Likewise, capture `created_at` from the POST response if you need it; the GET will not give it back.

`status` transitions: `Pending` → `Paid`, `Expired` or `Refunded` — **and `Expired` → `Refunded`**. Only `Paid` and `Refunded` are truly final.

> ⚠️ **`Expired` is not the end of the story.** Voulti watches the deposit address for 24h counted from `expires_at` — not from the moment the sweep flips the status, which can lag it by up to ~5 minutes, so an invoice you already saw as `Expired` can flip to `Refunded` later, when late funds arrive and are sent back. If your poller stops re-checking on `Expired`, you will never learn the payer actually paid — and they *will* contact the merchant saying so. Keep re-checking expired invoices for 24h, or rely on the webhook, which fires again on the flip.

| Status | Meaning |
|---|---|
| `Paid` | Settled on-chain and credited to the merchant's balance, which they withdraw when they choose — it does **not** appear in their wallet on its own. This is the only status that means "release the goods". Final. |
| `Expired` | The time limit passed and nothing had arrived *yet*. May still become `Refunded` within 24h. |
| `Refunded` | Money reached the deposit address but never settled — it arrived after expiry, or too late to complete. Voulti returned it to the sending address automatically. **The merchant receives nothing**, so treat it like `Expired` for fulfilment, but expect the payer to say they paid: they did, and they already have it back. |

Note `paid_amount` is the **crypto** amount actually transferred (e.g. `0.31471` USDT), not the fiat total — compare `amount_fiat` if you need to verify the price. Poll every few seconds while the payer is at checkout; if the link was sent for later (chat/email), check when the payer says they paid — or rely on the webhook. Never reuse an expired link; create a new invoice instead.

### Where the money actually is

**Tell your human this, because the obvious guess is wrong.** A paid invoice does **not** transfer stablecoins to the merchant's wallet. It moves them into Voulti's settlement contract on that network and credits the merchant's balance in a ledger inside it, minus the 1% fee. The money is theirs, and it is not in their wallet.

The wallet on the account is an **identity**, not a destination. It is the key that proves ownership — it is what authorises changing the webhook URL, reading the signing secret, and withdrawing. Nothing is ever sent to it automatically.

**Withdrawing is a separate, deliberate action** the merchant takes from **Receive Payments → Balance** in their dashboard. They can send the funds to any address, not only the wallet they sign in with. There is a **$1 flat fee** per withdrawal, which is why it is worth accumulating rather than withdrawing per sale — on a $5 charge that fee is 20%, far more than anything gas costs.

So three balances answer three different questions, and only one of them is the merchant's money:

| Where you look | What you are seeing |
|---|---|
| The merchant's wallet on a block explorer | Whatever it received **by any other means** — transfers, swaps, a salary. **Nothing from Voulti** until they withdraw. An empty wallet next to paid invoices is expected, not a fault. |
| Voulti's settlement contract on a block explorer | Every merchant's funds on that network, pooled together. Never any one merchant's balance — reading its token balance as a single merchant's is the mistake this table exists to prevent. |
| **Receive Payments → Balance** in the dashboard | Only what Voulti collected and has not paid out yet. This is the number to withdraw against. |

None of the three is "everything the merchant owns", and no screen adds them up. Money sent straight to their wallet never appears in Voulti and needs no withdrawal — it is already where it was going. A merchant holding both will see two different numbers that are both correct.

> ⚠️ **Never publish a contract address as somewhere to send money.** Only a payment through a Voulti checkout link credits anyone: a plain transfer into the settlement contract raises its token balance with **no merchant credited and no invoice paid**. It does not fail, it does not error, and the sender gets nothing. Publishing the merchant's own wallet is a different mistake with a quieter cost — the transfer arrives, but outside Voulti: no invoice, no webhook, no receipt. Share the checkout link, never an address.

**On custody, accurately:** funds sit in a contract Voulti owns and operates. No function in it lets Voulti move a merchant's balance — the admin withdrawals only touch Voulti's own accumulated fees — and a merchant can withdraw theirs at any time without asking. But the owner can replace the contract's modules, so a merchant's balance ultimately rests on Voulti not changing the code. It is **custodial in the way that matters**, and telling someone otherwise while they decide whether to leave a balance sitting here would be misleading.

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

**Record the key *after* the work succeeds, not when the delivery arrives.** Marking it seen up front looks safer and is the opposite: if the fulfilment or the confirming `GET` then fails, every retry we send is discarded as a duplicate and the order is never filled — a payment lost to a cache entry. Write the key in the same transaction as the fulfilment, or last.

**It fires on every final status, not just `Paid`** — `Expired` and `Refunded` arrive here too, so branch on `status` rather than assuming a delivery means money. On `Expired` and `Refunded` the payment fields (`paid_tx_hash`, `paid_amount`, `paid_at`…) are `null`.

**Delivery is batched, not instantaneous.** A background worker sweeps confirmed invoices and posts them, so the webhook lands seconds after settlement rather than the moment the payer's transaction confirms. If a human is watching a screen, poll alongside the webhook — whichever arrives first wins, and both should reach the same end state.

**`Expired` arrives even for invoices nobody ever opened.** A link that was never clicked still becomes `Expired` and still fires a webhook, so you can rely on it to close out abandoned carts. Expiry is detected by a periodic sweep rather than at the exact second, so expect the status to flip up to ~5 minutes after `expires_at`, with the webhook following seconds later. Don't treat a `Pending` invoice as live purely because `expires_at` has not passed yet, and don't treat one as dead the instant it does.

**Your endpoint must be reachable from the public internet.** Voulti calls it from its own servers, so `localhost`, `127.0.0.1`, a private IP, or anything behind a VPN or a firewall will never receive a delivery — and the failure is invisible from your side, because nothing arrives to log. If you are building on a laptop, put it behind a tunnel (`ngrok http 3000`, `cloudflared tunnel`) and give the merchant the public URL. A path that requires the merchant's own auth middleware will also fail: Voulti sends no credentials, so the webhook route must be exempt from whatever protects the rest of the app.

**Check it before you build the rest.** Once the merchant has saved the URL, they can fire a real delivery of each event at it from **Receive Payments → Developers → Test my webhook** in their dashboard. It shows the status code, the round-trip time and your response body, so a `404` from a wrong path or a `401` from your own middleware is visible in seconds instead of after a payment. Those deliveries carry `test: true` and announce no money. Every attempt, real or test, is kept under **Delivery history** in the charge's detail — ask the merchant to read it to you rather than guessing why nothing arrived.

> ⚠️ **Do not test your deduplication against a real invoice id.** If you key your cache on `invoice_id` + `status` and fire a test at yourself using a real charge's id, you poison that key — and the *genuine* delivery that follows is discarded as a duplicate, silently, with a `200` that looks like success. The dashboard's test button avoids this by sending `invoice_id: "00000000-0000-0000-0000-000000000000"`, which cannot collide with anything. A manual resend from the dashboard *is* the same event again and your cache should treat it as a duplicate — that is correct, and it is why the merchant reads Delivery history rather than your logs to confirm a resend went out.

**Retries back off, so a short outage is survivable.** A delivery that does not answer `2xx` within 2 s is retried on this schedule: 1m, 5m, 30m, 2h, 6h, 12h, 24h — 8 attempts spanning about two days. **Your handler must be idempotent**: the same event will arrive more than once whenever a response is slow or lost, and the merchant can also replay it by hand from their dashboard. Key your cache on `invoice_id` **plus `status`**, as above — never on `invoice_id` alone. One charge can legitimately deliver twice with different statuses (`Expired`, then `Refunded` when late funds are returned), and a cache keyed on the id alone swallows the second one: the order stays shipped after the money went back. After the last attempt the invoice leaves the delivery queue for good; only a manual resend brings it back.

**`paid_network` values, and the explorer for each.** The field is lower-case and is *not* the display name used elsewhere in this file — `tokens[]` on `GET /invoices/<id>` capitalises the same networks (`Celo`, `Arbitrum`…), and the Facts section spells them for humans (`Arbitrum One`). Match on this column, not on those:

| `paid_network` | Explorer for `paid_tx_hash` |
|---|---|
| `celo` | `https://celoscan.io/tx/<hash>` |
| `arbitrum` | `https://arbiscan.io/tx/<hash>` |
| `polygon` | `https://polygonscan.com/tx/<hash>` |
| `base` | `https://basescan.org/tx/<hash>` |
| `bsc` | `https://bscscan.com/tx/<hash>` |

A few rows created before this settled carry `Celo` capitalised, so lower-case the value before comparing.

**`test: true` means nobody paid.** The merchant can fire any of the three events at their own URL from the dashboard's *Test my webhook* button. Those deliveries are byte-identical to real ones except for a `test: true` field, are signed with the same secret, and carry `invoice_id: "00000000-0000-0000-0000-000000000000"`. Return `2xx` so the merchant sees their endpoint works — and ship nothing. Real deliveries never carry the field at all, so branch on its presence, not on its value.

**Verify the signature.** The `X-Voulti-Signature: t=<unix_seconds>,v1=<hex>` header carries an HMAC-SHA256 of `` `${t}.${rawBody}` `` keyed with the commerce's webhook signing secret. It is present **whenever that commerce has a signing secret configured, and absent when it does not** — so if your handler rejects unsigned deliveries (it should), make sure the merchant actually set a secret, or every delivery will `401` and burn every attempt we make.

> ⚠️ **Serving more than one commerce? Do not point them at the same URL.** Signing secrets are **per commerce**, so one endpoint holding one secret rejects every delivery for the second commerce — and the `401` that comes back looks exactly like a broken handler, which is a slow thing to diagnose from either end.
>
> Give each commerce its own route (`/webhooks/voulti/<something>`), so the route itself decides which secret to use. If you must share one, read **`X-Voulti-Commerce: <commerce_id>`** to choose the secret, then verify as usual.
>
> **`X-Voulti-Commerce` is a key hint, not a credential** — the same role `kid` plays in a JWT. It is unauthenticated: it tells you which secret to try, and the signature is what proves the delivery is ours. Trusting it on its own to identify the sender means anyone who learns the URL can name any commerce they like. Never branch on it before the signature checks out, and never treat it as proof of anything after.
>
> You cannot substitute the payload for it either: the body has no `commerce_id`, and the dashboard's conformance probes carry an invoice id of all zeros that maps to nothing you could look up.

```js
import { createHmac, timingSafeEqual } from "crypto";

function verifyVoultiWebhook(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader) return false;
  const { t, v1 } = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split(/=(.*)/s).slice(0, 2))
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
  after(async () => {
    const e = JSON.parse(rawBody);
    if ("test" in e) return;                          // rehearsal — presence, not value: test:false is not real money
    const key = `${e.invoice_id}:${e.status}`;        // id alone would swallow Expired → Refunded
    if (await seen(key)) return;
    await fulfill(e);                                 // re-check + deliver goods
    await markSeen(key);                              // last: a failure above must stay retryable
  });
  return Response.json({ received: true });  // well inside the 2s budget
}
```

Defense in depth still applies: even with a valid signature, confirm with `GET /invoices/<invoice_id>` before releasing goods — just do it *after* you have answered, minding the envelope difference above. If that deferred work fails, the invoice stays unfulfilled and polling will catch it; nothing is released on an unverified webhook either way.

**Treat the whole payload as untrusted, not just `status`.** It is tempting to re-check the status against the API but still persist `paid_tx_hash`, `paid_amount` or `paid_at` from the body — especially as a fallback when the API returns `null`. Don't. A forged delivery then writes a real-looking transaction hash onto an unpaid invoice, and your dashboard shows a payment that never happened even though the status stayed correct. **Use the body for `invoice_id` and nothing else**; take every other field from the `GET` response.

**Three things your handler must refuse — and the merchant can prove whether it does.** Voulti can sign deliveries *wrongly on purpose*, which nobody else can, so the merchant has a button that fires four at you from **Receive Payments → Developers**: one signed correctly, one with a tampered signature, one signed genuinely but an hour ago, and one with no signature header at all. The last three must come back non-2xx. Write the handler so they do:

- **A signature that does not match** → reject. This is the one that matters: accept it and anyone who learns the URL can make the merchant believe an order was paid.
- **A `t` older than a few minutes** → reject. A genuine delivery captured once can otherwise be replayed at you forever. Five minutes of tolerance is plenty.
- **A missing header** → reject. Absent is not "unsigned mode"; treat it as wrong, and expect it whenever the merchant has not generated a secret.

Order matters: verify **before** any short-circuit. A handler that returns `200` on `test: true` before checking the signature will fail all three, correctly — an attacker can set that field too.

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
| Refunding a **completed** sale (`Paid`) | There is no reverse operation. The payment is credited to the merchant's balance in the settlement contract, and undoing it is a transfer they make themselves — from that balance if they have not withdrawn it, or from their own wallet if they have. Only unsettled deposits are returned automatically. |

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
