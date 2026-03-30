# 🎯 Backend Integration Guide: Vault Event Listener

## 📋 Objective
Detect when payout funds arrive at the vault and notify users that their payment is ready to claim.

---

## 🔧 Contract Information

### Deployed Vaults

#### Celo Mainnet
- **cCOP Vault**: `0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8`
- **cREAL Vault**: `0x60Eb87BDa27917889B1ED651b3008a9d5cD38833`
- **RPC URL**: `https://forno.celo.org`
- **Chain ID**: `42220`
- **Explorer**: https://celoscan.io

#### Arbitrum One
- **MXNB Vault**: `0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8`
- **RPC URL**: `https://arb1.arbitrum.io/rpc`
- **Chain ID**: `42161`
- **Explorer**: https://arbiscan.io

---

## 📡 Event to Listen

The `PayoutVault` contract emits this event when it receives funds:

```solidity
event Deposit(
    address indexed commerce,  // Commerce address that created the payout
    uint256 amount,           // Deposited amount (in wei, 18 decimals)
    string payoutId           // Unique payout ID (UUID from your DB)
);
```

### Real Event Example
```javascript
{
  commerce: "0xD9ceee7c37e577A19a9B82a6A8D3bDB9203EbBfD",
  amount: "50000000000000000000", // 50 tokens with 18 decimals
  payoutId: "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🛠️ Simple Implementation with ethers.js

### 1. Install Dependencies
```bash
npm install ethers
```

### 2. Contract ABI (events only)

```json
[
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "commerce",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "payoutId",
        "type": "string"
      }
    ],
    "name": "Deposit",
    "type": "event"
  }
]
```

### 3. Listener Code (Complete Example)

```javascript
const { ethers } = require('ethers');

// Simplified ABI (event only)
const VAULT_ABI = [
  "event Deposit(address indexed commerce, uint256 amount, string payoutId)"
];

// Vault configuration
const VAULTS = {
  celo_ccop: {
    address: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
    rpcUrl: "https://forno.celo.org",
    chainId: 42220,
    tokenSymbol: "cCOP",
    decimals: 18
  },
  celo_creal: {
    address: "0x60Eb87BDa27917889B1ED651b3008a9d5cD38833",
    rpcUrl: "https://forno.celo.org",
    chainId: 42220,
    tokenSymbol: "cREAL",
    decimals: 18
  },
  arbitrum_mxnb: {
    address: "0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    tokenSymbol: "MXNB",
    decimals: 18
  }
};

// Function to start a vault listener
function startVaultListener(vaultConfig) {
  console.log(`🚀 Starting listener for ${vaultConfig.tokenSymbol} vault...`);
  
  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(vaultConfig.rpcUrl);
  
  // Create contract instance
  const vaultContract = new ethers.Contract(
    vaultConfig.address,
    VAULT_ABI,
    provider
  );
  
  // Listen to Deposit event
  vaultContract.on('Deposit', async (commerce, amount, payoutId, event) => {
    try {
      console.log(`\n💰 DEPOSIT DETECTED!`);
      console.log(`Vault: ${vaultConfig.tokenSymbol}`);
      console.log(`Payout ID: ${payoutId}`);
      console.log(`Commerce: ${commerce}`);
      console.log(`Amount (wei): ${amount.toString()}`);
      
      // Convert amount from wei to normal units
      const amountFormatted = ethers.formatUnits(amount, vaultConfig.decimals);
      console.log(`Amount: ${amountFormatted} ${vaultConfig.tokenSymbol}`);
      
      // Transaction info
      console.log(`TX Hash: ${event.log.transactionHash}`);
      console.log(`Block: ${event.log.blockNumber}`);
      
      // 🔥 YOUR BUSINESS LOGIC GOES HERE
      await handleDepositEvent({
        payoutId,
        commerce,
        amount: amountFormatted,
        tokenSymbol: vaultConfig.tokenSymbol,
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        chainId: vaultConfig.chainId
      });
      
    } catch (error) {
      console.error('❌ Error processing deposit event:', error);
      // You can implement retry system or alerts here
    }
  });
  
  // Handle provider errors
  provider.on('error', (error) => {
    console.error(`❌ Provider error for ${vaultConfig.tokenSymbol}:`, error);
  });
  
  console.log(`✅ Listener active for ${vaultConfig.tokenSymbol}`);
}

// Function that handles the event (your business logic goes here)
async function handleDepositEvent(depositData) {
  const { payoutId, commerce, amount, tokenSymbol, txHash, blockNumber, chainId } = depositData;
  
  // 1. Update database status
  console.log(`📝 Updating payout ${payoutId} status to READY_TO_CLAIM...`);
  await updatePayoutStatus(payoutId, {
    status: 'READY_TO_CLAIM',
    vault_tx_hash: txHash,
    vault_block_number: blockNumber,
    vault_chain_id: chainId,
    deposited_amount: amount,
    deposit_timestamp: new Date()
  });
  
  // 2. Send notification email
  console.log(`📧 Sending claim notification email...`);
  await sendClaimEmail(payoutId);
  
  // 3. (Optional) Webhook/WebSocket for frontend
  console.log(`🔔 Notifying frontend...`);
  await notifyFrontend(payoutId, 'READY_TO_CLAIM');
  
  console.log(`✅ Deposit processed successfully for payout ${payoutId}`);
}

// Helper function: Update DB (implement with your ORM/query builder)
async function updatePayoutStatus(payoutId, data) {
  // Example with raw SQL
  // await db.query(`
  //   UPDATE payouts 
  //   SET status = $1, 
  //       vault_tx_hash = $2, 
  //       vault_block_number = $3,
  //       vault_chain_id = $4,
  //       deposited_amount = $5,
  //       deposit_timestamp = $6
  //   WHERE id = $7
  // `, [
  //   data.status,
  //   data.vault_tx_hash,
  //   data.vault_block_number,
  //   data.vault_chain_id,
  //   data.deposited_amount,
  //   data.deposit_timestamp,
  //   payoutId
  // ]);
  
  console.log('TODO: Implement DB update');
}

// Helper function: Send email (implement with your email service)
async function sendClaimEmail(payoutId) {
  // TODO: Get payout data from DB
  // TODO: Send email with claim link
  // Example: https://yourapp.com/claim/${payoutId}
  
  console.log('TODO: Implement email sending');
}

// Helper function: Notify frontend (optional)
async function notifyFrontend(payoutId, status) {
  // TODO: Implement with WebSocket, Server-Sent Events, or simply
  // frontend can poll the endpoint GET /api/payouts/:id/status
  
  console.log('TODO: Implement frontend notification');
}

// 🚀 Start all listeners
function startAllListeners() {
  console.log('🎯 Starting all vault listeners...\n');
  
  startVaultListener(VAULTS.celo_ccop);
  startVaultListener(VAULTS.celo_creal);
  startVaultListener(VAULTS.arbitrum_mxnb);
  
  console.log('\n✅ All listeners are running!');
  console.log('Waiting for deposit events...\n');
}

// Execute
startAllListeners();

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down listeners...');
  process.exit(0);
});
```

---

## 🏃 How to Run

### Option 1: Standalone Script
```bash
# Create file
touch vault-listener.js

# Copy the code above
# Run
node vault-listener.js
```

### Option 2: Integrated in your Backend (Recommended)
```javascript
// In your app.js or index.js
const { startAllListeners } = require('./services/blockchain/vaultListener');

// Start listeners after connecting DB
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start blockchain listeners
  await startAllListeners();
});
```

---

## 📊 Required Database Columns for `payouts` Table

```sql
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS vault_tx_hash VARCHAR(100);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS vault_block_number INTEGER;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS vault_chain_id INTEGER;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS deposited_amount DECIMAL(20, 8);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS deposit_timestamp TIMESTAMP;

-- Possible statuses:
-- 'PENDING': Created, waiting for funds
-- 'PROCESSING': Swap in progress
-- 'READY_TO_CLAIM': Funds in vault, ready to claim
-- 'CLAIMED': User claimed the funds
-- 'FAILED': Process failed
```

---

## 📧 Suggested Email Template

```javascript
const emailTemplate = (payoutData) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0070f3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #0070f3; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #0070f3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Your Payment is Ready!</h1>
    </div>
    <div class="content">
      <p>Hi ${payoutData.to_name},</p>
      
      <p>Great news! Your payment is ready to claim:</p>
      
      <p class="amount">${payoutData.to_amount} ${payoutData.to_currency}</p>
      
      <p>Click the button below to claim your funds:</p>
      
      <a href="${process.env.FRONTEND_URL}/claim/${payoutData.id}" class="button">
        Claim Your Payment
      </a>
      
      <p><small>You will need to verify your email address to receive the funds.</small></p>
      
      <p>If you have any questions, feel free to reply to this email.</p>
      
      <p>Best regards,<br><strong>Voulti Team</strong></p>
    </div>
  </div>
</body>
</html>
`;
```

---

## 🧪 How to Test

### 1. Run the listener
```bash
node vault-listener.js
```

### 2. Create a payout from the frontend
- The listener will automatically detect when funds arrive at the vault
- You'll see logs in the console with all the information

### 3. Verify on the Explorer
- **Celo**: https://celoscan.io/address/0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8
- **Arbitrum**: https://arbiscan.io/address/0x77e94a9BC69409150Ca3a407Da6383CC626e7CC8

---

## ⚠️ Production Considerations

1. **Persistence**: The listener must run constantly
   - Use **PM2** or **systemd** to keep it alive
   - Implement auto-restart on error

2. **Missed Events**: If the listener crashes, check historical events
   ```javascript
   // Query events from last processed block
   const events = await vaultContract.queryFilter(
     'Deposit',
     lastProcessedBlock,
     'latest'
   );
   ```

3. **Duplicates**: Save `txHash` in DB to avoid processing the same event twice

4. **Logging**: Implement proper logging (Winston, Pino, etc.)

5. **Alerts**: Notify if the listener crashes or doesn't receive events for a long time

---

## 📞 Summary for Backend Developer

**What you need to do:**

1. ✅ Copy the listener code
2. ✅ Add columns to the `payouts` table
3. ✅ Implement the `updatePayoutStatus()` function with your DB
4. ✅ Implement the `sendClaimEmail()` function with your email service
5. ✅ Run the listener as a separate process or integrated in your app
6. ✅ Create the `GET /api/payouts/:id/status` endpoint for frontend to query

**That's it!** The listener does the heavy lifting automatically.
