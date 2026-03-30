# 📊 Technical Analysis: On-Chain Event Detection System

## 🎯 Executive Summary

This document explains how the on-chain deposit/payment detection system works in Deramp Backend, including the current method, known issues ("filter not found" from Alchemy), and improvement recommendations.

---

## 🔍 Technical Questions and Answers

### **1. How are you detecting on-chain deposits/payments?**

The system uses **real-time event listeners** with `contract.on('Deposit', ...)` to detect events from the `PayoutVault` contract on Celo and Arbitrum networks.

#### **Current Method: Event Listeners (Real-Time)**

```typescript
// src/blockchain/services/VaultListener.ts

private startEventListening(): void {
  if (this.isPolling) return;

  this.isPolling = true;

  // Create contract instance
  this.contract = new ethers.Contract(
    this.vaultConfig.address,
    VAULT_ABI,
    this.provider
  );

  // Listen to Deposit event with error handling
  this.contract!.on('Deposit', async (commerce, amount, payoutId, event) => {
    try {
      Logger.success('VAULT', `DEPOSIT EVENT DETECTED!`, {
        vault: this.vaultConfig.token.symbol,
        payoutId,
        commerce,
        amount: amount.toString(),
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });

      // Process the deposit event
      await this.handleDepositEvent({
        payoutId,
        commerce,
        amount: amountFormatted,
        tokenSymbol: this.vaultConfig.token.symbol,
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        chainId: this.vaultConfig.network.chainId
      });
    } catch (error) {
      Logger.error('VAULT', `Failed to process deposit event`, error);
    }
  });
}
```

**Explanation:**

- Subscribes to events using `contract.on('Deposit', ...)`
- Listener executes in real-time when a `Deposit` event is emitted in the contract
- Does not require polling or saving the last processed block
- Depends 100% on RPC connection to detect events

---

### **2. Why are you receiving "filter not found" from Alchemy?**

**Answer:** The "filter not found" error should NOT occur with the current method (`contract.on()`), as it uses WebSockets internally.

**However:** If Alchemy has issues with the WebSocket connection, ethers.js will attempt to create traditional RPC filters (`eth_newFilter`), and if those filters are lost (e.g., due to reconnection or node restart), Alchemy responds with "filter not found".

**Common causes:**

1. **RPC node restart** - Filters are lost on restart
2. **WebSocket connection timeout** - Connection closes and attempts to recreate
3. **Alchemy rate limiting** - Too many requests cause disconnections

---

### **3. How are you creating the provider?**

```typescript
// src/blockchain/services/VaultListener.ts:153-156

this.provider = new ethers.JsonRpcProvider(this.vaultConfig.rpcUrl, {
  name: this.vaultConfig.network.name,
  chainId: this.vaultConfig.network.chainId,
});

// Create contract instance
this.contract = new ethers.Contract(
  this.vaultConfig.address,
  VAULT_ABI,
  this.provider
);
```

**Provider Type:** `JsonRpcProvider` (HTTP/WebSocket)

**Configurable RPC URLs:**

```typescript
const RPC_URLS = {
  celo: process.env.CELO_RPC_URL || "https://forno.celo.org",
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
};
```

**Problem:** `JsonRpcProvider` can use HTTP or WebSocket depending on the URL. Alchemy URLs with `https://` use HTTP (implicit polling), not pure WebSocket.

---

### **4. What ABI and contract address are you using?**

#### **Contract ABI (Events Only):**

```typescript
// src/blockchain/services/VaultListener.ts:16-18

const VAULT_ABI = [
  "event Deposit(address indexed commerce, uint256 amount, string payoutId)",
];
```

#### **Contract Addresses (By Network and Token):**

```typescript
// src/blockchain/config/vaults.ts

export const VAULTS = {
  celo: {
    cCOP: {
      address: "0x8d0D5D852062017F312a00e39f3B2311CF12aCbf", // Celo Mainnet
      token: {
        address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // cUSD
        symbol: "cCOP",
        decimals: 18,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
    cREAL: {
      address: "0xB7d2300eA9f301F2F782bf52F452658E1F68d45a", // Celo Mainnet
      token: {
        address: "0xe8537a3d056DA446677B9E9d6c5dB33Ea3e24d",
        symbol: "cREAL",
        decimals: 18,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
    BRLA: {
      address: "0x0B3D083289C71FdbD4921448B4f1ED96B6E9f402", // Celo Mainnet
      token: {
        address: "0x20Be1c8F3504A3BAbc8d11bD52c4c9c3d41aE3C", // BRLA
        symbol: "BRLA",
        decimals: 6,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
  },
  arbitrum: {
    MXNB: {
      address: "0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00", // Arbitrum One
      token: {
        address: "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA", // MXNB
        symbol: "MXNB",
        decimals: 6,
      },
      network: {
        chainId: 42161,
        name: "Arbitrum One",
      },
    },
    MXN: {
      // Alias for MXNB
      address: "0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00",
      token: {
        address: "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA",
        symbol: "MXNB",
        decimals: 6,
      },
      network: {
        chainId: 42161,
        name: "Arbitrum One",
      },
    },
  },
};
```

---

### **5. Are you using provider.on(...), contract.on(...), or polling?**

**Answer:** Uses **`contract.on('Deposit', ...)`** to listen to events in real-time.

```typescript
// Main Method: contract.on()
this.contract!.on("Deposit", async (commerce, amount, payoutId, event) => {
  // Process event...
});

// Error Handler: provider.on()
this.provider!.on("error", (error) => {
  Logger.error("VAULT", `Provider error`, error);
  setTimeout(() => {
    this.restart();
  }, 5000);
});
```

**Polling code also exists (NOT ACTIVE):**

```typescript
private async pollForEvents(): Promise<void> {
  const currentBlock = await this.provider!.getBlockNumber();
  const fromBlock = this.lastProcessedBlock + 1;
  const toBlock = Math.min(currentBlock, this.lastProcessedBlock + 10);

  const events = await this.contract!.queryFilter(
    'Deposit',
    fromBlock,
    toBlock
  );

  // Process events...
  this.lastProcessedBlock = toBlock;
}
```

**Code status:** Polling exists but is NOT currently used. Only `contract.on()` with event listeners is used.

---

### **6. Do you save the last processed block per network in the database?**

**Answer:** NO. The current system does NOT save the last processed block in the database.

```typescript
// src/blockchain/services/VaultListener.ts:127

private lastProcessedBlock = 0; // In memory only

getMetrics() {
  return {
    ...this.metrics,
    vault: this.vaultConfig.token.symbol,
    isPolling: this.isPolling,
    lastProcessedBlock: this.lastProcessedBlock // MEMORY ONLY
  };
}
```

**Critical Problem:** If the process crashes:

- Last processed block is lost
- No way to recover lost events
- Depends 100% on WebSocket connection working

---

### **7. What do you do when the node responds "filter not found"?**

**Answer:** Attempts to restart the listener automatically.

```typescript
// Error handler for provider
this.provider!.on('error', (error) => {
  Logger.error('VAULT', `Provider error for ${this.vaultConfig.token.symbol}`, error);

  setTimeout(() => {
    if (this.isPolling) {
      Logger.info('VAULT', `Attempting to restart listener for ${this.vaultConfig.token.symbol}...`);
      this.restart();
    }
  }, 5000);
});

// Restart method
async restart(): Promise<void> {
  try {
    Logger.info('VAULT', `Restarting vault listener`, { vault: this.vaultConfig.token.symbol });
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.start();
    Logger.success('VAULT', `Vault listener restarted successfully`);
  } catch (error) {
    Logger.error('VAULT', `Failed to restart vault listener`, error);
  }
}
```

**Problem:** If an event occurs during restart (5 second delay), **it is lost forever** because there's no saved last processed block.

---

### **8. When do you send the "you have a pending payout to claim" email?**

**Function that sends the email:**

```typescript
// src/blockchain/services/VaultListener.ts:521-577

private async sendClaimEmail(payoutId: string): Promise<void> {
  try {
    // Get payout data from database
    const { data: payout } = await supabase
      .from('payouts')
      .select('*, commerces!inner(name)')
      .eq('id', payoutId)
      .single();

    if (!payout.to_email) {
      Logger.warn('VAULT', `No recipient email for payout`, { payoutId });
      return;
    }

    // Generate email
    const emailHtml = this.generateClaimEmailHtml(payout);
    const emailText = this.generateClaimEmailText(payout);

    // Send via Resend
    await resend.emails.send({
      from: 'Voulti <noreply@notifications.voulti.com>',
      to: [payout.to_email],
      subject: `${payout.commerces?.name || 'Voulti Commerce'} has paid you ${payout.to_amount} ${payout.to_currency}`,
      html: emailHtml,
      text: emailText
    });

    Logger.success('VAULT', `Claim email sent successfully`);
  } catch (error) {
    Logger.error('VAULT', `Failed to send claim email`, error);
  }
}
```

**Complete flow:**

```
1. Deposit event emitted on-chain
   ↓
2. contract.on('Deposit', ...) detects event
   ↓
3. handleDepositEvent() processes event
   ↓
4. updatePayoutStatus() updates DB (status='Funded')
   ↓
5. sendClaimEmail() sends email to recipient
   ↓
6. Recipient receives email with link to claim
```

**Does it depend 100% on capturing the on-chain event in real-time?**  
**YES.** If the event is not captured, the email is never sent.

---

## 🚨 Identified Problems

### **1. Event Loss**

- ❌ No saved last processed block
- ❌ If process crashes, events are lost
- ❌ Depends 100% on WebSocket connection

### **2. Alchemy "Filter Not Found"**

- ❌ Filters lost during reconnections
- ❌ No recovery of lost events
- ❌ Requires manual listener restart

### **3. No Recovery of Lost Events**

- ❌ No way to detect events that occurred during downtime
- ❌ No fallback polling
- ❌ Only works in real-time

---

## 💡 Proposed Solutions

### **Option A: WebSocket + Block Saving** ⭐ RECOMMENDED

**Advantages:**

- ✅ Maintains real-time detection
- ✅ Saves last block in DB for recovery
- ✅ Can recover lost events
- ✅ More robust than current solution

**Implementation:**

```typescript
// 1. Save last processed block in DB
interface VaultListenerState {
  vault_key: string;
  last_processed_block: number;
  network: string;
  updated_at: timestamp;
}

// 2. On startup, search for last saved block
async start(): Promise<void> {
  // Load last block from DB
  const { data: state } = await supabase
    .from('vault_listener_states')
    .select('last_processed_block')
    .eq('vault_key', this.vaultKey)
    .single();

  if (state) {
    this.lastProcessedBlock = state.last_processed_block;
    Logger.info('VAULT', `Loaded last processed block from DB`, {
      block: this.lastProcessedBlock
    });
  }

  // Rest of code same...

  // Start event listener
  this.startEventListening();
}

// 3. Update DB when processing event
private async handleDepositEvent(depositData: DepositEventData): Promise<void> {
  // Process event as before...

  // Save last processed block in DB
  await supabase
    .from('vault_listener_states')
    .upsert({
      vault_key: this.vaultKey,
      last_processed_block: depositData.blockNumber,
      network: this.vaultConfig.network.name,
      updated_at: new Date().toISOString()
    });
}

// 4. On restart, search for lost events
async restart(): Promise<void> {
  await this.stop();

  // Search last blocks in DB
  const { data: state } = await supabase
    .from('vault_listener_states')
    .select('last_processed_block')
    .eq('vault_key', this.vaultKey)
    .single();

  if (state) {
    const currentBlock = await this.provider!.getBlockNumber();
    const missedBlocks = currentBlock - state.last_processed_block;

    if (missedBlocks > 0) {
      Logger.warn('VAULT', `Missed ${missedBlocks} blocks during restart, recovering...`);

      // Search for lost events
      const events = await this.contract!.queryFilter(
        'Deposit',
        state.last_processed_block + 1,
        currentBlock
      );

      // Process recovered events
      await Promise.all(events.map(e => this.processDepositEvent(e)));
    }
  }

  await this.start();
}
```

**Why this is the best option:**

- ✅ Maintains real-time with WebSocket
- ✅ Automatic recovery of lost events
- ✅ No overhead from constant polling
- ✅ More robust and reliable

---

### **Option B: Polling with Block Saving**

**Advantages:**

- ✅ Simpler to implement
- ✅ Does not depend on WebSocket
- ✅ Easier to debug
- ✅ Automatically recovers lost events

**Disadvantages:**

- ❌ Higher latency (polling every X seconds)
- ❌ More RPC requests
- ❌ Less efficient

**Implementation:**

```typescript
// Polling every 30 seconds
setInterval(async () => {
  await this.pollForEvents();
}, 30000);

private async pollForEvents(): Promise<void> {
  const currentBlock = await this.provider!.getBlockNumber();
  const { data: state } = await supabase
    .from('vault_listener_states')
    .select('last_processed_block')
    .eq('vault_key', this.vaultKey)
    .single();

  const fromBlock = state?.last_processed_block || 0;
  const toBlock = Math.min(currentBlock, fromBlock + 10);

  const events = await this.contract!.queryFilter(
    'Deposit',
    fromBlock,
    toBlock
  );

  // Process events...

  // Save last processed block
  await supabase
    .from('vault_listener_states')
    .upsert({
      vault_key: this.vaultKey,
      last_processed_block: toBlock,
      updated_at: new Date().toISOString()
    });
}
```

---

## 🎯 Final Recommendation

**Option A (WebSocket + Block Saving)** is the best because:

1. ✅ **Real-time** - Detects events instantly
2. ✅ **Automatic recovery** - Recovers lost events on restarts
3. ✅ **More efficient** - Does not require constant polling
4. ✅ **More robust** - Never loses events under any circumstance

**Necessary changes:**

1. Create `vault_listener_states` table in Supabase
2. Save `last_processed_block` in DB when processing events
3. On startup, load last saved block
4. On restart, search for and process lost events
5. Use `WebSocketProvider` instead of `JsonRpcProvider`

---

## 📊 Proposed Database Schema

```sql
CREATE TABLE vault_listener_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_key TEXT NOT NULL UNIQUE,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  network TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vault_listener_states_key ON vault_listener_states(vault_key);
```

---

**📅 Last updated:** 2024-10-25  
**👤 Author:** Deramp Backend System  
**🔄 Version:** 1.0.0
