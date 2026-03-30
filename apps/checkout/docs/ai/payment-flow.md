# Payment Flow Deep Dive (AI Focus)

This file traces how the checkout CTA moves from “Pay Now” to “Paid”. Cross-reference with:
- `src/components/CheckoutPage.tsx`
- `src/components/PaymentButton.tsx`
- `src/hooks/usePaymentButton.ts`
- `src/services/blockchainService.ts`

## Core Actors
- **`CheckoutPage`** — Converts invoice data into UI state, builds the `PaymentOption[]`, and renders the button.
- **`PaymentButton`** — Provides UX state, wiring modals for congestion or cancellations, and delegates to the hook.
- **`usePaymentButton`** — Orchestrates blockchain status lookups, on-chain invoice creation, approval flows, payment execution, and backend synchronization.
- **`BlockchainService`** — REST client for `/api/blockchain/status`, `/api/blockchain/create`, and `/api/invoices/:id/payment-data`.

## Step-by-Step
1. **Token Selection:** User picks a token; `CheckoutPage` converts selected token into `[{ token: symbol, amount: string }]`.
2. **Initial Click:** `handlePayNow()` validates wallet connection, checks balance, and ensures the wallet `chainId` matches `invoice.selected_network`.
   - Calls `BlockchainService.getStatus(invoiceId, chainId)`.
   - If invoice not on-chain, converts token symbols → addresses via `findChainConfigByChainId`, then hits `/create`.
   - If status is `paid/expired/refunded`, forces a page reload to surface backend truth.
3. **Authorization:** `handleAuthorize()` ensures ERC-20 allowance for `DERAMP_PROXY`. If allowance is insufficient, calls `approve`.
4. **Confirmation:** `handleConfirm()` re-fetches `getStatus` for the on-chain canonical token amounts, validates invoice existence, logs debug info, and calls `DerampProxy.payInvoice(...)`.
5. **Backend Sync:** On success, `updatePaymentData` persists `paid_token`, `paid_network`, `paid_tx_hash`, etc., which also sets status to `Paid`.

## Error Surfaces
- **Network mismatches** — Short-circuited by `useNetworkMismatch`; surfaces `NetworkMismatchWarning`.
- **Unsupported tokens/networks** — Hook throws with user-friendly messages (using translations via `t.payment.*`).
- **User cancellation** — Detected via error codes `ACTION_REJECTED` / `4001`, triggers `PaymentCancelledModal`.
- **Network congestion** — Keyword heuristics open `NetworkCongestionModal`.
- **HTTP errors** — Special handling for token whitelist issues; otherwise show localized fallback copy.

## Non-Negotiables
- Always resolve addresses/contracts via `findChainConfigByChainId`.
- Never trust database amounts during payment—rely on on-chain values from `getStatus`.
- Do not bring back `updateInvoiceStatus`; `updatePaymentData` covers status transitions.
- Route all user-visible errors through modals; never reintroduce blocking alerts.

## Extending the Flow
- **New token:** Add address/metadata in `src/config/chains.ts`. Backend must expose it in invoice payloads.
- **New chain:** Update `SUPPORTED_CHAINS`, ensure backend knows the chain ID, verify wagmi transports, update copy in translations.
- **Additional status states:** Coordinate with backend to ensure `/status` reflects them. Update translations + docs accordingly.

