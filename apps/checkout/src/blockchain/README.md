# Blockchain Configuration

This directory contains all blockchain-related configuration for the DeRamp frontend application.

## 📁 Directory Structure

```
src/blockchain/
├── abi/                    # Smart contract ABIs
│   └── DerampProxy.json    # Main contract ABI
├── config/                 # Configuration files
│   ├── index.ts            # Configuration exports
│   ├── chains.ts           # Chain configuration
│   ├── contracts.ts        # Contract addresses
│   ├── networks.ts         # Network settings
│   └── tokens.ts           # Token configuration
├── types.ts                # Blockchain types
└── README.md               # This file
```

## 🔧 Configuration Files

### chains.ts

Centralized chain configuration with support for multiple networks.

```typescript
export interface ChainConfig {
  chain: Chain; // Wagmi chain object
  backendNames: string[]; // Names backend can use
  enabled: boolean; // Whether chain is active
  priority: number; // Display priority
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chain: celoAlfajores,
    backendNames: ["alfajores", "celo-alfajores"],
    enabled: true,
    priority: 1,
  },
];
```

### contracts.ts

Smart contract addresses for each network.

```typescript
export const CONTRACTS = {
  alfajores: {
    DERAMP_PROXY: "0xc44cDAdf371DFCa94e325d1B35e27968921Ef668",
    // Add more contracts as needed
  },
};
```

### networks.ts

Network-specific configuration (RPC URLs, block explorers, etc.).

```typescript
export const NETWORKS = {
  alfajores: {
    chainId: 44787,
    name: "Celo Alfajores",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    blockExplorer: "https://alfajores.celoscan.io",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
  },
};
```

### tokens.ts

Token configuration including addresses, decimals, and metadata.

```typescript
export const TOKENS = {
  alfajores: {
    cCOP: {
      address: "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
      symbol: "cCOP",
      decimals: 18,
      name: "Celo Colombian Peso",
    },
  },
};
```

## 🚀 Adding New Networks

To add support for a new network:

1. **Add chain to chains.ts**

   ```typescript
   import { newChain } from "wagmi/chains";

   export const SUPPORTED_CHAINS: ChainConfig[] = [
     // ... existing chains
     {
       chain: newChain,
       backendNames: ["new-network", "new-network-testnet"],
       enabled: true,
       priority: 2,
     },
   ];
   ```

2. **Add network to networks.ts**

   ```typescript
   export const NETWORKS = {
     // ... existing networks
     "new-network": {
       chainId: 12345,
       name: "New Network",
       rpcUrl: "https://rpc.new-network.com",
       blockExplorer: "https://explorer.new-network.com",
       nativeCurrency: {
         name: "TOKEN",
         symbol: "TOKEN",
         decimals: 18,
       },
     },
   };
   ```

3. **Add contracts to contracts.ts**

   ```typescript
   export const CONTRACTS = {
     // ... existing networks
     "new-network": {
       DERAMP_PROXY: "0x...",
       // Add other contract addresses
     },
   };
   ```

4. **Add tokens to tokens.ts**
   ```typescript
   export const TOKENS = {
     // ... existing networks
     "new-network": {
       TOKEN: {
         address: "0x...",
         symbol: "TOKEN",
         decimals: 18,
         name: "Token Name",
       },
     },
   };
   ```

## 🪙 Adding New Tokens

To add a new token to an existing network:

1. **Get token contract address** from blockchain explorer
2. **Add to tokens.ts**
   ```typescript
   export const TOKENS = {
     alfajores: {
       // ... existing tokens
       NEW_TOKEN: {
         address: "0x...",
         symbol: "NEW_TOKEN",
         decimals: 18,
         name: "New Token",
       },
     },
   };
   ```

## 🔗 Smart Contract Integration

### Using Contract Addresses

```typescript
import { CONTRACTS } from "./config/contracts";
import { TOKENS } from "./config/tokens";

// Get contract address
const proxyAddress = CONTRACTS.alfajores.DERAMP_PROXY;

// Get token address
const tokenAddress = TOKENS.alfajores.cCOP.address;
```

### Using Chain Configuration

```typescript
import { SUPPORTED_CHAINS, findChainByBackendName } from "./config/chains";

// Find chain by backend name
const chain = findChainByBackendName("alfajores");

// Get enabled chains for wagmi
const enabledChains = getAllEnabledChains();
```

## 🧪 Testing Configuration

### Validate Configuration

```typescript
// Check if all required contracts are defined
Object.keys(NETWORKS).forEach((network) => {
  if (!CONTRACTS[network]) {
    console.error(`Missing contracts for network: ${network}`);
  }
});

// Check if all networks have tokens
Object.keys(NETWORKS).forEach((network) => {
  if (!TOKENS[network] || Object.keys(TOKENS[network]).length === 0) {
    console.error(`No tokens defined for network: ${network}`);
  }
});
```

### Debug Configuration

```typescript
import { getChainDebugInfo } from "./config/chains";

// Get debug info for a backend name
const debugInfo = getChainDebugInfo("alfajores");
console.log(debugInfo);
```

## 🔒 Security Considerations

- **Contract addresses** should be verified on blockchain explorers
- **RPC URLs** should use HTTPS in production
- **Token addresses** should be verified against official sources
- **Test networks** should be clearly marked and separated from mainnet

## 📚 Resources

- [Celo Documentation](https://docs.celo.org/)
- [Wagmi Chains](https://wagmi.sh/react/chains)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Celo Alfajores Faucet](https://faucet.celo.org/)

## 🔄 Maintenance

### Regular Tasks

1. **Update contract addresses** when contracts are redeployed
2. **Add new tokens** as they become available
3. **Update RPC URLs** if they change
4. **Verify token addresses** periodically
5. **Test configuration** after updates

### Version Control

- **Never commit private keys** or sensitive data
- **Use environment variables** for network-specific configuration
- **Document changes** in commit messages
- **Test thoroughly** before deploying changes

---

**Note:** This configuration is designed to be centralized and maintainable. All blockchain-related settings should be updated here rather than scattered throughout the codebase.
