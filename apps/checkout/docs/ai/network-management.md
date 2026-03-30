# Network & Chain Management (AI Focus)

Understand this before touching anything related to chains, tokens, or wallet switching.

## Single Source of Truth: `src/config/chains.ts`

- Contains `SUPPORTED_CHAINS: ChainConfig[]` with:
  - `chain` (wagmi chain object)
  - `backendNames[]` for string lookup compatibility
  - `contracts` (proxy, storage, invoice manager, payment processor)
  - `tokens` (symbol → `{ address, decimals, name }`)
  - `rpcUrls`, `blockExplorer`, `nativeCurrency`
- Helper utilities: `findChainConfigByChainId`, `findChainConfigByBackendName`, `getAllEnabledChains`, `getBlockExplorerUrl`.
- **Rule of thumb:** Do not copy addresses elsewhere. Always import from this file.

## Wagmi Integration

- `src/config/wagmi.ts` calls `getAllEnabledChains()` to register connectors/transports. Adding a chain in `SUPPORTED_CHAINS` automatically exposes it to RainbowKit/wagmi.
- If you change `SUPPORTED_CHAINS`, confirm `wagmi.ts` still builds (strict tuple typing sometimes requires `as const` updates).

## Hooks

- **`useNetworkMismatch`** compares invoice `selected_network` (numeric `chainId`) with `useChainId()`. Exposes `hasMismatch`, human-readable labels, and a `switchToCorrectNetwork()` helper.
- **`useNetworkDetection`** (legacy) maps backend names to chain config for display; still relies on centralized config.
- `WalletConnectionFlow` uses these hooks to control when to show wallet selection vs. mismatch warnings.

## UI Enforcement

- In `CheckoutPage`, when `hasMismatch` is true, normal token UI is hidden and `NetworkMismatchWarning` encourages switching networks.
- `PaymentButton` also validates network before hitting any API to avoid wasted calls.
- Modals + translations live under `t.payment.*`; update them together when changing copy.

## Backend Expectations

- Backend persists `selected_network` (`chainId`) with each invoice. `/api/blockchain/status/:invoiceId` still accepts `chainId` for compatibility.
- When adding a chain, make sure backend routes:
  - Accept the new `chainId` in `/create`.
  - Resolve invoice status using stored `selected_network`.
  - Return payment options with token addresses that match `SUPPORTED_CHAINS`.
- Frontend still contains a few fallback helpers with hard-coded metadata. Until they are refactored to read straight from `chains.ts`, update them whenever you introduce a new network:
  - `src/hooks/useNetworkMismatch.ts` (`getNetworkName` / `getNetworkConfig`)
  - `src/hooks/usePaymentButton.ts` (inline `getNetworkName` functions)
  - `src/components/NetworkSwitchButton.tsx` now consumes the chain config, but it still expects RPC URLs, explorers, and native currency fields to be present.

## Testing Checklist

1. Create invoice on chain X.
2. Load checkout while wallet is on chain Y — mismatch warning must appear.
3. Trigger wallet switch. Confirm `hasMismatch` flips to false and token dropdown repopulates.
4. Complete a payment to ensure backend + blockchain flows respect the new chain.

## Gotchas

- Missing token addresses cause `Unsupported token` errors during on-chain creation.
- Forgetting to localize network names leads to inconsistent UI messaging.
- Disabling a chain in `SUPPORTED_CHAINS` while invoices still reference it will prevent payments—coordinate rollouts carefully.
