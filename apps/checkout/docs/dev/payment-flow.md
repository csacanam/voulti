# Payment Flow Reference

This guide summarizes how the checkout page drives a payment from “Pay Now” to “Paid”. Use it alongside the AI-focused deep dive in `docs/ai/payment-flow.md` when you need more context.

## Primary Components

- `src/components/CheckoutPage.tsx` — fetches invoice/commerce data, renders token selection, and passes payment options to the button.
- `src/components/PaymentButton.tsx` — handles button states, opens modals for congestion or cancellations, and wires callbacks.
- `src/hooks/usePaymentButton.ts` — performs blockchain status checks, creates on-chain invoices, requests approvals, submits payments, and notifies the backend.
- `src/services/blockchainService.ts` — thin REST client for the blockchain API (`status`, `create`, `payment-data`).

## Button State Machine

| State        | Label (English)           | Action                                       |
| ------------ | ------------------------- | -------------------------------------------- |
| `initial`    | Pay Now                   | Validate wallet, balance, and network        |
| `loading`    | Preparing your payment... | Check or create invoice on-chain             |
| `ready`      | Authorize {TOKEN}         | Prompt user for ERC-20 approval              |
| `approving`  | Authorizing {TOKEN}...    | Wait for approval transaction                |
| `confirm`    | Confirm Payment           | Execute on-chain payment                     |
| `processing` | Processing payment...     | Await transaction receipt and update backend |

All copy is localized through `t.payment.*` in the language dictionaries.

## Happy Path

1. `handlePayNow()` runs network validation, then calls `BlockchainService.getStatus(invoiceId, chainId)`.
2. If the invoice does not exist on-chain, the hook converts token symbols to addresses (via `findChainConfigByChainId`) and creates it with `BlockchainService.createInvoice`.
3. `handleAuthorize()` ensures the proxy contract has allowance for the selected token, requesting an approval transaction if needed.
4. `handleConfirm()` re-fetches blockchain status to obtain the exact token amount stored on-chain, executes `DerampProxy.payInvoice`, and then posts payment metadata with `updatePaymentData`.
5. On success the button resets, `onSuccess` triggers, and the checkout refreshes to show the `Paid` status.

## Error Surfaces

- **Network mismatch:** `useNetworkMismatch` disables the payment UI until the wallet chain matches `invoice.selected_network`.
- **User cancellation:** Detected via error codes `ACTION_REJECTED`/`4001` and surfaced through `PaymentCancelledModal`.
- **Network congestion or RPC flakiness:** Recognized in `PaymentButton` and displayed in `NetworkCongestionModal`.
- **Backend issues:** Hook maps HTTP failures and token whitelist problems to descriptive messages passed to `ErrorModal`.

## Best Practices

- Never hardcode contract or token addresses; always read them from `findChainConfigByChainId`.
- Always rely on the blockchain status response for the definitive payment amount (database values can drift).
- Keep modals and translations in sync when introducing new error cases.
- When adjusting payment logic, update both this document and `docs/ai/payment-flow.md` so future contributors have aligned instructions.
