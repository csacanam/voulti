# System Architecture Overview (AI Focus)

## Runtime Stack
- **Frontend:** React 18 + TypeScript served by Vite. Tailwind utility classes shape the UI; stay consistent with existing class conventions when editing components.
- **State & Data:** React hooks and contexts (e.g., `LanguageContext`, `WalletConnectionFlow`). Hooks isolate async effects—prefer extending them over duplicating logic in components.
- **Web3:** `wagmi` + `ethers` v6. Contracts are instantiated directly in hooks using JSON ABIs under `src/blockchain/abi`.
- **Internationalization:** TypeScript dictionaries at `src/locales/en.ts` and `src/locales/es.ts`. Any new user-facing text must be localized in both files.

## Directory Map
- `src/components/` — Presentational React components. Expect minimal side-effects; they consume hook outputs.
- `src/hooks/` — Business logic and side-effects (REST, blockchain). Hooks expose clean return values for the UI.
- `src/services/` — HTTP clients hitting backend REST endpoints. Keep them promise-based and stateless.
- `src/config/` — Build-time constants. `chains.ts` is the single source of truth for networks and tokens.
- `src/blockchain/` — Types, ABIs, and helpers shared by hooks talking to smart contracts.
- `docs/ai/` — These AI-specific docs. Update them whenever automation changes flows or architecture.
- `docs/dev/` — Human developer guidance (style rules, onboarding, etc.).

## Application Flow
1. **Routing:** `/checkout/:invoiceId` renders `CheckoutPage`.
2. **Data Fetching:** `useInvoice` and `useCommerce` obtain invoice + merchant metadata from the backend.
3. **Wallet State:** `wagmi` exposes connection + `chainId`. Custom hooks (`useNetworkMismatch`, `useNetworkDetection`) reconcile invoice metadata with wallet status.
4. **Token Selection:** `groupTokensBySymbol` groups invoice tokens; balances fetched via `useTokenBalance`.
5. **Payment CTA:** `PaymentButton` wraps `usePaymentButton`, which handles blockchain status checks, invoice creation, approvals, payments, and backend reconciliation.
6. **Status Feedback:** Modals (`ErrorModal`, `BuyingSoonModal`, `NetworkCongestionModal`, `PaymentCancelledModal`) deliver UX-consistent messaging instead of browser alerts.

## Design Guardrails
- **Backend is the status authority.** Frontend countdown still toggles `Expired` visually, but real status comes from the server.
- **Centralized network data.** Never duplicate contract or token addresses; derive them from `findChainConfigByChainId`.
- **Modal-only errors.** If you surface new error cases, extend the modal suite rather than reusing `alert()` or console-only feedback.
- **Translations mandatory.** Any new copy must be added to both locales before use.
- **UI theme parity.** The current layout still uses dark styling; coordinate with `docs/dev/` expectations before restyling.

## Feature Work Template
1. Add/extend a hook to encapsulate new behavior.
2. Wire REST interactions through `src/services/*`.
3. Feed hook outputs into components via props.
4. Update AI docs (this folder) and developer docs (`docs/dev/`) to describe new flows or constraints.

## Quick References
- Invoice fetching: `src/hooks/useInvoice.ts`
- Payment flow orchestration: `src/hooks/usePaymentButton.ts`
- Blockchain REST client: `src/services/blockchainService.ts`
- Chain configuration: `src/config/chains.ts`
- Network mismatch handling: `src/hooks/useNetworkMismatch.ts`

