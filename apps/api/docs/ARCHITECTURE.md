# 🏗️ Deramp Backend - Architecture Documentation

**Last Updated**: October 21, 2025  
**Version**: 1.0.0  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Architecture](#core-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Business Logic Services](#business-logic-services)
8. [Blockchain Integration](#blockchain-integration)
9. [Configuration Management](#configuration-management)
10. [Notification System](#notification-system)
11. [Cron Jobs & Workers](#cron-jobs--workers)
12. [Data Flow](#data-flow)
13. [Security & Authentication](#security--authentication)
14. [Environment Variables](#environment-variables)
15. [Deployment](#deployment)

---

## 📖 Project Overview

**Deramp Backend** is a robust crypto payments gateway built to facilitate stablecoin payments on blockchain networks. It provides a complete backend infrastructure for:

- Creating and managing payment invoices
- Processing blockchain transactions
- Validating payments on smart contracts
- Managing commerce configurations
- Sending notifications (email & webhooks)
- Updating token prices and fiat exchange rates
- Handling invoice expiration

### Key Features

✅ **Multi-Network Support**: Celo Alfajores (testnet) & Mainnet  
✅ **ENS Configuration**: Automatic ENS handling per network  
✅ **Invoice Management**: Complete lifecycle management  
✅ **Blockchain Integration**: Direct smart contract interaction  
✅ **Payment Validation**: Real-time status verification  
✅ **Commerce Management**: Multi-commerce with token whitelisting  
✅ **Notification System**: Email & webhook notifications  
✅ **Automated Tasks**: Price updates, expiration handling  
✅ **Database Sync**: Backend-blockchain synchronization

---

## 🛠️ Technology Stack

### Core Technologies

| Technology     | Version | Purpose                        |
| -------------- | ------- | ------------------------------ |
| **Node.js**    | 18+     | Runtime environment            |
| **TypeScript** | 5.8.3   | Type-safe development          |
| **Fastify**    | 4.29.1  | High-performance web framework |
| **Supabase**   | 2.50.1  | PostgreSQL database (BaaS)     |
| **ethers.js**  | 6.15.0  | Blockchain interaction         |
| **Resend**     | 6.0.1   | Email delivery service         |

### Development Tools

- **nodemon**: Hot reload in development
- **ts-node**: TypeScript execution
- **dotenv**: Environment configuration
- **axios**: HTTP client for external APIs

---

## 📁 Project Structure

```
deramp-backend/
├── src/
│   ├── index.ts                          # 🚀 Application entrypoint
│   ├── business/                         # 💼 Business logic services
│   │   ├── notificationService.ts        # Email & webhook notifications
│   │   ├── tokenPrices.ts               # CoinGecko price updates
│   │   ├── fiatRates.ts                 # Fiat exchange rates
│   │   ├── expireOrders.ts              # Invoice expiration logic
│   │   └── README.md                    # Business services documentation
│   ├── routes/                          # 🛣️ API endpoints
│   │   ├── invoices.ts                  # Invoice CRUD operations
│   │   ├── blockchain.ts                # Blockchain interactions
│   │   ├── commerces.ts                 # Commerce management
│   │   ├── prices.ts                    # Price update endpoints
│   │   ├── orders.ts                    # Order expiration endpoint
│   │   └── notifications.ts             # Notification endpoints
│   └── blockchain/                      # ⛓️ Blockchain integration
│       ├── config/                      # Configuration files
│       │   ├── networks.ts              # Network configurations
│       │   ├── contracts.ts             # Contract addresses
│       │   └── tokens.ts                # Token configurations
│       ├── services/                    # Blockchain services
│       │   ├── DerampServices.ts        # Base blockchain service
│       │   └── InvoiceServices.ts       # Invoice operations
│       ├── utils/                       # Utility functions
│       │   ├── web3.ts                  # Web3 provider setup
│       │   ├── errors.ts                # Error handling
│       │   └── formatters.ts            # Blockchain data formatters
│       └── abi/                         # Smart contract ABIs
│           ├── DerampProxy.json
│           ├── InvoiceManager.json
│           └── AccessManager.json
├── db/
│   ├── schema.sql                       # Database schema
│   └── README.md                        # Database documentation
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript configuration
├── .env                                 # Environment variables
├── README.md                            # Project documentation
└── TODO.md                              # Feature roadmap

```

---

## 🏛️ Core Architecture

### Architecture Pattern

The backend follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         API Layer (Routes)              │  ← Fastify endpoints
├─────────────────────────────────────────┤
│      Business Logic Layer               │  ← Services (tokenPrices,
│                                          │    notifications, etc.)
├─────────────────────────────────────────┤
│     Blockchain Integration Layer        │  ← InvoiceService, DerampService
├─────────────────────────────────────────┤
│      Data Access Layer                  │  ← Supabase client
├─────────────────────────────────────────┤
│      External Services                  │  ← CoinGecko, Resend, Blockchain
└─────────────────────────────────────────┘
```

### Request Flow

```
Client → Fastify Route → Business Service → Blockchain/Database → Response
```

### Key Design Principles

1. **Single Responsibility**: Each service handles one concern
2. **Dependency Injection**: Services receive dependencies via constructor
3. **Error Handling**: Centralized error handling with custom error types
4. **Type Safety**: Full TypeScript coverage
5. **Async/Await**: Modern async patterns throughout
6. **Batch Processing**: Efficient handling of bulk operations

---

## 🗄️ Database Schema

### Tables Overview

```
commerces (Commerce Management)
├── invoices (Payment Invoices)
│
networks (Blockchain Networks)
├── tokens_addresses (Token Contract Addresses)
│
tokens (Token Information)
├── tokens_addresses (Contract Addresses)
└── tokens_enabled (Commerce-Token Mapping)
    └── commerces
│
fiat_exchange_rates (Fiat Currency Rates)
│
bridge_routes (Cross-chain Bridge Routes)
│
payouts (Payout Records)
```

### Key Tables

#### 1. `commerces` - Commerce Configuration

```sql
- id (uuid, PK)
- name (text) - Business name
- wallet (text) - Blockchain wallet address
- spread (double) - Fee percentage (default 3%)
- currency (text) - Default fiat currency
- confirmation_url (text) - Webhook URL
- confirmation_email (text) - Email for notifications
- minAmount, maxAmount (double) - Payment limits
```

#### 2. `invoices` - Payment Invoices

```sql
- id (uuid, PK)
- commerce_id (uuid, FK → commerces)
- amount_fiat (numeric) - Fiat amount
- fiat_currency (text) - Currency code
- status (enum) - Pending|Paid|Expired|Refunded
- selected_network (integer) - ChainId
- blockchain_invoice_id (text) - On-chain invoice ID
- paid_token, paid_network, paid_tx_hash (text) - Payment data
- paid_amount (double) - Amount paid
- confirmation_email_sent (boolean)
- confirmation_url_available (boolean)
- confirmation_url_response (boolean)
- confirmation_url_retries (smallint)
- confirmation_email_available (boolean)
- expires_at, paid_at, expired_at, refunded_at (timestamp)
```

#### 3. `networks` - Blockchain Networks

```sql
- name (text, PK)
- chain_id (bigint, UNIQUE)
- rpc_url (text) - RPC endpoint
- proxy_contract (text) - Main contract address
- storage_contract, accessmanager_contract, etc.
- is_active (boolean)
```

#### 4. `tokens` - Token Information

```sql
- symbol (text, PK)
- name (text, UNIQUE)
- rate_to_usd (numeric) - Current price
- is_enabled (boolean)
- source (text) - "coingecko.com"
- updated_at (timestamp)
```

#### 5. `tokens_addresses` - Network-Specific Tokens

```sql
- id (uuid, PK)
- token_symbol (text, FK → tokens)
- network (text, FK → networks)
- contract_address (text) - Token contract
- decimals (integer)
- is_active (boolean)
```

#### 6. `tokens_enabled` - Commerce Token Whitelisting

```sql
- id (uuid, PK)
- commerce_id (uuid, FK → commerces)
- token_id (uuid, FK → tokens_addresses)
```

---

## 🛣️ API Endpoints

### Invoice Management (`/api/invoices`)

| Method | Endpoint                             | Description             |
| ------ | ------------------------------------ | ----------------------- |
| POST   | `/`                                  | Create new invoice      |
| GET    | `/:id`                               | Get invoice details     |
| PUT    | `/:id/status`                        | Update invoice status   |
| PUT    | `/:id/payment-data`                  | Update payment data     |
| GET    | `/admin/commerce-tokens/:commerceId` | Check token consistency |

### Blockchain Operations (`/api/blockchain`)

| Method | Endpoint             | Description                  |
| ------ | -------------------- | ---------------------------- |
| POST   | `/create`            | Create invoice on blockchain |
| GET    | `/status/:invoiceId` | Check blockchain status      |
| POST   | `/cancel/:invoiceId` | Cancel invoice on blockchain |

### Commerce Management (`/api/commerces`)

| Method | Endpoint | Description          |
| ------ | -------- | -------------------- |
| GET    | `/:id`   | Get commerce details |
| GET    | `/`      | List all commerces   |

### Payout Management (`/api/payouts`)

| Method | Endpoint | Description       |
| ------ | -------- | ----------------- |
| POST   | `/`      | Create new payout |

### Price Updates (`/api/prices`)

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| POST   | `/update-token-prices` | Update token prices (cron) |
| POST   | `/update-fiat-rates`   | Update fiat rates (cron)   |

### Order Management (`/api/orders`)

| Method | Endpoint         | Description                  |
| ------ | ---------------- | ---------------------------- |
| POST   | `/expire-orders` | Expire pending orders (cron) |

### Notifications (`/api/notifications`)

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| POST   | `/process-emails`            | Process email notifications (cron)   |
| POST   | `/process-url-confirmations` | Process webhook notifications (cron) |

### Health Check

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Basic health check   |
| GET    | `/ping`   | Detailed system info |

---

## 💼 Business Logic Services

### 1. NotificationService (`notificationService.ts`)

**Purpose**: Handles email and webhook notifications for invoice status changes.

**Key Features**:

- Email notifications via Resend API
- Webhook confirmations with retry logic
- Batch processing (20 emails, 10 webhooks per execution)
- Blockchain status verification
- Status-specific email templates (Paid, Expired, Refunded)

**Methods**:

```typescript
processAllPendingEmails(): Promise<void>
processAllPendingUrlConfirmations(): Promise<void>
verifyBlockchainStatus(invoice): Promise<boolean>
sendStatusEmail(invoice, commerce): Promise<void>
sendToConfirmationUrl(invoice, commerce): Promise<void>
```

**Configuration**:

- `maxRetries = 5` (webhook retries)
- `batchSize = 10` (webhooks per execution)
- `emailBatchSize = 20` (emails per execution)
- `urlTimeout = 2000ms` (webhook timeout)

**Email Template Structure**:

- Basic payment info (invoice ID, amount, date)
- Blockchain details (network, token, transaction)
- Status-specific footer messages

### 2. TokenPriceService (`tokenPrices.ts`)

**Purpose**: Updates token prices from CoinGecko API.

**Key Features**:

- Dynamic token query from database
- CoinGecko API integration
- Automatic price updates
- Error handling for rate limits

**Methods**:

```typescript
updateAllTokenPrices(): Promise<void>
getEnabledTokensFromDatabase(): Promise<DatabaseToken[]>
fetchPricesFromCoinGecko(tokens): Promise<TokenPrice[]>
updateTokenPricesInDatabase(prices): Promise<void>
```

**API Integration**:

```typescript
GET https://api.coingecko.com/api/v3/simple/price
Headers: { 'x-cg-demo-api-key': API_KEY }
Params: { vs_currencies: 'usd', symbols: 'token1,token2' }
```

### 3. FiatRateService (`fiatRates.ts`)

**Purpose**: Updates fiat exchange rates from OpenExchangeRates.

**Key Features**:

- Multi-currency support
- OpenExchangeRates API integration
- Rate validation
- Error handling

**Methods**:

```typescript
updateAllFiatRates(): Promise<void>
getSupportedFiatCurrencies(): Promise<DatabaseFiatRate[]>
fetchFiatRatesFromAPI(): Promise<OpenExchangeRatesResponse>
updateFiatRatesInDatabase(currencies, rates): Promise<void>
```

**API Integration**:

```typescript
GET https://openexchangerates.org/api/latest.json
Params: { app_id: API_KEY }
```

### 4. ExpireOrdersService (`expireOrders.ts`)

**Purpose**: Expires pending invoices that have passed their expiration time.

**Key Features**:

- Automatic invoice expiration
- Status updates to 'Expired'
- Timestamp tracking

**Methods**:

```typescript
expirePendingOrders(): Promise<void>
getPendingInvoices(): Promise<Invoice[]>
filterExpiredInvoices(invoices): Invoice[]
updateExpiredInvoices(expiredInvoices): Promise<void>
```

**Logic Flow**:

1. Query all pending invoices
2. Filter invoices where `expires_at <= now()`
3. Update status to 'Expired'
4. Set `expired_at` timestamp

---

## ⛓️ Blockchain Integration

### Architecture

```
DerampService (Base Class)
└── InvoiceService (Invoice Operations)
    ├── createInvoice()
    ├── getInvoiceStatus()
    ├── cancelInvoice()
    ├── isTokenWhitelistedForCommerce()
    └── getWhitelistedTokensForCommerce()
```

### DerampService (Base)

**File**: `src/blockchain/services/DerampServices.ts`

**Purpose**: Base class for blockchain interactions.

**Properties**:

```typescript
protected network: NetworkKey
protected contractAddress: string
protected abi: any
protected wallet: ethers.Wallet | null
protected contract: ethers.Contract | null
protected provider: ethers.Provider | null
protected supportsENS?: boolean
```

**Key Method**:

```typescript
async init(privateKey: string): Promise<void>
// Initializes wallet, provider, and contract instances
```

### InvoiceService

**File**: `src/blockchain/services/InvoiceServices.ts`

**Purpose**: Invoice-specific blockchain operations.

**Key Methods**:

#### 1. Create Invoice

```typescript
async createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult>
```

- Creates invoice on-chain
- Validates payment options
- Returns transaction hash and invoice ID

#### 2. Get Invoice Status

```typescript
async getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>
```

- Queries on-chain invoice state
- Returns status, payment data, and expiration

#### 3. Cancel Invoice

```typescript
async cancelInvoice(invoiceId: string): Promise<CancelInvoiceResult>
```

- Cancels pending invoice on-chain
- Updates database status

#### 4. Token Whitelisting

```typescript
async isTokenWhitelistedForCommerce(commerce: string, token: string): Promise<boolean>
async getWhitelistedTokensForCommerce(commerce: string): Promise<string[]>
```

- Checks token permissions via AccessManager contract

### Smart Contracts

#### DerampProxy

- **Address** (Alfajores): `0xc44cDAdf371DFCa94e325d1B35e27968921Ef668`
- **Purpose**: Main entry point for all operations
- **Functions**: Delegates to InvoiceManager, AccessManager

#### InvoiceManager

- **Address** (Alfajores): `0xe7c011eB0328287B11aC711885a2f76d5797012f`
- **Purpose**: Invoice lifecycle management
- **Functions**: `createInvoice`, `getInvoiceStatus`, `cancelInvoice`

#### AccessManager

- **Address** (Alfajores): `0x776D9E84D5DAaecCb014f8aa8D64a6876B47a696`
- **Purpose**: Token and commerce whitelisting
- **Functions**: `isTokenWhitelistedForCommerce`, `getWhitelistedTokens`

### ENS Configuration

**Problem**: Celo networks don't support ENS, causing errors.

**Solution**: Accept `supportsENS` parameter in requests.

```typescript
// src/blockchain/utils/web3.ts
export function getProvider(
  network: NetworkKey,
  supportsENS?: boolean
): ethers.JsonRpcProvider {
  const providerConfig: any = {
    name: networkConfig.name,
    chainId: networkConfig.chainId,
  };

  // Disable ENS for Celo
  if (supportsENS === false) {
    providerConfig.ensAddress = undefined;
  }

  return new ethers.JsonRpcProvider(networkConfig.rpcUrl, providerConfig);
}
```

**Frontend must send**:

```json
{
  "chainId": 44787,
  "supportsENS": false
}
```

---

## ⚙️ Configuration Management

### Network Configuration

**File**: `src/blockchain/config/networks.ts`

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

### Contract Configuration

**File**: `src/blockchain/config/contracts.ts`

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

### Token Configuration

**File**: `src/blockchain/config/tokens.ts`

```typescript
export const TOKENS: TokenConfig = {
  alfajores: {
    CELO: {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "CELO",
      name: "Celo",
      decimals: 18,
    },
    CCOP: {
      address: "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
      symbol: "cCOP",
      name: "Celo Colombian Peso",
      decimals: 18,
    },
    CUSD: {
      address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
      symbol: "cUSD",
      name: "Celo Dollar",
      decimals: 18,
    },
    // ... more tokens
  },
};
```

### Configuration Flow

```
Frontend Request (chainId)
    → getNetworkByChainId(chainId)
    → networkName
    → CONTRACTS[networkName]
    → TOKENS[networkName]
    → InvoiceService(networkName)
```

---

## 📧 Notification System

### Email Notifications

**Service**: `NotificationService`  
**Provider**: Resend API  
**Frequency**: 1 minute (cron job)  
**Batch Size**: 20 emails per execution

**Flow**:

1. Query invoices where:
   - `status IN ('Paid', 'Expired', 'Refunded')`
   - `confirmation_email_available = true`
   - `confirmation_email_sent = false`
2. Verify blockchain status (skip for Expired)
3. Generate status-specific email
4. Send via Resend API
5. Mark `confirmation_email_sent = true`

**Email Structure**:

```html
<!DOCTYPE html>
<html>
  <body>
    <h2 style="color: {color};">{emoji} {title}</h2>
    <p>Dear {commerce_name},</p>
    <p>{message}</p>

    <!-- Basic Payment Info -->
    <div>
      <p>Invoice ID: {invoice_id}</p>
      <p>Amount: {amount} {currency}</p>
      <p>Date: {formatted_date}</p>
    </div>

    <!-- Blockchain Details (if paid/refunded) -->
    <div>
      <p>Network: {network_name}</p>
      <p>Token: {token_amount} {token_symbol}</p>
      <p><a href="{explorer_url}">View on {network} Explorer</a></p>
    </div>

    <!-- Status-specific footer -->
    <p>{footer_message}</p>

    <p>Best regards,<br />The Voulti Team</p>
  </body>
</html>
```

### Webhook Notifications (URL Confirmations)

**Service**: `NotificationService`  
**Frequency**: 1 minute (cron job)  
**Batch Size**: 10 webhooks per execution  
**Timeout**: 2 seconds per request  
**Max Retries**: 5

**Flow**:

1. Query invoices where:
   - `status IN ('Paid', 'Expired', 'Refunded')`
   - `confirmation_url_available = true`
   - `confirmation_url_response = false`
   - `confirmation_url_retries < 5`
2. Verify blockchain status
3. Send POST request to `confirmation_url`
4. If success (200-299): mark `confirmation_url_response = true`
5. If failure: increment `confirmation_url_retries`
6. If max retries: send failure email to commerce

**Webhook Payload**:

```json
{
  "invoice_id": "uuid",
  "commerce_id": "uuid",
  "status": "Paid",
  "amount_fiat": 100000,
  "fiat_currency": "COP",
  "paid_token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
  "paid_network": "alfajores",
  "paid_tx_hash": "0x...",
  "paid_amount": 102.806000963941002624,
  "paid_at": "2025-01-20T15:30:00.000Z",
  "timestamp": "2025-01-20T15:35:00.000Z"
}
```

### Failure Notifications

When webhook fails after max retries, send detailed email:

```
Subject: Webhook Delivery Failed - Invoice {invoice_id}

Body:
- Invoice ID
- Status
- Error details
- Retry count
- Last error code
- Webhook URL
- Recommendation to check endpoint
```

---

## ⏰ Cron Jobs & Workers

All cron jobs are triggered by external workers (e.g., DigitalOcean Cron Jobs, GitHub Actions) calling specific endpoints.

### Job Schedule

| Job                       | Endpoint                                            | Frequency         | Purpose                                  |
| ------------------------- | --------------------------------------------------- | ----------------- | ---------------------------------------- |
| **Token Prices**          | `POST /api/prices/update-token-prices`              | Daily             | Update token prices from CoinGecko       |
| **Fiat Rates**            | `POST /api/prices/update-fiat-rates`                | Daily             | Update fiat rates from OpenExchangeRates |
| **Expire Orders**         | `POST /api/orders/expire-orders`                    | Every 1-5 minutes | Expire pending invoices                  |
| **Email Notifications**   | `POST /api/notifications/process-emails`            | Every 1 minute    | Send status emails                       |
| **Webhook Notifications** | `POST /api/notifications/process-url-confirmations` | Every 1 minute    | Send webhook confirmations               |

### Performance Considerations

#### Cron Timeout: 30 seconds max

**Solution**: Batch processing

**Email Processing**:

- Batch size: 20 emails
- Parallel execution: `Promise.all()`
- Estimated time: ~10 seconds for 20 emails
- Capacity: ~1,200 emails/hour

**Webhook Processing**:

- Batch size: 10 webhooks
- Timeout per webhook: 2 seconds
- Parallel execution: `Promise.all()`
- Estimated time: ~2-5 seconds for 10 webhooks
- Capacity: ~600 webhooks/hour

### Cron Job Implementation Example

```yaml
# GitHub Actions (.github/workflows/cron-emails.yml)
name: Email Notifications
on:
  schedule:
    - cron: "* * * * *" # Every minute
jobs:
  process-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger email processing
        run: |
          curl -X POST https://your-domain.com/api/notifications/process-emails
```

---

## 🔄 Data Flow

### Invoice Creation Flow

```
1. Client → POST /api/invoices
   ↓
2. Validate commerce & limits
   ↓
3. Create invoice in Supabase
   ↓
4. Return invoice ID
   ↓
5. Client → POST /api/blockchain/create (with chainId)
   ↓
6. Convert chainId → networkName
   ↓
7. Validate invoice exists & is pending
   ↓
8. Create InvoiceService(networkName)
   ↓
9. Call smart contract createInvoice()
   ↓
10. Update Supabase with selected_network & blockchain_invoice_id
    ↓
11. Return blockchain confirmation
```

### Payment Detection Flow

```
1. Frontend monitors blockchain for payment event
   ↓
2. Payment detected
   ↓
3. Frontend → PUT /api/invoices/:id/payment-data
   {
     paid_token, paid_network, paid_tx_hash,
     wallet_address, paid_amount
   }
   ↓
4. Update invoice in Supabase
   ↓
5. Frontend → PUT /api/invoices/:id/status { status: "Paid" }
   ↓
6. Update status in Supabase
   ↓
7. Cron job picks up for notifications
```

### Notification Flow

```
1. Cron triggers /api/notifications/process-emails
   ↓
2. Query invoices needing emails
   ↓
3. Batch first 20 invoices
   ↓
4. For each invoice (parallel):
   a. Get commerce data
   b. Verify blockchain status
   c. Generate email HTML
   d. Send via Resend
   e. Mark confirmation_email_sent = true
   ↓
5. Return success
```

---

## 🔒 Security & Authentication

### Current State

⚠️ **No authentication implemented** (see TODO.md for roadmap)

### Recommended Security Measures (TODO)

1. **API Authentication**

   - JWT token-based auth
   - API key per commerce
   - Rate limiting

2. **Request Validation**

   - Input sanitization
   - Schema validation
   - CORS configuration

3. **Data Protection**
   - HTTPS only in production
   - Encrypted environment variables
   - Secure database connections

### Existing Security Features

✅ **Environment Variables**: Sensitive data in `.env`  
✅ **Supabase RLS**: Row-level security  
✅ **Type Safety**: TypeScript prevents many errors  
✅ **Error Handling**: No sensitive data in error messages

---

## 🌍 Environment Variables

### Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-key

# Blockchain Configuration
PRIVATE_KEY=your_celo_private_key_here

# Server Configuration
PORT=3000                                # Development: 3000, Production: 8080
NODE_ENV=development                     # development | production

# External APIs
COINGECKO_APIKEY=your_coingecko_api_key
OPENEXCHANGERATE_APPID=your_openexchangerates_app_id

# Email Service
RESEND_APIKEY=your_resend_api_key
```

### Optional Overrides

```env
# Override RPC URLs
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
```

---

## 🚀 Deployment

### Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

Server runs at: http://localhost:3000

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Production Environment

```env
NODE_ENV=production
PORT=8080
```

**Important**: Server listens on `0.0.0.0` when port is 8080 (for cloud deployment), otherwise `127.0.0.1`.

```typescript
// src/index.ts
const port = Number(process.env.PORT || 3000);
const host = port === 8080 ? "0.0.0.0" : "127.0.0.1";
```

### Deployment Platforms

Recommended:

- **DigitalOcean App Platform**: Simple deployment, built-in cron jobs
- **Heroku**: Easy setup, add-ons available
- **Railway**: Modern platform, simple configuration
- **Render**: Free tier available

### Health Checks

```bash
# Basic health check
GET /health
# Response: { "status": "ok", "timestamp": "..." }

# Detailed system info
GET /ping
# Response: { "pong": true, "uptime": 123, "memory": {...}, ... }
```

---

## 📊 Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│              (React / Next.js / Mobile)                 │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   Fastify API Server                    │
│  ┌───────────┬───────────┬──────────┬─────────────┐   │
│  │ Invoices  │Blockchain │Commerces │ Notifications│   │
│  │  Routes   │  Routes   │  Routes  │   Routes     │   │
│  └───────────┴───────────┴──────────┴─────────────┘   │
│  ┌───────────┬───────────┬──────────┬─────────────┐   │
│  │   Token   │   Fiat    │  Expire  │ Notification│   │
│  │  Prices   │   Rates   │  Orders  │   Service   │   │
│  └───────────┴───────────┴──────────┴─────────────┘   │
└──────────┬──────────────┬──────────────┬──────────────┘
           │              │              │
           ↓              ↓              ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │  Blockchain  │  │   External   │
│  PostgreSQL  │  │ (Celo Smart  │  │     APIs     │
│   Database   │  │  Contracts)  │  │ (CoinGecko,  │
└──────────────┘  └──────────────┘  │  Resend, OER)│
                                     └──────────────┘
```

### Database Relationships

```
commerces ────────────┐
   │                  │
   │ 1:N              │ N:M
   ↓                  ↓
invoices        tokens_enabled
                      │
networks              │ N:1
   │                  ↓
   │ 1:N        tokens_addresses
   ↓                  │
tokens_addresses      │ N:1
                      ↓
                    tokens
```

### Request-Response Flow

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Client  │────────→│  Route  │────────→│ Service  │
└─────────┘         └─────────┘         └──────────┘
     ↑                                        │
     │                                        ↓
     │                                   ┌──────────┐
     │                                   │ Database │
     │                                   │   or     │
     │                                   │Blockchain│
     │                                   └──────────┘
     │                                        │
     └────────────────────────────────────────┘
              Response (JSON)
```

---

## 🎯 Key Insights & Best Practices

### 1. Network Determination

- **Entry Point**: Frontend sends `chainId`
- **Conversion**: `getNetworkByChainId(chainId)` → `networkName`
- **Usage**: All services receive `networkName` parameter
- **Centralization**: All network config in `networks.ts`

### 2. ENS Handling

- **Problem**: Celo doesn't support ENS
- **Solution**: `supportsENS: false` parameter
- **Implementation**: Disable ENS in provider config

### 3. Batch Processing

- **Why**: Respect cron timeout limits (30s)
- **Email**: 20 per execution
- **Webhooks**: 10 per execution
- **Parallel**: Use `Promise.all()` for efficiency

### 4. Error Handling

- **Blockchain**: Custom `BlockchainError` class
- **HTTP**: Proper status codes (400, 404, 500)
- **Logging**: Detailed console logs with emojis
- **Recovery**: Graceful degradation

### 5. Type Safety

- **Interfaces**: Define all data structures
- **Strict Mode**: TypeScript strict mode enabled
- **Validation**: Runtime validation + compile-time checks

### 6. Configuration Management

- **Separation**: Config files for networks, contracts, tokens
- **Helper Functions**: `getNetworkByChainId()`, `getTokenSymbol()`
- **Centralization**: Avoid duplication across files

---

## 📚 Additional Resources

- [README.md](./README.md) - Project overview
- [TODO.md](./TODO.md) - Feature roadmap
- [BLOCKCHAIN_INTEGRATION.md](./src/blockchain/BLOCKCHAIN_INTEGRATION.md) - Blockchain details
- [db/README.md](./db/README.md) - Database documentation
- [src/business/README.md](./src/business/README.md) - Business services

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated**: October 21, 2025  
**Author**: Deramp Team  
**Version**: 1.0.0
