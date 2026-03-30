# Blockchain Configuration

This directory contains all blockchain-related configurations, ABIs, and vault addresses needed for the frontend.

## Structure

```
blockchain/
├── abis/
│   └── PayoutVault.json      # Compiled contract ABI
├── vaults.ts                  # Vault addresses by network/token
├── index.ts                   # Central export point
└── README.md                  # This file
```

## Usage

### Import ABIs

```typescript
import { PayoutVaultABI } from "@/blockchain";
// or
import { ABIs } from "@/blockchain";

// Use in ethers/viem
const contract = new ethers.Contract(address, PayoutVaultABI, signer);
```

### Get Vault Configuration

```typescript
import { getVaultConfig, getVaultAddress, vaultExists } from "@/blockchain";

// Get complete vault config
const vaultConfig = getVaultConfig("celo", "cCOP");
// Returns: { address, token: { address, symbol, decimals }, network: { chainId, name } }

// Get just the address
const vaultAddress = getVaultAddress(42220, "cCOP"); // by chainId (Celo Mainnet)
// Returns: "0x..." or null

// Check if vault exists
if (vaultExists(42220, "cCOP")) {
  // Celo Mainnet
  // Vault is deployed and configured
}

// Get all vaults for a network
const celoVaults = getVaultsByChainId(42220); // Celo Mainnet
```

## Complete Deployment Workflow

### Step 1: Deploy Contract

From the contracts directory:

```bash
cd ../contracts

# Compile
forge build

# Deploy (example: cCOP on Celo)
PRIVATE_KEY=0x... \
VAULT_OWNER=0xYourBackendWallet \
TOKEN_ADDRESS=0x8A567e2aE79CA692Bd748aB832081C45de4041eA \
forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
  --rpc-url https://forno.celo.org \ # Celo Mainnet RPC
  --broadcast \
  --verify
```

**Save the deployed vault address!** You'll need it for Step 3.

> 📖 **For detailed deployment instructions, see [../../contracts/DEPLOYMENT.md](../../contracts/DEPLOYMENT.md)**

### Step 2: Export ABIs to Frontend

After deployment (or after any contract changes):

```bash
# From contracts directory:
./scripts/copy-abis.sh

# Or from frontend directory:
npm run copy:abis
```

This automatically copies `PayoutVault.json` ABI to `blockchain/abis/`.

### Step 3: Update Vault Configuration

Open `vaults.ts` and update with your deployed address:

```typescript
// Example: cCOP vault on Celo
celo: {
  cCOP: {
    address: "0xYourDeployedVaultAddress", // ← Paste address here
    token: {
      address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", // cCOP token
      symbol: "cCOP",
      decimals: 18,
    },
    network: {
      chainId: 42220, // Celo Mainnet
      name: "Celo",
    },
  },
}
```

### Step 4: Verify Configuration

Test that everything is set up correctly:

```typescript
import { vaultExists, getVaultConfig } from "@/blockchain";

// Should return true
const exists = vaultExists(42220, "cCOP");
console.log("Vault exists:", exists);

// Should return your deployed address
const config = getVaultConfig("celo", "cCOP");
console.log("Vault address:", config?.address);
```

### Step 5: Use in Squid Post-Hook

Now you can use the vault in your Squid integration. See examples below.

## Updating ABIs

After modifying smart contracts (without redeployment):

```bash
cd contracts
forge build
./scripts/copy-abis.sh
```

This automatically copies the latest ABIs to `frontend/blockchain/abis/`.

**Note:** Only needed when contract code changes. Address updates don't require this.

## Deploying New Vaults

When you deploy a new vault:

1. Deploy the vault using the Foundry script:

   ```bash
   cd contracts
   TOKEN_ADDRESS=0x... forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
     --rpc-url <RPC_URL> --broadcast --verify
   ```

2. Update `vaults.ts` with the deployed address:

   ```typescript
   celo: {
     cCOP: {
       address: "0xYourDeployedVaultAddress", // Update this
       // ...
     }
   }
   ```

3. Verify the configuration:

   ```typescript
   import { vaultExists } from "@/blockchain";

   console.log(vaultExists(42220, "cCOP")); // Should return true (Celo Mainnet)
   ```

## Vault Deployment Checklist

For each new token vault:

- [ ] Deploy vault contract
- [ ] Update address in `vaults.ts`
- [ ] Verify token address is correct
- [ ] Verify token decimals
- [ ] Test deposit/withdraw functions
- [ ] Update backend configuration
- [ ] Configure Squid post-hook

## Networks Supported

| Network                  | Chain ID | Tokens     |
| ------------------------ | -------- | ---------- |
| Celo Mainnet             | 42220    | cCOP, BRLA |
| Arbitrum One             | 42161    | MXNB       |
| Polygon                  | 137      | BRL1       |
| Celo Alfajores (Testnet) | 44787    | cCOP       |

## Example: Squid Post-Hook Configuration

```typescript
import { getVaultConfig, PayoutVaultABI } from "@/blockchain";
import { ethers } from "ethers";

// Get vault for cCOP on Celo
const vaultConfig = getVaultConfig("celo", "cCOP");

if (!vaultConfig) {
  throw new Error("Vault not configured");
}

// Encode deposit function call
const vaultInterface = new ethers.Interface(PayoutVaultABI);
const depositCallData = vaultInterface.encodeFunctionData("deposit", [
  commerceAddress,
  "0", // Amount will be replaced by Squid with full balance
  payoutId,
]);

// Configure Squid post-hook
const postHook = {
  chainType: "evm",
  calls: [
    {
      callType: 1, // FULL_TOKEN_BALANCE
      target: vaultConfig.address, // The deployed vault
      value: "0",
      callData: depositCallData,
      payload: {
        tokenAddress: vaultConfig.token.address, // cCOP address
        inputPos: "1", // Replace amount parameter
      },
      estimatedGas: "150000",
      chainType: "evm",
    },
  ],
  provider: "Voulti",
  description: `Deposit to ${vaultConfig.token.symbol} PayoutVault`,
};
```

## TypeScript Types

All vault configurations are fully typed:

```typescript
interface VaultConfig {
  address: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  network: {
    chainId: number;
    name: string;
  };
}
```

## Security Notes

- Vault addresses are immutable after deployment
- Each vault is specific to one token on one chain
- Always verify vault addresses after deployment
- Keep this configuration in sync with deployed contracts
