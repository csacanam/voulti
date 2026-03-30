# 🎨 Deramp Backend - Visual Overview

Visual diagrams and flowcharts for quick understanding of the system architecture.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                         │
│                  (Web App / Mobile App / Frontend)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS/REST API
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        FASTIFY API SERVER                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                      ROUTES LAYER                                │ │
│ │  ┌──────────┬──────────┬──────────┬──────────┬─────────────┐   │ │
│ │  │ Invoices │Blockchain│Commerces │  Prices  │Notifications│   │ │
│ │  │          │          │          │          │             │   │ │
│ │  │  POST /  │POST/GET  │  GET /   │POST cron │ POST cron   │   │ │
│ │  │  GET /:id│/create   │  GET /:id│endpoints │ endpoints   │   │ │
│ │  │  PUT /:id│/status   │          │          │             │   │ │
│ │  └──────────┴──────────┴──────────┴──────────┴─────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                   BUSINESS LOGIC LAYER                           │ │
│ │  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │ │
│ │  │Notification  │ TokenPrice   │  FiatRate    │ExpireOrders │  │ │
│ │  │   Service    │   Service    │   Service    │   Service   │  │ │
│ │  └──────────────┴──────────────┴──────────────┴─────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                 BLOCKCHAIN INTEGRATION LAYER                     │ │
│ │  ┌──────────────┬──────────────┬──────────────────────────────┐│ │
│ │  │  Deramp      │   Invoice    │   Config (networks, tokens,  ││ │
│ │  │  Service     │   Service    │   contracts)                 ││ │
│ │  └──────────────┴──────────────┴──────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────────────────┘ │
└────┬──────────────────┬──────────────────┬──────────────────────────┘
     │                  │                  │
     ↓                  ↓                  ↓
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Supabase │    │  Blockchain  │    │   External   │
│PostgreSQL│    │  (Celo)      │    │   Services   │
│ Database │    │              │    │              │
│          │    │ Smart        │    │ • CoinGecko  │
│• invoices│    │ Contracts:   │    │ • Resend     │
│• commerce│    │ • Deramp     │    │ • OpenExRate │
│• tokens  │    │   Proxy      │    │              │
│• networks│    │ • Invoice    │    │              │
│• etc.    │    │   Manager    │    │              │
└──────────┘    │ • Access     │    └──────────────┘
                │   Manager    │
                └──────────────┘
```

---

## 🔄 Complete Invoice Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: INVOICE CREATION                         │
└─────────────────────────────────────────────────────────────────────┘

Client                Backend (DB)           Backend (Blockchain)       Blockchain
  │                        │                        │                      │
  ├─POST /api/invoices────→│                        │                      │
  │ {commerce_id,          │                        │                      │
  │  amount_fiat}          │                        │                      │
  │                        ├─Create invoice         │                      │
  │                        │ status: Pending        │                      │
  │                        │ expires_at: +1h        │                      │
  │←─invoice_id────────────┤                        │                      │
  │                        │                        │                      │
  ├─POST /api/blockchain/create──────────────────→ │                      │
  │ {invoiceId, chainId,   │                        │                      │
  │  paymentOptions}       │                        │                      │
  │                        │                        ├─chainId→networkName  │
  │                        │                        ├─InvoiceService.      │
  │                        │                        │ createInvoice()      │
  │                        │                        ├──────────────────────→│
  │                        │                        │                      │ Create invoice
  │                        │                        │←─tx hash─────────────┤
  │                        │                        │                      │
  │                        │←─Update: selected_     │                      │
  │                        │  network, blockchain_  │                      │
  │                        │  invoice_id            │                      │
  │←─success───────────────┴────────────────────────┤                      │

┌─────────────────────────────────────────────────────────────────────┐
│                  PHASE 2: PAYMENT MONITORING                         │
└─────────────────────────────────────────────────────────────────────┘

Client               Backend (DB)               Blockchain
  │                       │                         │
  ├─Monitor blockchain────┼─────────────────────────→│
  │ (listen for payment   │                         │
  │  events)              │                         │
  │                       │                         │
  │←─Payment detected─────┼─────────────────────────┤
  │ (paid_token,          │                         │
  │  paid_tx_hash,        │                         │
  │  paid_amount)         │                         │
  │                       │                         │
  ├─PUT /api/invoices/:id/payment-data────────────→ │
  │                       ├─Update payment data     │
  │                       │                         │
  ├─PUT /api/invoices/:id/status──────────────────→ │
  │ {status: "Paid"}      ├─Update status: Paid    │
  │                       │ paid_at: now()          │
  │←─success──────────────┤                         │

┌─────────────────────────────────────────────────────────────────────┐
│                 PHASE 3: NOTIFICATION DELIVERY                       │
└─────────────────────────────────────────────────────────────────────┘

Cron Job          Backend Service         Blockchain      External
  │                      │                     │             │
  ├─POST /api/notifications/process-emails────→│             │
  │                      ├─Query invoices      │             │
  │                      │ needing emails      │             │
  │                      │                     │             │
  │                      ├─Verify blockchain───→│             │
  │                      │ status              │             │
  │                      │←─confirmed──────────┤             │
  │                      │                     │             │
  │                      ├─Generate email      │             │
  │                      ├─Send via Resend─────┼─────────────→│
  │                      │                     │             │ Send email
  │                      │←─success────────────┼─────────────┤
  │                      ├─Mark email_sent     │             │
  │←─success─────────────┤                     │             │
  │                      │                     │             │
  ├─POST /api/notifications/process-url-confirmations────→ │ │
  │                      ├─Query invoices      │             │
  │                      │ needing webhooks    │             │
  │                      │                     │             │
  │                      ├─POST to commerce────┼─────────────→│
  │                      │ confirmation_url    │             │ Webhook
  │                      │                     │             │
  │                      │←─200 OK─────────────┼─────────────┤
  │                      ├─Mark url_response   │             │
  │←─success─────────────┤                     │             │
```

---

## 🗄️ Database Entity Relationships

```
                    ┌─────────────────┐
                    │   commerces     │
                    ├─────────────────┤
                    │ • id (PK)       │
                    │ • name          │
                    │ • wallet        │
                    │ • confirmation_ │
                    │   url           │
                    │ • confirmation_ │
                    │   email         │
                    │ • currency      │
                    │ • minAmount     │
                    │ • maxAmount     │
                    └────┬────────┬───┘
                         │ 1:N    │ N:M
                         │        │
                ┌────────↓        ↓──────────────┐
                │                                 │
          ┌─────┴──────────┐          ┌─────────┴────────┐
          │   invoices     │          │ tokens_enabled   │
          ├────────────────┤          ├──────────────────┤
          │ • id (PK)      │          │ • id (PK)        │
          │ • commerce_id  │          │ • commerce_id    │
          │   (FK)         │          │   (FK)           │
          │ • amount_fiat  │          │ • token_id (FK)  │
          │ • status       │          └─────────┬────────┘
          │ • selected_    │                    │ N:1
          │   network      │                    │
          │ • blockchain_  │                    ↓
          │   invoice_id   │          ┌─────────────────┐
          │ • paid_*       │          │tokens_addresses │
          │ • confirmation_│          ├─────────────────┤
          │   email_*      │          │ • id (PK)       │
          │ • confirmation_│          │ • token_symbol  │
          │   url_*        │          │   (FK)          │
          └────────────────┘          │ • network (FK)  │
                                      │ • contract_     │
                                      │   address       │
                                      │ • decimals      │
                                      └────┬────────┬───┘
                                           │ N:1    │ N:1
                                           │        │
                                ┌──────────↓        ↓──────────┐
                                │                              │
                        ┌───────┴───────┐          ┌─────────┴────────┐
                        │    tokens     │          │    networks      │
                        ├───────────────┤          ├──────────────────┤
                        │ • symbol (PK) │          │ • name (PK)      │
                        │ • name        │          │ • chain_id       │
                        │ • rate_to_usd │          │ • rpc_url        │
                        │ • is_enabled  │          │ • proxy_contract │
                        │ • updated_at  │          │ • is_active      │
                        └───────────────┘          └──────────────────┘

                    ┌────────────────────┐
                    │fiat_exchange_rates │
                    ├────────────────────┤
                    │ • currency_code(PK)│
                    │ • usd_to_currency_ │
                    │   rate             │
                    │ • fetched_at       │
                    └────────────────────┘
```

---

## 🌐 Network Configuration Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   NETWORK DETERMINATION                       │
└──────────────────────────────────────────────────────────────┘

Frontend                networks.ts             Usage Across System
   │                         │                          │
   │ Request with           │                          │
   │ chainId: 44787         │                          │
   ├────────────────────────→│                          │
   │                         │                          │
   │                         ├─getNetworkByChainId     │
   │                         │ (44787)                 │
   │                         │                          │
   │                         ├─Find in NETWORKS        │
   │                         │ Object.entries(NETWORKS) │
   │                         │ .find(config =>          │
   │                         │   config.chainId===44787)│
   │                         │                          │
   │                         ├─Return: "alfajores"     │
   │                         │                          │
   │←─"alfajores"────────────┤                          │
   │                         │                          │
   │                         ├──────────────────────────→│
   │                         │                          │
   │                         │                   NETWORKS["alfajores"]
   │                         │                   ↓
   │                         │                   • chainId: 44787
   │                         │                   • name: "Celo Alfajores"
   │                         │                   • rpcUrl: "https://..."
   │                         │                   • blockExplorer: "https://..."
   │                         │                          │
   │                         │                   CONTRACTS["alfajores"]
   │                         │                   ↓
   │                         │                   • DERAMP_PROXY: "0x..."
   │                         │                   • INVOICE_MANAGER: "0x..."
   │                         │                   • ACCESS_MANAGER: "0x..."
   │                         │                          │
   │                         │                   TOKENS["alfajores"]
   │                         │                   ↓
   │                         │                   • CCOP: {address, symbol, decimals}
   │                         │                   • CUSD: {address, symbol, decimals}
   │                         │                   • CEUR: {address, symbol, decimals}
   │                         │                          │
   │                         │                   InvoiceService("alfajores")
   │                         │                   ↓
   │                         │                   • Initialized with network config
   │                         │                   • Connected to correct RPC
   │                         │                   • Using correct contracts
```

---

## 📧 Notification System Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     EMAIL NOTIFICATIONS                           │
└──────────────────────────────────────────────────────────────────┘

Cron (Every 1 min)     NotificationService         Supabase         Blockchain        Resend
       │                       │                        │                │               │
       ├─POST /process-emails→│                        │                │               │
       │                       ├─getInvoicesNeeding────→│                │               │
       │                       │ EmailNotification      │                │               │
       │                       │ WHERE status IN        │                │               │
       │                       │ ('Paid','Expired',     │                │               │
       │                       │  'Refunded')           │                │               │
       │                       │ AND email_available    │                │               │
       │                       │ AND NOT email_sent     │                │               │
       │                       │←─invoices[]────────────┤                │               │
       │                       │                        │                │               │
       │                       ├─Take batch (20)        │                │               │
       │                       │                        │                │               │
       │                       ├─For each invoice:      │                │               │
       │                       │                        │                │               │
       │                       ├─getCommerceData────────→│                │               │
       │                       │←─commerce──────────────┤                │               │
       │                       │                        │                │               │
       │                       ├─verifyBlockchainStatus─┼────────────────→│               │
       │                       │ (skip for Expired)     │                │               │
       │                       │←─confirmed─────────────┼────────────────┤               │
       │                       │                        │                │               │
       │                       ├─generateEmailHtml      │                │               │
       │                       │ (status-specific)      │                │               │
       │                       │                        │                │               │
       │                       ├─resend.emails.send─────┼────────────────┼───────────────→│
       │                       │                        │                │               │ Send
       │                       │←─success───────────────┼────────────────┼───────────────┤
       │                       │                        │                │               │
       │                       ├─updateInvoiceField─────→│                │               │
       │                       │ email_sent = true      │                │               │
       │                       │                        │                │               │
       │←─success──────────────┤                        │                │               │

┌──────────────────────────────────────────────────────────────────┐
│                   WEBHOOK CONFIRMATIONS                           │
└──────────────────────────────────────────────────────────────────┘

Cron (Every 1 min)   NotificationService    Supabase    Blockchain   Commerce URL
       │                     │                   │           │             │
       ├─POST /process-url─→ │                   │           │             │
       │  confirmations      │                   │           │             │
       │                     ├─getInvoicesNeeding│           │             │
       │                     │ UrlConfirmation───→│           │             │
       │                     │ WHERE url_available│           │             │
       │                     │ AND NOT url_response│          │             │
       │                     │ AND retries < 5    │           │             │
       │                     │←─invoices[]────────┤           │             │
       │                     │                    │           │             │
       │                     ├─Take batch (10)    │           │             │
       │                     │                    │           │             │
       │                     ├─For each invoice:  │           │             │
       │                     │                    │           │             │
       │                     ├─verifyBlockchain───┼───────────→│             │
       │                     │←─confirmed─────────┼───────────┤             │
       │                     │                    │           │             │
       │                     ├─fetch(confirmation_│           │             │
       │                     │  url, {timeout:2s})┼───────────┼─────────────→│
       │                     │ POST {invoice_data}│           │             │ Webhook
       │                     │                    │           │             │
       │                     │←─200 OK────────────┼───────────┼─────────────┤
       │                     │ (or error)         │           │             │
       │                     │                    │           │             │
       │                     ├─If success:        │           │             │
       │                     │ url_response=true──→│           │             │
       │                     │                    │           │             │
       │                     ├─If failure:        │           │             │
       │                     │ retries++──────────→│           │             │
       │                     │                    │           │             │
       │                     ├─If retries==5:     │           │             │
       │                     │ sendFailureEmail───→│           │             │
       │                     │                    │           │             │
       │←─success────────────┤                    │           │             │
```

---

## ⚡ Batch Processing Strategy

```
┌──────────────────────────────────────────────────────────────┐
│         WHY BATCH PROCESSING?                                 │
│                                                               │
│ • Cron job timeout: 30 seconds maximum                       │
│ • Network latency: ~100-500ms per request                    │
│ • Blockchain queries: ~1-2s per verification                 │
│ • Email sending: ~200-500ms per email                        │
│ • Webhook calls: 2s timeout per call                         │
│                                                               │
│ Solution: Process in batches with parallel execution         │
└──────────────────────────────────────────────────────────────┘

EMAIL BATCH (20 emails per execution)
┌─────────────────────────────────────┐
│ Total invoices needing email: 100   │
│                                     │
│ Execution 1:  Process 1-20          │  ← Cron run 1
│ Execution 2:  Process 21-40         │  ← Cron run 2
│ Execution 3:  Process 41-60         │  ← Cron run 3
│ Execution 4:  Process 61-80         │  ← Cron run 4
│ Execution 5:  Process 81-100        │  ← Cron run 5
│                                     │
│ Total time: ~5 minutes              │
│ Capacity: 1,200 emails/hour         │
└─────────────────────────────────────┘

WEBHOOK BATCH (10 webhooks per execution)
┌─────────────────────────────────────┐
│ Total invoices needing webhook: 50  │
│                                     │
│ Execution 1:  Process 1-10          │  ← Cron run 1
│ Execution 2:  Process 11-20         │  ← Cron run 2
│ Execution 3:  Process 21-30         │  ← Cron run 3
│ Execution 4:  Process 31-40         │  ← Cron run 4
│ Execution 5:  Process 41-50         │  ← Cron run 5
│                                     │
│ Total time: ~5 minutes              │
│ Capacity: 600 webhooks/hour         │
└─────────────────────────────────────┘

PARALLEL EXECUTION (Promise.all)
┌─────────────────────────────────────┐
│ Batch of 10 webhooks                │
│                                     │
│ ┌───┬───┬───┬───┬───┐              │
│ │ 1 │ 2 │ 3 │ 4 │ 5 │  ← Parallel  │
│ └───┴───┴───┴───┴───┘              │
│ ┌───┬───┬───┬───┬───┐              │
│ │ 6 │ 7 │ 8 │ 9 │10 │  ← Parallel  │
│ └───┴───┴───┴───┴───┘              │
│                                     │
│ Time: max(all parallel times)       │
│ ≈ 2-5 seconds for 10 webhooks       │
└─────────────────────────────────────┘
```

---

## 🔧 Service Layer Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      BUSINESS SERVICES                          │
└────────────────────────────────────────────────────────────────┘

┌───────────────────────┐  ┌───────────────────────┐
│ NotificationService   │  │  TokenPriceService    │
├───────────────────────┤  ├───────────────────────┤
│ • Constructor()       │  │ • Constructor()       │
│   - supabase          │  │   - supabase          │
│   - resend            │  │   - apiKey            │
│   - maxRetries: 5     │  │   - baseUrl           │
│   - batchSize: 10     │  │                       │
│   - emailBatch: 20    │  │ • Methods:            │
│                       │  │   - updateAllToken    │
│ • Methods:            │  │     Prices()          │
│   - processAllPending │  │   - getEnabledTokens  │
│     Emails()          │  │     FromDatabase()    │
│   - processAllPending │  │   - fetchPricesFrom   │
│     UrlConfirmations()│  │     CoinGecko()       │
│   - verifyBlockchain  │  │   - updateTokenPrices │
│     Status()          │  │     InDatabase()      │
│   - sendStatusEmail() │  │                       │
│   - sendToConfirmation│  │ • External API:       │
│     Url()             │  │   CoinGecko API       │
│   - generateEmailHtml()│  │                       │
│                       │  │ • Cron: Daily         │
│ • External APIs:      │  └───────────────────────┘
│   Resend, Blockchain  │
│                       │
│ • Cron: 1 minute      │
└───────────────────────┘

┌───────────────────────┐  ┌───────────────────────┐
│   FiatRateService     │  │  ExpireOrdersService  │
├───────────────────────┤  ├───────────────────────┤
│ • Constructor()       │  │ • Constructor()       │
│   - supabase          │  │   - supabase          │
│   - apiKey            │  │                       │
│   - baseUrl           │  │ • Methods:            │
│                       │  │   - expirePending     │
│ • Methods:            │  │     Orders()          │
│   - updateAllFiatRates│  │   - getPendingInvoices│
│   - getSupportedFiat  │  │   - filterExpired     │
│     Currencies()      │  │     Invoices()        │
│   - fetchFiatRatesFrom│  │   - updateExpired     │
│     API()             │  │     Invoices()        │
│   - updateFiatRatesIn │  │                       │
│     Database()        │  │ • Logic:              │
│                       │  │   expires_at <= now() │
│ • External API:       │  │   → status = Expired  │
│   OpenExchangeRates   │  │                       │
│                       │  │ • Cron: 1-5 minutes   │
│ • Cron: Daily         │  └───────────────────────┘
└───────────────────────┘
```

---

## ⛓️ Blockchain Service Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│                    DerampService (Base)                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Protected Properties:                                       │
│ • network: NetworkKey                                       │
│ • contractAddress: string                                   │
│ • abi: any                                                  │
│ • wallet: ethers.Wallet | null                             │
│ • contract: ethers.Contract | null                         │
│ • provider: ethers.Provider | null                         │
│ • supportsENS?: boolean                                     │
│                                                             │
│ Constructor(network, supportsENS):                          │
│ • Sets network name                                         │
│ • Gets contract address from CONTRACTS[network]            │
│ • Loads ABI from DerampProxy.json                          │
│                                                             │
│ async init(privateKey):                                     │
│ • Creates wallet with getWallet(privateKey, network, ENS)  │
│ • Creates provider                                          │
│ • Creates contract instance                                 │
└──────────────────────┬─────────────────────────────────────┘
                       │ extends
                       ↓
┌────────────────────────────────────────────────────────────┐
│                      InvoiceService                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Constructor(network, supportsENS):                          │
│ • Calls super(network, supportsENS)                        │
│                                                             │
│ async createInvoice(params):                               │
│ • Converts payment options to blockchain format            │
│ • Calls contract.createInvoice()                           │
│ • Returns transaction hash and invoice ID                  │
│                                                             │
│ async getInvoiceStatus(invoiceId):                         │
│ • Calls contract.getInvoiceStatus()                        │
│ • Parses blockchain response                               │
│ • Returns status, commerce, expiration, payment data       │
│                                                             │
│ async cancelInvoice(invoiceId):                            │
│ • Calls contract.cancelInvoice()                           │
│ • Returns transaction hash and success                     │
│                                                             │
│ async isTokenWhitelistedForCommerce(commerce, token):      │
│ • Gets AccessManager address from contract                 │
│ • Calls accessManager.isTokenWhitelistedForCommerce()      │
│ • Returns boolean                                          │
│                                                             │
│ async getWhitelistedTokensForCommerce(commerce):           │
│ • Gets AccessManager address                               │
│ • Calls accessManager.getWhitelistedTokens()               │
│ • Filters by commerce                                      │
│ • Returns array of token addresses                         │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Configuration Dependency Graph

```
┌────────────────────────────────────────────────────────────┐
│               CONFIGURATION HIERARCHY                       │
└────────────────────────────────────────────────────────────┘

                    Frontend Request
                           │
                           ↓
                    ┌──────────────┐
                    │   chainId    │ ← Entry point: 44787
                    └──────┬───────┘
                           │
                           ↓
          ┌────────────────────────────────┐
          │  getNetworkByChainId(chainId)  │ ← Conversion
          └────────────────┬───────────────┘
                           │
                           ↓
                    ┌──────────────┐
                    │ networkName  │ ← Result: "alfajores"
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ↓             ↓             ↓
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  NETWORKS  │  │ CONTRACTS  │  │   TOKENS   │
    │["alfajores"]│ │["alfajores"]│ │["alfajores"]│
    └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
           │                │                │
           ↓                ↓                ↓
    • chainId: 44787    • DERAMP_PROXY  • CCOP: {
    • name: "Celo       • INVOICE_         address,
      Alfajores"          MANAGER           symbol,
    • rpcUrl            • ACCESS_           decimals
    • blockExplorer       MANAGER         }
                                          • CUSD: {...}
           │                │                │
           └────────────────┼────────────────┘
                            ↓
                ┌───────────────────────┐
                │  InvoiceService       │
                │  ("alfajores")        │
                └───────────────────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │ Blockchain Operations │
                └───────────────────────┘
```

---

## 📊 Data Flow Summary

```
┌──────────────────────────────────────────────────────────────┐
│                   COMPLETE DATA FLOW                          │
└──────────────────────────────────────────────────────────────┘

User Action
    ↓
Frontend (React/Next.js/Mobile)
    ↓ HTTP Request (JSON)
API Routes (Fastify)
    ↓ Route Handler
Business Services (if needed)
    ↓ Service Method
Data Layer
    ├─→ Supabase (Database queries)
    ├─→ Blockchain (Smart contract calls)
    └─→ External APIs (CoinGecko, Resend, etc.)
    ↓ Response
Business Services (process data)
    ↓ Formatted Response
API Routes (JSON response)
    ↓ HTTP Response
Frontend (Update UI)
    ↓
User sees result
```

---

**For detailed explanations, see:**

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture documentation
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Quick reference guide

---

**Last Updated**: October 21, 2025  
**Visual Guide Version**: 1.0.0
