# 🎯 Backend API - Recipient Portal

Complete specification and implementation guide for the recipient portal API.

**TL;DR**: Only 3 endpoints needed:

1. `GET /api/payouts/:id/public` - Show payout (no auth)
2. `POST /api/recipients/initialize` - Bind wallet to Funded payouts (auth)
3. `POST /api/payouts/:id/claim` - Execute claim (no auth)

---

## 📋 Overview

The recipient portal allows users to:

1. View a payout before logging in (public endpoint)
2. Login and see all their pending payouts
3. Claim a payout (backend executes withdrawFor on vault)

**Note**: Balances are queried on-chain by frontend. Withdrawals are done directly on-chain by user's wallet.

---

## 🔐 Authentication

- **Method**: Bearer token from Privy
- **Header**: `Authorization: Bearer <privy_token>`
- **Validation**: Backend should validate Privy token and extract user's email/wallet

---

## 📡 Required Endpoints (MVP)

Only 3 endpoints needed for MVP:

1. `GET /api/payouts/:payoutId/public` - View payout (no auth)
2. `POST /api/recipients/initialize` - Sync wallet to FUNDED payouts (every login)
3. `POST /api/recipients/payouts/:payoutId/claim` - Claim payout (executes withdrawFor)

---

### 1. Get Payout Details (Public)

**Purpose**: Allow anyone with the link to see payout details before login

```http
GET /api/payouts/:payoutId/public
```

**Auth**: None (public endpoint)

**Response** (200):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.0,
  "currency": "COP",
  "from_commerce": {
    "id": "commerce-uuid",
    "name": "Acme Corporation"
  },
  "status": "Funded", // Pending | Funded | Claimed
  "created_at": "2024-10-21T10:30:00Z",
  "recipient_email": "user@example.com" // Partially hidden: u***@example.com
}
```

**Error Responses**:

- `404`: Payout not found
- `410`: Payout expired

---

### 2. Sync Pending Payouts

**Purpose**: Automatically bind wallet to any payouts that don't have a wallet yet (called on every login)

```http
POST /api/recipients/initialize
```

**Auth**: Required (Bearer token from Privy)

**Request Body**: None (email and wallet from token)

**Backend Process**:

1. **Extract from Privy token**:

   - `email` from token
   - `wallet_address` from token (Privy embedded wallet)

2. **🔒 CRITICAL: Bind wallet to payouts without wallet**:

   ```sql
   UPDATE payouts
   SET to_address = :wallet_address
   WHERE to_email = :email
     AND to_address IS NULL
     AND status = 'Funded'  -- Only Funded payouts (ready for claim)
   ```

   **Security**:

   - ✅ Only updates payouts where email matches (from verified token)
   - ✅ Only updates payouts with NULL wallet (not already bound)
   - ✅ Only updates unclaimed payouts
   - ✅ Cannot hijack someone else's payouts (email verification)

3. **Return count of bound payouts**:

**Response** (200):

```json
{
  "success": true,
  "email": "user@example.com",
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "payouts_bound": 3
}
```

**Error Responses**:

- `401`: Unauthorized (invalid Privy token)
- `500`: Database error

**When to call**:

- **Call on EVERY login** (not just first time)
- Idempotent - safe to call multiple times
- Ensures any new payouts since last login get wallet assigned
- Example: User receives payout #1 → logs in → wallet bound. Later receives payout #2 → logs in again → wallet bound to #2.

---

### 3. Claim Payout

**Purpose**: Execute withdrawFor on vault and transfer funds to recipient's wallet

```http
POST /api/payouts/:payoutId/claim
```

**Auth**: NOT required (public endpoint - anyone can trigger claim once wallet is bound)

**Request Body**: None

**Backend Process**:

1. **Validate payout**:

   - Validate `payoutId` exists
   - Validate `status === "Funded"`
   - **🔒 CRITICAL**: Validate `claimed_at IS NULL` (not already claimed)
   - **🔒 CRITICAL**: Validate `to_address IS NOT NULL` (wallet must be bound)

2. **Execute blockchain transaction**:
   - Execute `vault.withdrawFor(payoutId, amount, to_address)`
3. **Update DB**:

   ```sql
   UPDATE payouts SET
     status = 'Claimed',
     claimed_at = NOW(),
     claim_tx_hash = :tx_hash
   WHERE id = :payoutId
   ```

   **Note**: `to_address` was already set in step 3. Real balance is on-chain, queried by frontend.

**Response** (200):

```json
{
  "success": true,
  "payout": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.0,
    "currency": "COP",
    "status": "Claimed",
    "claimed_at": "2024-10-23T16:45:00Z",
    "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  }
}
```

**Error Responses**:

- `404`: Payout not found
- `409`: Payout already claimed (`claimed_at IS NOT NULL`)
- `422`: Payout not funded yet (`status != "Funded"`)
- `422`: Wallet not bound yet (`to_address IS NULL`)
- `500`: Blockchain transaction failed

---

## 🗄️ Database Schema Requirements

### `payouts` table (ensure these columns exist)

Required columns for recipient functionality:

```sql
-- Recipient info
to_email VARCHAR(255) NOT NULL        -- Recipient's email
to_address VARCHAR(42) NULL           -- Recipient's wallet (NULL until first login)

-- Claim tracking
claimed_at TIMESTAMP NULL             -- When claimed
claim_tx_hash VARCHAR(66) NULL        -- Blockchain transaction hash

-- Indexes for performance
CREATE INDEX idx_to_email ON payouts(to_email);
CREATE INDEX idx_to_address ON payouts(to_address);
```

---

## 🔒 Security Considerations

### Wallet Binding (Most Important)

- **Security Model**: Once `to_address` is bound via `/initialize`, only that wallet can receive funds
- The smart contract (`withdrawFor`) sends funds to `payout.to_address` (stored in DB)
- Even if someone else calls the claim endpoint, funds go to the correct wallet
- **No authentication needed on claim** because the destination is already locked in the DB

### Double-Claim Prevention

- Check `claimed_at IS NULL` before allowing claim
- Use database transaction to ensure atomicity

### Wallet Binding Flow

**Two-Step Process**:

1. **Step 1: Login + Initialize** (binds wallet to email)

   - User receives email with payout link
   - User logs in with Privy (creates wallet)
   - Frontend calls `/api/recipients/initialize`
   - Backend binds wallet to all Funded payouts for that email
   - Security: Email verified by Privy token

2. **Step 2: Claim** (transfers funds to bound wallet)
   - Anyone (frontend, backend cron, user) can call `/api/payouts/:payoutId/claim`
   - Backend validates `to_address IS NOT NULL` (wallet bound)
   - Backend calls `withdrawFor(payoutId, amount, to_address)`
   - Funds go to the wallet bound in step 1
   - Security: Destination wallet locked in DB, cannot be changed

**Why this is secure**:

- ✅ Wallet binding requires verified Privy login (email validation)
- ✅ Once bound, `to_address` never changes
- ✅ Claim endpoint just executes transfer to pre-bound wallet
- ✅ Even if attacker calls claim, funds go to correct wallet

**Attack scenarios prevented**:

- ❌ Attacker finds payoutId → Calls claim → Funds go to legitimate user's wallet
- ❌ Attacker tries to initialize with their wallet → Email mismatch, no payouts bound
- ❌ Attacker tries to change `to_address` → Not possible (no endpoint for that)

### Rate Limiting

- Implement rate limiting on claim endpoint (max 5 attempts per minute)
- Prevent brute force attacks

---

## 🔄 Payout Status Flow

```
Pending  → Payout created, waiting for funds
   ↓
Funded   → Vault received Deposit event
   ↓
Claimed  → Recipient claimed, funds in their wallet
```

---

## 💻 Implementation Examples

### Endpoint 1: Get Public Payout

```typescript
app.get("/api/payouts/:id/public", async (req, res) => {
  const payout = await db.payouts.findById(req.params.id);

  if (!payout) {
    return res.status(404).json({ error: "Payout not found" });
  }

  // Mask email for privacy
  const maskedEmail = payout.to_email.replace(/(.{1})(.*)(@.*)/, "$1***$3");

  res.json({
    id: payout.id,
    amount: payout.amount,
    currency: payout.to_fiat,
    from_commerce: {
      id: payout.commerce_id,
      name: payout.commerce_name,
    },
    status: payout.status,
    created_at: payout.created_at,
    recipient_email: maskedEmail,
  });
});
```

### Endpoint 2: Initialize Recipient

```typescript
import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

app.post("/api/recipients/initialize", async (req, res) => {
  // Validate Privy token
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await privy.verifyAuthToken(token);

  const email = user.email?.address;
  const wallet = user.wallet?.address;

  // Bind wallet to all Funded payouts for this email
  const result = await db.payouts.updateMany(
    {
      to_email: email,
      to_address: null,
      status: "Funded",
    },
    {
      to_address: wallet,
    }
  );

  res.json({
    success: true,
    email,
    wallet_address: wallet,
    payouts_bound: result.count,
  });
});
```

### Endpoint 3: Claim Payout

```typescript
import { ethers } from "ethers";

app.post("/api/payouts/:id/claim", async (req, res) => {
  const payoutId = req.params.id;
  const payout = await db.payouts.findById(payoutId);

  // Validations
  if (!payout) return res.status(404).json({ error: "Not found" });
  if (payout.status !== "Funded")
    return res.status(422).json({ error: "Not funded" });
  if (payout.claimed_at)
    return res.status(409).json({ error: "Already claimed" });
  if (!payout.to_address)
    return res.status(422).json({ error: "Wallet not bound" });

  try {
    // Get vault config for this currency
    const vaultConfig = getVaultConfig(payout.to_fiat);
    const provider = new ethers.JsonRpcProvider(vaultConfig.rpcUrl);
    const signer = new ethers.Wallet(
      process.env.VAULT_OWNER_PRIVATE_KEY,
      provider
    );
    const vault = new ethers.Contract(vaultConfig.address, VAULT_ABI, signer);

    // Execute withdrawFor
    const amountWei = ethers.parseUnits(payout.amount.toString(), 18);
    const tx = await vault.withdrawFor(payoutId, amountWei, payout.to_address);
    const receipt = await tx.wait();

    // Update database
    await db.payouts.update(payoutId, {
      status: "Claimed",
      claimed_at: new Date(),
      claim_tx_hash: receipt.hash,
    });

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.to_fiat,
        status: "Claimed",
        claimed_at: new Date(),
        tx_hash: receipt.hash,
      },
    });
  } catch (error) {
    console.error("Claim failed:", error);
    res.status(500).json({ error: "Transaction failed" });
  }
});

function getVaultConfig(currency) {
  const vaults = {
    COP: {
      address: "0x8d0D5D852062017F312a00e39f3B2311CF12aCbf",
      rpcUrl: "https://forno.celo.org",
    },
    REAL: {
      address: "0xB7d2300eA9f301F2F782bf52F452658E1F68d45a",
      rpcUrl: "https://forno.celo.org",
    },
    MXN: {
      address: "0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
    },
  };
  return vaults[currency];
}
```

---

## 🧪 Testing

```bash
# 1. Get public payout
curl http://localhost:3000/api/payouts/test-id/public

# 2. Initialize (bind wallet)
curl -X POST http://localhost:3000/api/recipients/initialize \
  -H "Authorization: Bearer <privy_token>"

# 3. Claim payout
curl -X POST http://localhost:3000/api/payouts/test-id/claim
```

---

## 📝 Notes for Backend Developer

1. **No separate recipients table**: All recipient data is in the `payouts` table (`to_email`, `to_address`). No need for extra tables.

2. **Balance querying**: Balances are NOT tracked in database. Frontend queries them directly from blockchain:

   - Use ethers.js to call `token.balanceOf(recipientWallet)`
   - Query each token contract (cCOP, cREAL, MXNB) on their respective chains
   - No database tracking needed

3. **Privy integration**: Install `@privy-io/server-auth` to validate tokens and extract user data.

4. **Vault interaction**: Set `VAULT_OWNER_PRIVATE_KEY` in `.env` to execute `withdrawFor`.

5. **Multi-currency vaults**: See addresses in code example above (COP/REAL on Celo, MXN on Arbitrum).

---

**Last Updated**: October 2025
