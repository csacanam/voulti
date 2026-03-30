# Contract ABIs

This directory contains the ABIs (Application Binary Interfaces) for the smart contracts used in the DeRamp system.

## Required ABIs

Please add the following ABIs as JSON files:

1. `DERAMP_PROXY.json` - Main DeRamp proxy contract ABI
2. `DERAMP_STORAGE.json` - DeRamp storage contract ABI
3. `ACCESS_MANAGER.json` - Access manager contract ABI
4. `INVOICE_MANAGER.json` - Invoice manager contract ABI
5. `PAYMENT_PROCESSOR.json` - Payment processor contract ABI

## Token ABIs

For ERC20 tokens, you can use the standard ERC20 ABI or create specific ones if needed:

- `ERC20.json` - Standard ERC20 token ABI

## Usage

Import ABIs in your components like this:

```typescript
import DERAMP_PROXY_ABI from "../blockchain/abi/DERAMP_PROXY.json";
import ERC20_ABI from "../blockchain/abi/ERC20.json";
```

## Contract Addresses

Contract addresses are defined in `src/blockchain/config/contracts.ts` for each network.
