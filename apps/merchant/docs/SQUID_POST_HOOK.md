# Squid Post-Hook Integration

## Overview

The Squid post-hook automatically deposits swapped tokens into the `PayoutVault` contract after each cross-chain swap completes. This ensures that payout funds are securely held in the vault until the end-user claims them through email verification.

## How It Works

### Flow Diagram

```
1. User creates payout
   ↓
2. Backend creates payout record (generates payoutId)
   ↓
3. Frontend initiates Squid swap with post-hook
   ↓
4. Squid executes cross-chain swap
   ↓
5. Squid calls PayoutVault.deposit() ← POST-HOOK
   ↓
6. Funds locked in vault with payoutId
   ↓
7. User claims via email verification
   ↓
8. Backend calls withdrawFor() to release funds
```

### Technical Implementation

#### 1. Post-Hook Generation (`squid.service.ts`)

The `createVaultPostHook()` function generates the post-hook configuration:

```typescript
createVaultPostHook(payout: Payout): SquidPostHook | null {
  // Get vault address for destination chain and token
  const vaultAddress = getVaultAddress(payout.to_chain, payout.to_token_symbol)
  
  if (!vaultAddress) {
    console.warn(`No vault configured for ${payout.to_token_symbol}`)
    return null
  }

  // Encode deposit function call
  const vaultInterface = new ethers.Interface(PayoutVaultABI)
  const callData = vaultInterface.encodeFunctionData("deposit", [
    payout.from_address, // commerce address
    "0",                 // amount (Squid replaces with actual balance)
    payout.id,           // payoutId
  ])

  return {
    chainType: "evm",
    callType: "FULL_TOKEN_BALANCE", // Use all received tokens
    target: vaultAddress,
    value: "0",
    callData: callData,
    payload: {
      tokenAddress: payout.to_token_address,
      inputPos: 1, // Position of amount parameter
    },
    estimatedGas: "200000",
    description: `Deposit ${payout.to_token_symbol} to PayoutVault`,
  }
}
```

#### 2. Route Parameters (`createRouteParams`)

The post-hook is automatically included in Squid route parameters:

```typescript
createRouteParams(payout: Payout): SquidRouteParams {
  const postHook = this.createVaultPostHook(payout)
  
  // If post-hook exists, route to vault address
  const finalToAddress = postHook 
    ? postHook.target        // Vault address
    : payout.from_address    // Fallback
  
  const params = {
    fromAddress: payout.from_address,
    fromChain: payout.from_chain.toString(),
    fromToken: payout.from_token_address,
    fromAmount: fromAmountInWei.toString(),
    toChain: payout.to_chain.toString(),
    toToken: payout.to_token_address,
    toAddress: finalToAddress,
    enableForecall: true,
    quoteOnly: false,
  }
  
  // Add post-hook if configured
  if (postHook) {
    params.postHook = postHook
  }
  
  return params
}
```

## Post-Hook Configuration

### Key Parameters

- **`chainType`**: `"evm"` - Post-hook runs on EVM-compatible chains
- **`callType`**: `"FULL_TOKEN_BALANCE"` - Squid sends all received tokens to vault
- **`target`**: Vault contract address (varies by chain/token)
- **`callData`**: Encoded `deposit(address commerce, uint256 amount, string payoutId)` call
- **`payload.inputPos`**: `1` - Position where Squid injects the actual amount
  - Position 0: `commerce` (address)
  - Position 1: `amount` (uint256) ← Squid replaces "0" with actual balance
  - Position 2: `payoutId` (string)

### Dynamic Vault Selection

The system automatically selects the correct vault based on:
- **Destination Chain ID** (`payout.to_chain`)
- **Token Symbol** (`payout.to_token_symbol`)

Example:
```typescript
// For cCOP payout on Celo (chain 42220)
const vaultAddress = getVaultAddress(42220, "cCOP")
// Returns: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8

// For MXNB payout on Arbitrum (chain 42161)
const vaultAddress = getVaultAddress(42161, "MXNB")
// Returns: 0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
```

## Security Features

### 1. PayoutId Binding
Each deposit is linked to a unique `payoutId` from the database:
- Prevents arbitrary withdrawals
- Links funds to specific payout records
- Enables email-verified claims

### 2. Commerce Association
The vault links each `payoutId` to the originating commerce:
```solidity
mapping(string => address) public payoutToCommerce;
```
This prevents:
- Cross-commerce withdrawal attacks
- Unauthorized fund access

### 3. Double-Claim Prevention
The vault tracks claimed payouts:
```solidity
mapping(string => bool) public claimedPayouts;
```
Once a payout is claimed via `withdrawFor()`, it cannot be claimed again.

## Debugging

### Console Logs

The post-hook generates detailed logs:

```javascript
// Vault selection
🏦 Generating vault post-hook: {
  vault: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
  commerce: "0x40C51B062EDcC4cfA65275179aa897222417F3d1",
  payoutId: "660e8400-e29b-41d4-a716-446655440111",
  token: "cCOP",
  chain: 42220
}

// Route destination
📍 Route destination: {
  toAddress: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
  hasPostHook: true,
  postHookTarget: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8"
}
```

### Common Issues

#### ⚠️ No vault configured
```
⚠️ No vault configured for BRL1 on chain 137
```
**Solution:** Deploy a vault for that token/chain and update `frontend/blockchain/vaults.ts`

#### ⚠️ Post-hook reverted
**Possible causes:**
- Vault doesn't have approval for token
- PayoutId already exists (duplicate)
- Gas estimation too low

**Solution:** Check vault events on block explorer for revert reason

## Testing

### 1. Test on Testnet First

Deploy to Alfajores (Celo testnet) before mainnet:
```typescript
// frontend/blockchain/vaults.ts
celoTestnet: {
  cCOP: {
    address: "0xYourTestnetVaultAddress",
    // ...
  }
}
```

### 2. Verify Post-Hook Execution

After a swap, check the vault on the block explorer:
1. Go to Celoscan/Arbiscan
2. Search for vault address
3. Check "Internal Transactions" tab
4. Verify `deposit()` was called with correct parameters

### 3. Monitor Logs

Watch for post-hook logs in console:
```javascript
console.log("🏦 Generating vault post-hook:", ...)
console.log("📍 Route destination:", ...)
```

## Configuration Files

### Vaults Configuration
**File:** `frontend/blockchain/vaults.ts`

Update with deployed vault addresses:
```typescript
export const VAULTS = {
  celo: {
    cCOP: {
      address: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
      // ...
    },
  },
}
```

### ABI Export
**Script:** `contracts/scripts/copy-abis.sh`

Run after contract updates:
```bash
cd contracts
forge build
./scripts/copy-abis.sh
```

## Backend Integration

The backend must implement `withdrawFor()` to release funds after email verification:

```typescript
// Pseudo-code for backend
async function claimPayout(payoutId: string, userEmail: string) {
  // 1. Verify email matches payout
  const payout = await db.payouts.findById(payoutId)
  if (payout.to_email !== userEmail) {
    throw new Error("Email mismatch")
  }
  
  // 2. Get user's wallet address (from Privy or user input)
  const userWallet = await getUserWallet(userEmail)
  
  // 3. Call vault.withdrawFor()
  const vault = new ethers.Contract(vaultAddress, VaultABI, backendSigner)
  const tx = await vault.withdrawFor(
    userWallet,           // to: user's wallet
    payout.to_amount,     // amount
    payoutId              // payoutId
  )
  await tx.wait()
  
  // 4. Update payout status
  await db.payouts.update(payoutId, { status: "claimed" })
}
```

## Further Reading

- [Squid Router Documentation](https://docs.squidrouter.com/)
- [Post-Hook Specification](https://docs.squidrouter.com/api-reference/post-hooks)
- [PayoutVault Contract](../../contracts/src/PayoutVault.sol)
- [Frontend Blockchain Config](../blockchain/README.md)
- [Deployment Guide](../../contracts/docs/DEPLOYMENT.md)

