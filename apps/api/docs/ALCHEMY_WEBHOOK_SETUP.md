# 🔔 Alchemy Webhook Setup Guide

## Overview

This system uses **Alchemy Notify** webhooks to detect `Deposit` events from PayoutVault contracts in real-time, eliminating the need for constant polling or complex event listeners.

---

## 🎯 Benefits

✅ **100% reliable** - Alchemy guarantees delivery with automatic retries  
✅ **Zero compute waste** - No polling, only receive events when they happen  
✅ **No missed events** - Even if backend is offline, Alchemy queues notifications  
✅ **Simple code** - Just a single webhook endpoint (~200 lines)  
✅ **Multi-chain ready** - Separate webhook per network

---

## 📋 Setup Instructions

### 1. Alchemy Dashboard Configuration

For each vault, create a webhook in [Alchemy Dashboard](https://dashboard.alchemy.com/):

#### **Webhook 1: Celo cCOP Vault**

- **Network**: Celo Mainnet
- **Webhook Type**: Address Activity
- **Webhook URL**: `https://your-domain.ondigitalocean.app/api/webhooks/alchemy/deposit`
- **Addresses to Watch**: `0x8d0D5D852062017F312a00e39f3B2311CF12aCbf`

**GraphQL Filter**:

```graphql
{
  block {
    hash
    number
    timestamp
    logs(
      filter: {
        addresses: ["0x8d0D5D852062017F312a00e39f3B2311CF12aCbf"]
        topics: [
          "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b"
        ]
      }
    ) {
      data
      topics
      index
      account {
        address
      }
      transaction {
        hash
      }
    }
  }
}
```

#### **Webhook 2: Celo cREAL Vault**

- **Network**: Celo Mainnet
- **Webhook URL**: `https://your-domain.ondigitalocean.app/api/webhooks/alchemy/deposit`
- **Addresses to Watch**: `0xB7d2300eA9f301F2F782bf52F452658E1F68d45a`

**GraphQL Filter**:

```graphql
{
  block {
    logs(
      filter: {
        addresses: ["0xB7d2300eA9f301F2F782bf52F452658E1F68d45a"]
        topics: [
          "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b"
        ]
      }
    ) {
      data
      topics
      account {
        address
      }
      transaction {
        hash
      }
    }
  }
}
```

#### **Webhook 3: Celo BRLA Vault**

- **Network**: Celo Mainnet
- **Webhook URL**: `https://your-domain.ondigitalocean.app/api/webhooks/alchemy/deposit`
- **Addresses to Watch**: `0x0B3D083289C71FdbD4921448B4f1ED96B6E9f402`

**GraphQL Filter**:

```graphql
{
  block {
    logs(
      filter: {
        addresses: ["0x0B3D083289C71FdbD4921448B4f1ED96B6E9f402"]
        topics: [
          "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b"
        ]
      }
    ) {
      data
      topics
      account {
        address
      }
      transaction {
        hash
      }
    }
  }
}
```

#### **Webhook 4: Arbitrum MXNB Vault**

- **Network**: Arbitrum One
- **Webhook URL**: `https://your-domain.ondigitalocean.app/api/webhooks/alchemy/deposit`
- **Addresses to Watch**: `0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00`

**GraphQL Filter**:

```graphql
{
  block {
    logs(
      filter: {
        addresses: ["0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00"]
        topics: [
          "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b"
        ]
      }
    ) {
      data
      topics
      account {
        address
      }
      transaction {
        hash
      }
    }
  }
}
```

---

### 2. Environment Variables

Add to your `.env`:

```bash
# Alchemy Webhook Signing Key (find in Alchemy Dashboard after creating webhook)
ALCHEMY_WEBHOOK_SIGNING_KEY=whsec_your_signing_key_here
```

**⚠️ Important**: Each webhook has its own signing key. If you create multiple webhooks, they may share the same key or have different ones. Check the Alchemy Dashboard.

---

### 3. Testing

#### Test with ngrok (Local Development)

1. Install ngrok: `npm install -g ngrok`
2. Start your backend: `npm run dev`
3. Expose localhost: `ngrok http 3000`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. In Alchemy Dashboard, set Webhook URL to: `https://abc123.ngrok.io/api/webhooks/alchemy/deposit`
6. Click "Test Webhook" in Alchemy Dashboard
7. Check your terminal for logs

#### Test in Production

1. Deploy to Digital Ocean
2. Update webhook URL to: `https://your-domain.ondigitalocean.app/api/webhooks/alchemy/deposit`
3. Make a real deposit to one of your vaults
4. Check logs: `doctl apps logs <app-id> --follow`

---

## 🔍 How It Works

### Event Flow

```
1. User makes deposit → PayoutVault contract
2. Contract emits Deposit(commerce, amount, payoutId)
3. Alchemy detects event immediately
4. Alchemy POSTs to your webhook endpoint
5. Your backend:
   - Verifies Alchemy signature
   - Decodes event data
   - Updates payout status to "Funded"
   - Sends email notification to recipient
6. Alchemy receives 200 OK response
```

### Webhook Payload Example

```json
{
  "webhookId": "wh_abc123",
  "id": "whevt_xyz789",
  "createdAt": "2025-10-30T12:00:00.000Z",
  "type": "ADDRESS_ACTIVITY",
  "event": {
    "network": "MATIC_MAINNET",
    "activity": [
      {
        "blockNum": "0x2f9ac8e",
        "hash": "0x86e64608887f784dc7b11ad0f5aa7a408a3d0764ab2657f728749a2203bbe651",
        "log": {
          "address": "0x8d0d5d852062017f312a00e39f3b2311cf12acbf",
          "topics": [
            "0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b",
            "0x000000000000000000000000d9ceee7c37e577a19a9b82a6a8d3bdb9203ebbfd"
          ],
          "data": "0x000000000000000000000000000000000000000000000015af1d78b58c400000..."
        }
      }
    ]
  }
}
```

---

## 🛠️ Troubleshooting

### Webhook not receiving events

1. **Check webhook is active** in Alchemy Dashboard
2. **Verify URL is accessible**: `curl https://your-domain.ondigitalocean.app/api/webhooks/health`
3. **Check signing key** matches in `.env`
4. **Test webhook** in Alchemy Dashboard
5. **Check logs**: Look for signature verification errors

### Events arriving but not processing

1. **Check vault address** in `src/blockchain/config/vaults.ts` matches contract
2. **Verify topic hash**: `0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b`
3. **Check database connection**: Ensure Supabase credentials are correct
4. **Check email service**: Verify Resend API key is valid

### Signature verification failing

1. **Copy signing key exactly** from Alchemy Dashboard (no extra spaces)
2. **Check env variable** is loaded: `console.log(process.env.ALCHEMY_WEBHOOK_SIGNING_KEY)`
3. **Restart backend** after updating `.env`

---

## 📊 Monitoring

### Logs to Watch

```bash
# Successful webhook
📥 [WEBHOOK] Received Alchemy notification
🔍 [WEBHOOK] Processing Deposit event
✅ [WEBHOOK] Decoded Deposit event
✅ [DEPOSIT] Updated payout status
✅ [DEPOSIT] Claim email sent successfully

# Errors
❌ [WEBHOOK] Invalid signature
❌ [WEBHOOK] Unknown vault address
❌ [DEPOSIT] Database update failed
```

### Health Check

```bash
curl https://your-domain.ondigitalocean.app/api/webhooks/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "webhooks",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

---

## 🔐 Security

### **Signing Keys (One Per Vault)**

Each webhook in Alchemy generates a unique signing key. You need to store all of them:

```env
# .env
ALCHEMY_WEBHOOK_SIGNING_KEY_CCOP=whsec_your_ccop_key_here
ALCHEMY_WEBHOOK_SIGNING_KEY_CREAL=whsec_your_creal_key_here
ALCHEMY_WEBHOOK_SIGNING_KEY_BRLA=whsec_your_brla_key_here
ALCHEMY_WEBHOOK_SIGNING_KEY_MXNB=whsec_your_mxnb_key_here
```

**How it works:**

1. Webhook receives request
2. Backend extracts vault address from payload
3. Backend selects correct signing key for that vault
4. Backend verifies signature using vault-specific key
5. If signature is invalid → 401 Unauthorized

### **Security Features**

- **Signature verification**: Every webhook is verified using HMAC-SHA256
- **Vault-specific keys**: Each vault has its own signing key
- **Reject invalid signatures**: Unauthorized requests return 401
- **Log all attempts**: Failed verifications are logged for security audits
- **HTTPS only**: Webhook endpoint requires secure connection

---

## 📚 Reference

- **Event Signature**: `Deposit(address,uint256,string)`
- **Topic Hash**: `0x643e927b32d5bfd08eccd2fcbd97057ad413850f857a2359639114e8e8dd3d7b`
- **Alchemy Docs**: https://docs.alchemy.com/docs/using-notify
- **Webhook Endpoint**: `POST /api/webhooks/alchemy/deposit`

---

## ✅ Checklist

- [ ] Create 4 webhooks in Alchemy Dashboard (1 per vault)
- [ ] Copy each signing key to `.env` with vault-specific names:
  - `ALCHEMY_WEBHOOK_SIGNING_KEY_CCOP=whsec_...`
  - `ALCHEMY_WEBHOOK_SIGNING_KEY_CREAL=whsec_...`
  - `ALCHEMY_WEBHOOK_SIGNING_KEY_BRLA=whsec_...`
  - `ALCHEMY_WEBHOOK_SIGNING_KEY_MXNB=whsec_...`
- [ ] Deploy backend with webhook endpoint
- [ ] Test each webhook with real deposits
- [ ] Verify emails arrive for all vaults
- [ ] Monitor logs for 24h to ensure stability
- [ ] (Optional) Remove old VaultListener code
