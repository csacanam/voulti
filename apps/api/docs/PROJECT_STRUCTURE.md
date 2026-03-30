# 📐 Deramp Backend - Project Structure Quick Reference

**Quick navigation guide for understanding the project structure**

---

## 🎯 Quick Overview

**What is Deramp Backend?**
A crypto payments gateway that:

- Creates payment invoices
- Processes blockchain transactions on Celo
- Validates payments via smart contracts
- Sends notifications (email & webhooks)
- Manages token prices and fiat rates

---

## 📦 Tech Stack at a Glance

```
Runtime:     Node.js 18+ with TypeScript 5.8
Framework:   Fastify 4.29 (high-performance web server)
Database:    Supabase (PostgreSQL)
Blockchain:  ethers.js 6.15 (Celo networks)
Email:       Resend API
APIs:        CoinGecko (prices) + OpenExchangeRates (fiat)
```

---

## 📂 File Structure Map

```
src/
├── index.ts                           # 🚀 APP ENTRY POINT
│
├── routes/                            # 🛣️ API ENDPOINTS (Fastify routes)
│   ├── invoices.ts                    # Invoice CRUD
│   ├── blockchain.ts                  # Blockchain operations (create, status, cancel)
│   ├── commerces.ts                   # Commerce info
│   ├── payouts.ts                     # Payout management
│   ├── prices.ts                      # Price update endpoints (cron)
│   ├── orders.ts                      # Order expiration (cron)
│   └── notifications.ts               # Email & webhook endpoints (cron)
│
├── business/                          # 💼 BUSINESS LOGIC SERVICES
│   ├── notificationService.ts         # 📧 Email & webhook notifications
│   ├── tokenPrices.ts                 # 💰 CoinGecko price updates
│   ├── fiatRates.ts                   # 💱 Fiat exchange rates
│   └── expireOrders.ts                # ⏰ Invoice expiration logic
│
└── blockchain/                        # ⛓️ BLOCKCHAIN LAYER
    ├── config/
    │   ├── networks.ts                # ⚙️ Network configurations (NETWORKS, getNetworkByChainId)
    │   ├── contracts.ts               # 📝 Contract addresses per network
    │   └── tokens.ts                  # 🪙 Token addresses & decimals per network
    │
    ├── services/
    │   ├── DerampServices.ts          # 🏗️ Base blockchain service (init, wallet, provider)
    │   └── InvoiceServices.ts         # 📄 Invoice operations (create, status, cancel)
    │
    ├── utils/
    │   ├── web3.ts                    # 🌐 Provider & wallet setup (ENS handling)
    │   ├── errors.ts                  # ❌ Blockchain error handling
    │   └── formatters.ts              # 🎨 Formatters (block explorer, token symbols, networks)
    │
    └── abi/                           # 📜 Smart contract ABIs
        ├── DerampProxy.json
        ├── InvoiceManager.json
        └── AccessManager.json
```

---

## 🗄️ Database Tables (Supabase)

```
┌─────────────────┐
│   commerces     │  ← Businesses using the gateway
├─────────────────┤
│ • id            │
│ • name          │
│ • wallet        │  ← Blockchain address
│ • confirmation_ │
│   url / email   │
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│    invoices     │  ← Payment invoices
├─────────────────┤
│ • id            │
│ • commerce_id   │
│ • amount_fiat   │
│ • status        │  ← Pending | Paid | Expired | Refunded
│ • selected_     │
│   network       │  ← chainId (e.g., 44787)
│ • blockchain_   │
│   invoice_id    │  ← On-chain ID
│ • paid_token    │
│ • paid_tx_hash  │
│ • confirmation_ │
│   email/url_*   │  ← Notification tracking
└─────────────────┘

┌─────────────────┐
│    networks     │  ← Blockchain networks
├─────────────────┤
│ • name          │  ← "alfajores"
│ • chain_id      │  ← 44787
│ • rpc_url       │
│ • proxy_contract│
└────────┬────────┘
         │ 1:N
         ↓
┌─────────────────┐
│ tokens_addresses│  ← Token contracts per network
├─────────────────┤
│ • id            │
│ • token_symbol  │  ← "cCOP"
│ • network       │  ← "alfajores"
│ • contract_     │
│   address       │  ← "0xe6A5..."
│ • decimals      │  ← 18
└────────┬────────┘
         │ N:1
         ↓
┌─────────────────┐
│     tokens      │  ← Token info & prices
├─────────────────┤
│ • symbol        │  ← "cCOP"
│ • name          │  ← "Celo Colombian Peso"
│ • rate_to_usd   │  ← Current price
│ • is_enabled    │
└─────────────────┘

┌─────────────────┐
│ tokens_enabled  │  ← Commerce ↔ Token mapping
├─────────────────┤
│ • commerce_id   │
│ • token_id      │
└─────────────────┘

┌─────────────────┐
│ fiat_exchange_  │  ← Fiat rates
│     rates       │
├─────────────────┤
│ • currency_code │  ← "COP"
│ • usd_to_       │
│   currency_rate │  ← 4000.50
└─────────────────┘
```

---

## 🛣️ API Endpoints Summary

| Route                | Methods        | Purpose                    |
| -------------------- | -------------- | -------------------------- |
| `/api/invoices`      | POST, GET, PUT | Invoice management         |
| `/api/blockchain`    | POST, GET      | Blockchain operations      |
| `/api/commerces`     | GET            | Commerce info              |
| `/api/payouts`       | POST           | Payout management          |
| `/api/prices`        | POST           | Cron: Update prices/rates  |
| `/api/orders`        | POST           | Cron: Expire orders        |
| `/api/notifications` | POST           | Cron: Send emails/webhooks |
| `/health`, `/ping`   | GET            | Health checks              |

---

## 🔄 Key Flows

### 1️⃣ Invoice Creation Flow

```
Client
  ↓ POST /api/invoices { commerce_id, amount_fiat }
Backend (Supabase)
  ↓ Create invoice record (status: Pending)
Client
  ↓ POST /api/blockchain/create { invoiceId, chainId, paymentOptions }
Backend
  ↓ chainId → networkName (getNetworkByChainId)
  ↓ InvoiceService(networkName).createInvoice()
Blockchain
  ↓ Smart contract creates invoice
Backend
  ↓ Update invoice: selected_network, blockchain_invoice_id
Response
```

### 2️⃣ Payment Detection Flow

```
Frontend monitors blockchain
  ↓ Payment detected
  ↓ PUT /api/invoices/:id/payment-data { paid_token, paid_tx_hash, ... }
Backend
  ↓ Update invoice with payment data
  ↓ PUT /api/invoices/:id/status { status: "Paid" }
Backend
  ↓ Update status in database
Cron Job
  ↓ POST /api/notifications/process-emails
Backend
  ↓ Send email to commerce
  ↓ POST to commerce.confirmation_url (webhook)
```

### 3️⃣ Network Determination Flow

```
Frontend sends: chainId = 44787
  ↓
Backend: getNetworkByChainId(44787)
  ↓
Returns: "alfajores"
  ↓
Used for:
  • NETWORKS["alfajores"] → RPC URL, explorer
  • CONTRACTS["alfajores"] → Contract addresses
  • TOKENS["alfajores"] → Token addresses
  • InvoiceService("alfajores") → Service instance
```

---

## 💼 Business Services Deep Dive

### NotificationService

- **File**: `src/business/notificationService.ts`
- **Purpose**: Send emails & webhooks for invoice status changes
- **Key Features**:
  - Batch processing (20 emails, 10 webhooks per run)
  - Blockchain status verification
  - Retry logic (max 5 for webhooks)
  - Status-specific templates (Paid, Expired, Refunded)
- **Cron Frequency**: Every 1 minute

### TokenPriceService

- **File**: `src/business/tokenPrices.ts`
- **Purpose**: Update token prices from CoinGecko
- **Key Features**:
  - Queries enabled tokens from database
  - Fetches prices from CoinGecko API
  - Updates `tokens.rate_to_usd`
- **Cron Frequency**: Daily

### FiatRateService

- **File**: `src/business/fiatRates.ts`
- **Purpose**: Update fiat exchange rates
- **Key Features**:
  - Queries supported currencies from database
  - Fetches rates from OpenExchangeRates
  - Updates `fiat_exchange_rates.usd_to_currency_rate`
- **Cron Frequency**: Daily

### ExpireOrdersService

- **File**: `src/business/expireOrders.ts`
- **Purpose**: Expire pending invoices past expiration time
- **Key Features**:
  - Queries pending invoices
  - Filters by `expires_at <= now()`
  - Updates status to 'Expired'
- **Cron Frequency**: Every 1-5 minutes

---

## ⛓️ Blockchain Architecture

```
┌──────────────────────────────────────────┐
│         DerampService (Base)             │
│  • Constructor(network, supportsENS)     │
│  • init(privateKey)                      │
│  • Properties: wallet, provider,         │
│    contract, abi, network                │
└──────────────┬───────────────────────────┘
               │ extends
               ↓
┌──────────────────────────────────────────┐
│        InvoiceService                    │
│  • createInvoice(params)                 │
│  • getInvoiceStatus(invoiceId)           │
│  • cancelInvoice(invoiceId)              │
│  • isTokenWhitelistedForCommerce()       │
│  • getWhitelistedTokensForCommerce()     │
└──────────────────────────────────────────┘
```

### Smart Contracts on Celo

| Contract           | Address (Alfajores) | Purpose                                    |
| ------------------ | ------------------- | ------------------------------------------ |
| **DerampProxy**    | `0xc44c...668`      | Main proxy, delegates to other contracts   |
| **InvoiceManager** | `0xe7c0...12f`      | Invoice lifecycle (create, status, cancel) |
| **AccessManager**  | `0x776D...696`      | Token whitelisting, permissions            |

---

## 🎨 Utility Functions

### Formatters (`src/blockchain/utils/formatters.ts`)

```typescript
getBlockExplorerUrl(network, txHash)
// → "https://alfajores.celoscan.io/tx/0x..."

getTokenSymbol(identifier, network?)
// Input: "0xe6A5..." or "cCOP" → Output: "cCOP"

getTokenAddress(identifier, network?)
// Input: "cCOP" or "0xe6A5..." → Output: "0xe6A5..."

getNetworkDisplayName(network)
// Input: "alfajores" → Output: "Celo Alfajores"
```

### Web3 Utils (`src/blockchain/utils/web3.ts`)

```typescript
getProvider(network, supportsENS?)
// Creates ethers.JsonRpcProvider with ENS config

getWallet(privateKey, network, supportsENS?)
// Creates ethers.Wallet connected to provider
```

---

## ⚙️ Configuration Files

### networks.ts

```typescript
NETWORKS = {
  alfajores: {
    chainId: 44787,
    name: "Celo Alfajores",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    blockExplorer: "https://alfajores.celoscan.io"
  }
}

getNetworkByChainId(chainId) → networkName
```

### contracts.ts

```typescript
CONTRACTS = {
  alfajores: {
    DERAMP_PROXY: "0xc44c...",
    INVOICE_MANAGER: "0xe7c0...",
    ACCESS_MANAGER: "0x776D...",
  },
};
```

### tokens.ts

```typescript
TOKENS = {
  alfajores: {
    CCOP: {
      address: "0xe6A5...",
      symbol: "cCOP",
      decimals: 18
    },
    CUSD: { ... },
    CEUR: { ... }
  }
}
```

---

## 🌍 Environment Variables

```env
# Core
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
PRIVATE_KEY=0x...                      # Blockchain wallet
PORT=3000                              # 8080 in production

# External APIs
COINGECKO_APIKEY=CG-xxx...
OPENEXCHANGERATE_APPID=xxx...
RESEND_APIKEY=re_xxx...
```

---

## 🚀 Running the Project

```bash
# Development
npm install
npm run dev              # → http://localhost:3000

# Production
npm run build
npm start                # → Port 8080 on 0.0.0.0
```

---

## 📊 Performance Specs

| Metric                 | Value       | Details              |
| ---------------------- | ----------- | -------------------- |
| **Email Batch Size**   | 20          | Per cron execution   |
| **Webhook Batch Size** | 10          | Per cron execution   |
| **Webhook Timeout**    | 2s          | Per request          |
| **Max Retries**        | 5           | For webhook failures |
| **Cron Timeout**       | 30s         | Max execution time   |
| **Email Capacity**     | ~1,200/hour | 20 per minute        |
| **Webhook Capacity**   | ~600/hour   | 10 per minute        |

---

## 🔗 Important Relationships

### How chainId becomes networkName

```
Frontend: chainId = 44787
    ↓
Backend: getNetworkByChainId(44787)
    ↓
Returns: "alfajores"
    ↓
Used in: NETWORKS["alfajores"]
         CONTRACTS["alfajores"]
         TOKENS["alfajores"]
         InvoiceService("alfajores")
```

### How invoices link to blockchain

```
invoices table:
  • selected_network = 44787          (chainId)
  • blockchain_invoice_id = "0xbd3e..." (hash)
    ↓
Query blockchain:
  • chainId → networkName via getNetworkByChainId()
  • Create InvoiceService(networkName)
  • Call getInvoiceStatus(blockchain_invoice_id)
```

---

## 📚 Documentation Files

- **README.md** - Project overview & setup
- **ARCHITECTURE.md** - Full architecture documentation (this is extensive!)
- **TODO.md** - Feature roadmap & priorities
- **src/blockchain/BLOCKCHAIN_INTEGRATION.md** - Blockchain integration guide
- **db/README.md** - Database schema documentation
- **src/business/README.md** - Cron services documentation

---

## 🎯 Key Takeaways

1. **Network determination**: `chainId` (from frontend) → `getNetworkByChainId()` → `networkName` (used everywhere)

2. **Configuration centralization**: All network/contract/token configs in `src/blockchain/config/`

3. **Batch processing**: Respect 30s cron timeout with batches (20 emails, 10 webhooks)

4. **ENS handling**: Always send `supportsENS: false` for Celo networks

5. **Service separation**: Business logic (services) separate from API layer (routes)

6. **Database-driven**: Token prices, fiat rates, and configurations come from database

7. **Notification system**: Separate email and webhook processing, with retry logic

8. **Blockchain verification**: Always verify on-chain status before sending notifications

---

**For detailed information, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

---

**Last Updated**: October 21, 2025  
**Quick Reference Version**: 1.0.0
