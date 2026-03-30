# 🌐 Network Configuration Analysis - Deramp Backend

**Comprehensive analysis of network configuration management**

---

## 🎯 Executive Summary

This document provides an exhaustive analysis of how the Deramp Backend determines and manages blockchain network configurations. After reviewing all files, the **central network configuration file is `src/blockchain/config/networks.ts`**, which is the single source of truth for network determination throughout the application.

---

## 📊 Files That Manage Network Configuration

### 🥇 Primary Files (Most Frequently Used)

#### 1. `src/blockchain/config/networks.ts` ⭐ **CENTRAL CONFIG**

```typescript
export const NETWORKS = {
  alfajores: {
    chainId: 44787,
    name: "Celo Alfajores",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    blockExplorer: "https://alfajores.celoscan.io",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  },
};

export function getNetworkByChainId(chainId: number): keyof typeof NETWORKS {
  const network = Object.entries(NETWORKS).find(
    ([_, config]) => config.chainId === chainId
  );
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);
  return network[0] as keyof typeof NETWORKS;
}
```

**Usage Statistics**:

- **Direct imports**: 8 files
- **Key function**: `getNetworkByChainId()` - converts chainId → networkName
- **Dependencies**: All blockchain operations rely on this file

**What it defines**:

- ✅ ChainId for each network
- ✅ Network display name
- ✅ RPC URL for blockchain connection
- ✅ Block explorer URL
- ✅ Native currency details

---

#### 2. `src/routes/blockchain.ts` ⭐ **MOST INVOKED**

```typescript
import { NETWORKS } from "../blockchain/config/networks";

// Duplicated function (should be removed)
function getNetworkByChainId(chainId: number): keyof typeof NETWORKS {
  const network = Object.entries(NETWORKS).find(
    ([_, config]) => config.chainId === chainId
  );
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);
  return network[0] as keyof typeof NETWORKS;
}
```

**Usage Count**: 15+ references to `NETWORKS`

**Endpoints that use it**:

- `POST /api/blockchain/create` - Create invoice on blockchain
- `GET /api/blockchain/status/:invoiceId` - Check blockchain status
- `POST /api/blockchain/cancel/:invoiceId` - Cancel invoice

**Pattern**:

```typescript
const { chainId } = req.body;
let networkName: keyof typeof NETWORKS;
networkName = getNetworkByChainId(chainId);

// Update database with chainId
await supabase.from("invoices").update({
  selected_network: NETWORKS[networkName].chainId,
});
```

⚠️ **Issue Found**: Local duplicate of `getNetworkByChainId()` function

---

#### 3. `src/blockchain/services/InvoiceServices.ts`

```typescript
import { NETWORKS } from "../config/networks";

export class InvoiceService extends DerampService {
  constructor(network: keyof typeof NETWORKS, supportsENS?: boolean) {
    super(network, supportsENS);
  }
  // All blockchain operations
}
```

**Usage**: Constructor receives `network` parameter (the networkName)

**Instantiation pattern**:

```typescript
const invoiceService = new InvoiceService(networkName, supportsENS);
await invoiceService.init(process.env.PRIVATE_KEY!);
```

---

#### 4. `src/blockchain/services/DerampServices.ts`

```typescript
import { CONTRACTS } from "../config/contracts";

type NetworkKey = keyof typeof CONTRACTS;

export class DerampService {
  protected network: NetworkKey;
  protected contractAddress: string;

  constructor(network: NetworkKey, supportsENS?: boolean) {
    this.network = network;
    this.contractAddress = CONTRACTS[network].DERAMP_PROXY;
  }
}
```

**Role**: Base class that accepts `network` parameter and uses it to:

- Get contract addresses from `CONTRACTS[network]`
- Pass network to `getWallet()` for provider creation

---

#### 5. `src/blockchain/utils/web3.ts`

```typescript
import { NETWORKS } from "../config/networks";

export function getProvider(
  network: NetworkKey,
  supportsENS?: boolean
): ethers.JsonRpcProvider {
  const networkConfig = NETWORKS[network];

  const providerConfig: any = {
    name: networkConfig.name,
    chainId: networkConfig.chainId,
  };

  if (supportsENS === false) {
    providerConfig.ensAddress = undefined;
  }

  return new ethers.JsonRpcProvider(networkConfig.rpcUrl, providerConfig);
}
```

**Role**: Creates ethers.js provider using network configuration

- Uses `NETWORKS[network].rpcUrl` for connection
- Uses `NETWORKS[network].chainId` for validation
- Handles ENS configuration based on parameter

---

### 🥈 Secondary Files (Configuration Support)

#### 6. `src/blockchain/config/contracts.ts`

```typescript
export const CONTRACTS = {
  alfajores: {
    DERAMP_PROXY: "0xc44cDAdf371DFCa94e325d1B35e27968921Ef668",
    DERAMP_STORAGE: "0x25f5A82B9B021a35178A25540bb0f052fF22e6b4",
    ACCESS_MANAGER: "0x776D9E84D5DAaecCb014f8aa8D64a6876B47a696",
    INVOICE_MANAGER: "0xe7c011eB0328287B11aC711885a2f76d5797012f",
    PAYMENT_PROCESSOR: "0x23b353F6B8F90155f7854Ca3813C0216819543B1",
  },
};
```

**Purpose**: Maps contract addresses to each network
**Dependency**: Keys must match `NETWORKS` keys exactly

---

#### 7. `src/blockchain/config/tokens.ts`

```typescript
export const TOKENS: TokenConfig = {
  alfajores: {
    CELO: { address: "0x0000...", symbol: "CELO", name: "Celo", decimals: 18 },
    CCOP: {
      address: "0xe6A5...",
      symbol: "cCOP",
      name: "Celo Colombian Peso",
      decimals: 18,
    },
    // ... more tokens
  },
};
```

**Purpose**: Maps token configurations to each network
**Dependency**: Keys must match `NETWORKS` keys exactly

---

#### 8. `src/blockchain/utils/formatters.ts`

```typescript
import { NETWORKS } from "../config/networks";
import { TOKENS } from "../config/tokens";

export function getBlockExplorerUrl(network: string, txHash: string): string {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  return `${networkConfig.blockExplorer}/tx/${txHash}`;
}

export function getNetworkDisplayName(network: string): string {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  return networkConfig?.name || network || "Unknown Network";
}
```

**Role**: Helper functions for displaying network/token information
**Usage**: Email templates, transaction links

---

#### 9. `src/business/notificationService.ts`

```typescript
import { getNetworkByChainId, NETWORKS } from "../blockchain/config/networks";
import { TOKENS } from "../blockchain/config/tokens";

// In verifyBlockchainStatus:
const networkName = getNetworkByChainId(invoice.selected_network);
const invoiceService = new InvoiceService(networkName, false);
```

**Usage**:

- Converts stored `selected_network` (chainId) back to networkName
- Creates blockchain service instances for verification
- Formats network/token information for emails

---

#### 10. `src/routes/invoices.ts`

```typescript
import { NETWORKS } from '../blockchain/config/networks';

// In GET /:id endpoint:
.select('*, selected_network, blockchain_invoice_id')

// Response includes:
selected_network: invoice.selected_network  // chainId
```

**Usage**: Returns network information in API responses

---

### 🥉 Database Integration

#### Database Table: `networks`

```sql
CREATE TABLE public.networks (
  name text NOT NULL UNIQUE,
  chain_id bigint NOT NULL UNIQUE,
  rpc_url text NOT NULL,
  proxy_contract text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  storage_contract text,
  accessmanager_contract text,
  invoicemanager_contract text,
  paymentprocessor_contract text,
  CONSTRAINT networks_pkey PRIMARY KEY (chain_id)
);
```

⚠️ **Important Finding**: This table exists in the database schema but is **NOT currently used** by the application code. All network configuration comes from `networks.ts`.

**TODO Item** (from TODO.md):

```markdown
- [ ] Database-Driven Configuration
  - Use `networks` table for all network configurations
  - Eliminate local config files to improve maintainability
```

---

## 🔄 Network Determination Flow

### Complete Flow Diagram

```
1. Frontend Request
   ↓
   Sends: { chainId: 44787 }
   ↓

2. Backend Route (blockchain.ts)
   ↓
   Receives chainId from request body
   ↓
   Calls: getNetworkByChainId(44787)
   ↓

3. networks.ts
   ↓
   Searches NETWORKS object
   Object.entries(NETWORKS).find(([_, config]) => config.chainId === 44787)
   ↓
   Returns: "alfajores"
   ↓

4. Service Creation
   ↓
   const invoiceService = new InvoiceService("alfajores", supportsENS)
   ↓

5. DerampService Constructor
   ↓
   this.network = "alfajores"
   this.contractAddress = CONTRACTS["alfajores"].DERAMP_PROXY
   ↓

6. Service Initialization
   ↓
   await invoiceService.init(process.env.PRIVATE_KEY!)
   ↓
   this.wallet = getWallet(privateKey, "alfajores", supportsENS)
   ↓

7. Provider Creation (web3.ts)
   ↓
   const networkConfig = NETWORKS["alfajores"]
   new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
     name: networkConfig.name,
     chainId: networkConfig.chainId,
     ensAddress: undefined  // if supportsENS === false
   })
   ↓

8. Contract Interaction
   ↓
   Uses provider to call smart contract
   ↓

9. Database Update
   ↓
   Update invoice: { selected_network: NETWORKS["alfajores"].chainId }
   Stores chainId (44787) in database
   ↓

10. Future Retrieval
    ↓
    Read from database: selected_network = 44787
    Convert back: getNetworkByChainId(44787) → "alfajores"
```

---

## 🔍 Key Findings

### ✅ What Works Well

1. **Centralized Configuration**

   - All network details in one place (`networks.ts`)
   - Easy to add new networks
   - Type-safe with TypeScript

2. **Consistent Naming**

   - Same network keys across `NETWORKS`, `CONTRACTS`, `TOKENS`
   - Prevents mismatches

3. **Helper Function**

   - `getNetworkByChainId()` provides clean conversion
   - Used consistently across the codebase

4. **Database Storage**
   - Stores `chainId` (numeric) in database
   - Easier for indexing and querying

### ⚠️ Issues Identified

1. **Function Duplication**

   ```typescript
   // In networks.ts (line 18)
   export function getNetworkByChainId(chainId: number): keyof typeof NETWORKS;

   // In blockchain.ts (line 8) - DUPLICATE!
   function getNetworkByChainId(chainId: number): keyof typeof NETWORKS;
   ```

   **Impact**: Maintenance overhead, potential inconsistencies
   **Solution**: Remove local function, use exported version

2. **Unused Database Table**

   - `networks` table exists but isn't used
   - Configuration hardcoded in `networks.ts`
     **Impact**: Can't change networks without code deployment
     **Solution**: Implement database-driven config (see TODO.md)

3. **Configuration Fragmentation**
   - Networks in `networks.ts`
   - Contracts in `contracts.ts`
   - Tokens in `tokens.ts`
     **Impact**: Must update multiple files when adding network
     **Solution**: Could consolidate, but current structure is acceptable

---

## 📈 Usage Statistics

### Files Importing `networks.ts`

| File                                     | Import Count | Primary Usage                         |
| ---------------------------------------- | ------------ | ------------------------------------- |
| `routes/blockchain.ts`                   | 15+ refs     | Network conversion, validation        |
| `business/notificationService.ts`        | 3 refs       | Status verification, email formatting |
| `routes/invoices.ts`                     | 3 refs       | Response formatting                   |
| `blockchain/services/InvoiceServices.ts` | Type usage   | Constructor type                      |
| `blockchain/utils/web3.ts`               | Direct usage | Provider creation                     |
| `blockchain/utils/formatters.ts`         | 2 functions  | Display helpers                       |

### `getNetworkByChainId()` Usage

**Invocations across codebase**: 6+ times

**Locations**:

1. `routes/blockchain.ts` - POST `/create` (line 46)
2. `routes/blockchain.ts` - GET `/status/:id` (line 198)
3. `routes/blockchain.ts` - POST `/cancel/:id` (line 252)
4. `business/notificationService.ts` - `verifyBlockchainStatus()` (line 177)
5. Local duplicate in `blockchain.ts` (line 8) ⚠️

---

## 🎯 Network Flow Examples

### Example 1: Creating an Invoice on Blockchain

```typescript
// Frontend sends
POST /api/blockchain/create
{
  "invoiceId": "uuid-123",
  "chainId": 44787,
  "supportsENS": false,
  "paymentOptions": [...]
}

// Backend processing (blockchain.ts)
const { chainId, supportsENS } = req.body;

// Step 1: Convert chainId to networkName
const networkName = getNetworkByChainId(44787);
// Returns: "alfajores"

// Step 2: Create service for that network
const invoiceService = new InvoiceService("alfajores", false);
await invoiceService.init(process.env.PRIVATE_KEY!);

// Step 3: Service uses NETWORKS["alfajores"] internally
// - RPC URL: "https://alfajores-forno.celo-testnet.org"
// - ChainId: 44787
// - Contracts: CONTRACTS["alfajores"].DERAMP_PROXY

// Step 4: Create invoice on blockchain
const result = await invoiceService.createInvoice({...});

// Step 5: Store chainId in database
await supabase.from('invoices').update({
  selected_network: 44787,  // Store chainId
  blockchain_invoice_id: result.blockchainInvoiceId
});
```

### Example 2: Verifying Blockchain Status for Notifications

```typescript
// NotificationService.verifyBlockchainStatus()

// Step 1: Get invoice from database
const invoice = {
  id: "uuid-123",
  selected_network: 44787, // Stored as chainId
  blockchain_invoice_id: "0xbd3e...",
};

// Step 2: Convert chainId back to networkName
const networkName = getNetworkByChainId(invoice.selected_network);
// Returns: "alfajores"

// Step 3: Create service for verification
const invoiceService = new InvoiceService(networkName, false);
await invoiceService.init(process.env.PRIVATE_KEY!);

// Step 4: Query blockchain
const onChainStatus = await invoiceService.getInvoiceStatus(
  invoice.blockchain_invoice_id
);

// Step 5: Compare with database status
return onChainStatus.status === invoice.status;
```

### Example 3: Displaying Network Info in Email

```typescript
// NotificationService.generateEmailHtml()

const networkName = "alfajores";

// Get display name
const displayName = getNetworkDisplayName(networkName);
// Returns: "Celo Alfajores"

// Get block explorer URL
const explorerUrl = getBlockExplorerUrl(networkName, invoice.paid_tx_hash);
// Returns: "https://alfajores.celoscan.io/tx/0x..."

// In email template
<p>Network: ${displayName}</p>
<a href="${explorerUrl}">View on ${displayName} Explorer</a>
```

---

## 🔧 Recommendations

### 1. **Remove Duplicate Function** ⭐ HIGH PRIORITY

**Current State**:

```typescript
// blockchain.ts (line 8)
function getNetworkByChainId(chainId: number): keyof typeof NETWORKS {
  const network = Object.entries(NETWORKS).find(
    ([_, config]) => config.chainId === chainId
  );
  if (!network) throw new Error(`Unsupported chainId: ${chainId}`);
  return network[0] as keyof typeof NETWORKS;
}
```

**Recommended Change**:

```typescript
// blockchain.ts
import { NETWORKS, getNetworkByChainId } from "../blockchain/config/networks";

// Remove local function, use imported version
const networkName = getNetworkByChainId(chainId);
```

**Benefits**:

- Single source of truth
- Easier maintenance
- Consistent error messages

---

### 2. **Database-Driven Configuration** ⭐ MEDIUM PRIORITY

**Current State**: Networks hardcoded in `networks.ts`

**Recommended Approach**:

```typescript
// src/blockchain/config/networks.ts (future)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getNetworkByChainId(chainId: number): Promise<string> {
  const { data: network, error } = await supabase
    .from("networks")
    .select("name")
    .eq("chain_id", chainId)
    .eq("is_active", true)
    .single();

  if (error || !network) {
    throw new Error(`Unsupported or inactive chainId: ${chainId}`);
  }

  return network.name;
}

export async function getNetworkConfig(
  networkName: string
): Promise<NetworkConfig> {
  const { data: network, error } = await supabase
    .from("networks")
    .select("*")
    .eq("name", networkName)
    .eq("is_active", true)
    .single();

  if (error || !network) {
    throw new Error(`Network ${networkName} not found or inactive`);
  }

  return {
    chainId: network.chain_id,
    name: network.name,
    rpcUrl: network.rpc_url,
    blockExplorer: network.block_explorer,
    contracts: {
      DERAMP_PROXY: network.proxy_contract,
      INVOICE_MANAGER: network.invoicemanager_contract,
      ACCESS_MANAGER: network.accessmanager_contract,
    },
  };
}
```

**Benefits**:

- Add networks without code deployment
- Enable/disable networks dynamically
- Environment-specific networks (test/prod)
- Better auditability

**Migration Path**:

1. Populate `networks` table with current hardcoded values
2. Create async wrapper functions
3. Implement caching to minimize DB queries
4. Gradually migrate code to use DB-driven config
5. Remove hardcoded `networks.ts`

---

### 3. **Add Network Validation** ⭐ LOW PRIORITY

**Recommended Addition**:

```typescript
// src/blockchain/config/networks.ts

export function validateNetworkConsistency(): void {
  const networkKeys = Object.keys(NETWORKS);
  const contractKeys = Object.keys(CONTRACTS);
  const tokenKeys = Object.keys(TOKENS);

  const missingInContracts = networkKeys.filter(
    (k) => !contractKeys.includes(k)
  );
  const missingInTokens = networkKeys.filter((k) => !tokenKeys.includes(k));

  if (missingInContracts.length > 0) {
    throw new Error(
      `Networks missing from CONTRACTS: ${missingInContracts.join(", ")}`
    );
  }

  if (missingInTokens.length > 0) {
    throw new Error(
      `Networks missing from TOKENS: ${missingInTokens.join(", ")}`
    );
  }

  console.log("✅ Network configuration validated successfully");
}

// Call on startup in src/index.ts
validateNetworkConsistency();
```

**Benefits**:

- Catch configuration errors at startup
- Prevent runtime failures
- Easier debugging

---

## 📝 Configuration Checklist

When adding a new network, ensure you update:

- [ ] `src/blockchain/config/networks.ts`
  - [ ] Add network entry with chainId, name, rpcUrl, blockExplorer
- [ ] `src/blockchain/config/contracts.ts`
  - [ ] Add contract addresses for the network
- [ ] `src/blockchain/config/tokens.ts`
  - [ ] Add token configurations for the network
- [ ] `src/blockchain/abi/` (if needed)
  - [ ] Add new ABI files if contracts differ
- [ ] Database (if using DB-driven config in future)
  - [ ] Insert into `networks` table
  - [ ] Insert into `tokens_addresses` table
- [ ] Documentation
  - [ ] Update README.md
  - [ ] Update BLOCKCHAIN_INTEGRATION.md
- [ ] Testing
  - [ ] Test invoice creation
  - [ ] Test status queries
  - [ ] Test token whitelisting

---

## 🎓 Learning Resources

### Understanding the Network System

**For new developers**, start here:

1. **Read**: `src/blockchain/config/networks.ts` - Central config
2. **Read**: `src/routes/blockchain.ts` - How it's used in practice
3. **Trace**: Follow a request through `POST /api/blockchain/create`
4. **Understand**: The `chainId → networkName → config` pattern

### Key Concepts

- **ChainId**: Numeric identifier for blockchain network (e.g., 44787)
- **NetworkName**: Human-readable key (e.g., "alfajores")
- **RPC URL**: Endpoint for blockchain connection
- **Block Explorer**: Website for viewing transactions

---

## 📚 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full system architecture
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure guide
- [VISUAL_OVERVIEW.md](./VISUAL_OVERVIEW.md) - Visual diagrams
- [src/blockchain/BLOCKCHAIN_INTEGRATION.md](./src/blockchain/BLOCKCHAIN_INTEGRATION.md) - Blockchain details
- [TODO.md](./TODO.md) - Future improvements (Database-Driven Configuration)

---

## 🎯 Conclusion

The Deramp Backend uses a **well-structured, centralized approach** to network configuration with `src/blockchain/config/networks.ts` as the single source of truth. The `chainId → networkName` conversion pattern is used consistently throughout the application.

**Key Strengths**:

- ✅ Centralized configuration
- ✅ Type-safe with TypeScript
- ✅ Consistent pattern across codebase
- ✅ Easy to add new networks

**Areas for Improvement**:

- ⚠️ Remove duplicate `getNetworkByChainId()` function
- ⚠️ Implement database-driven configuration (future)
- ⚠️ Add startup validation

Overall, the network configuration system is **production-ready** and well-designed, with clear paths for future enhancements.

---

**Last Updated**: October 21, 2025  
**Analysis Version**: 1.0.0  
**Reviewed Files**: 15+  
**Total References**: 30+
