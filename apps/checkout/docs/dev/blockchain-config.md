# Blockchain Configuration

This project keeps every chain, token, and contract address inside `src/config/chains.ts`. Treat that file as the single source of truth any time you add or modify network support.

## Current Networks

| Name           | Chain ID | Backend Aliases                         | Priority |
| -------------- | -------- | --------------------------------------- | -------- |
| Celo           | 42220    | Celo, CELO, Celo Mainnet                | 1        |
| Celo Alfajores | 44787    | Celo Alfajores, Alfajores, Celo Testnet | 2        |

For each entry you must provide:

- `chain`: a `wagmi` `Chain` object (imported or hand-built).
- `backendNames`: all labels the backend may return for that network.
- `enabled`: toggle availability without deleting configuration.
- `priority`: sort order for dropdowns (lower is earlier).
- `contracts`: addresses for `DERAMP_PROXY`, `DERAMP_STORAGE`, `ACCESS_MANAGER`, `INVOICE_MANAGER`, `PAYMENT_PROCESSOR`.
- `tokens`: a map of token symbol to `{ address, symbol, name, decimals }`.
- `rpcUrls`, `blockExplorer`, `nativeCurrency`: metadata used across hooks and services.

## Helper Utilities

`chains.ts` exports helpers that the rest of the codebase relies on:

- `getAllEnabledChains()` feeds the wagmi config.
- `findChainConfigByChainId(chainId)` returns the full `ChainConfig` (contracts, tokens, etc.).
- `findChainConfigByBackendName(name)` resolves backend strings to configs.
- `getBackendNameToChainMap()` and `getBackendNameToChainIdMap()` provide quick lookups.
- `getBlockExplorerUrl(backendName, txHash)` builds transaction links.

Always call these helpers instead of hardcoding addresses in components or hooks.

## Adding a New Network

1. Populate a new `ChainConfig` entry inside `SUPPORTED_CHAINS`.
2. Include every contract and token address you plan to expose.
3. Set `enabled: false` if you want to stage the rollout.
4. Update backend services so invoices store the correct `chainId`.
5. Confirm `src/config/wagmi.ts` picks up the chain (it uses `getAllEnabledChains()`).
6. Extend translations if user-visible text needs the new network name.
7. Update the fallback logic that still hard-codes chain names or metadata:
   - `src/hooks/useNetworkMismatch.ts` (`getNetworkName` and `getNetworkConfig`)
   - `src/hooks/usePaymentButton.ts` (the local `getNetworkName` helpers)
   - `src/components/NetworkSwitchButton.tsx` now reads from the chain config, so just confirm the new entry contains RPC URLs, explorers, and native currency data.
     These references are scheduled for future refactors; until then double-check they recognize your new network.

## Troubleshooting

If a network refuses to work:

- Confirm it exists in `SUPPORTED_CHAINS` and that `enabled` is `true`.
- Verify the backend alias matches whatever string the API returns.
- Check the browser console for `getChainDebugInfo` output; it prints helpful diagnostics when a network is missing.
- Make sure wagmi is aware of the chain (restart dev server after changes).
