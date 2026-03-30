# 🔌 Frontend Integration Guide - API Documentation

**API reference for integrating with Deramp Backend**

---

## 🚀 Quick Start

### Endpoints Summary

| Endpoint                           | Method | Purpose                        |
| ---------------------------------- | ------ | ------------------------------ |
| `/api/commerces/by-wallet/:wallet` | GET    | Get commerce by wallet address |
| `/api/commerces`                   | POST   | Register new commerce          |
| `/api/payouts`                     | POST   | Create payout                  |

### Typical Flow

1. User connects wallet → Get wallet address
2. `GET /api/commerces/by-wallet/{wallet}` → Check if commerce exists
3. If 404 → `POST /api/commerces` → Register commerce
4. Use `commerce_id` → `POST /api/payouts` → Create payout

---

## 🌐 Backend URLs

### Development

```
http://localhost:3000
```

### Production

```
https://your-backend-domain.com
```

### Base API Path

```
/api
```

---

## 🔐 Authentication Flow

The backend uses **wallet addresses** as the primary identifier. The recommended flow is:

```
1. User connects wallet (via Privy or other wallet provider)
   ↓
2. GET /api/commerces/by-wallet/{wallet}
   ├─ 200 → Commerce exists, use commerce_id
   └─ 404 → Commerce doesn't exist, register first
   ↓
3. If 404: POST /api/commerces {wallet, name, descriptions, email}
   ↓
4. Use commerce_id in all subsequent API calls
```

---

## 📡 API Endpoints

All commerce-related endpoints are under `/api/commerces`.

### 1. Get Commerce by Wallet

Get existing commerce account for a wallet address.

```http
GET /api/commerces/by-wallet/:wallet
```

**URL Parameters:**

- `wallet` (string, required) - Wallet address (case insensitive)

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "commerce_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Business",
    "wallet": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "spread": 0,
    "currency": "COP",
    "currencySymbol": "$",
    "description_spanish": "Mi negocio",
    "description_english": "My business",
    "minAmount": 1000,
    "maxAmount": 1000000,
    "icon_url": "https://example.com/logo.png",
    "confirmation_url": "https://mybusiness.com/webhook",
    "confirmation_email": "contact@mybusiness.com",
    "created_at": "2025-10-21T12:00:00.000Z"
  }
}
```

**Response 404 - Commerce Not Found:**

```json
{
  "error": "Commerce not found for this wallet"
}
```

**Response 400 - Bad Request:**

```json
{
  "error": "Wallet address is required"
}
```

**Example:**

```bash
curl http://localhost:3000/api/commerces/by-wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

### 2. Register New Commerce

Create a new commerce account.

```http
POST /api/commerces
```

**Request Body:**

```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "name": "My Business Name",
  "description_spanish": "Descripción de mi negocio",
  "description_english": "Description of my business",
  "email": "contact@mybusiness.com",
  "icon_url": "https://example.com/logo.png",
  "currency": "COP",
  "minAmount": 1000,
  "maxAmount": 1000000,
  "currencySymbol": "$",
  "confirmation_url": "https://mybusiness.com/webhook"
}
```

**Required Fields:**

- `wallet` (string) - Wallet address
- `name` (string) - Business name
- `description_spanish` (string) - Description in Spanish
- `description_english` (string) - Description in English

**Optional Fields (with defaults):**

- `email` (string) - Email for notifications (maps to `confirmation_email`)
- `icon_url` (string) - Logo URL (default: null)
- `currency` (string) - Fiat currency (default: "COP")
- `minAmount` (number) - Minimum payment amount (default: null)
- `maxAmount` (number) - Maximum payment amount (default: null)
- `currencySymbol` (string) - Currency symbol (default: "$")
- `confirmation_url` (string) - Webhook URL for notifications (default: null)

**Response 201 - Created:**

```json
{
  "success": true,
  "data": {
    "commerce_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Business Name",
    "wallet": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "currency": "COP"
  }
}
```

**Response 409 - Already Exists:**

```json
{
  "error": "Commerce already exists for this wallet"
}
```

**Response 400 - Missing Fields:**

```json
{
  "error": "Missing required fields: wallet, name, description_spanish, description_english"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/commerces \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "name": "My Business",
    "description_spanish": "Mi negocio de pagos",
    "description_english": "My payment business",
    "email": "user@example.com",
    "icon_url": "https://example.com/logo.png",
    "currency": "COP",
    "minAmount": 1000,
    "maxAmount": 1000000,
    "currencySymbol": "$",
    "confirmation_url": "https://mybusiness.com/webhook"
  }'
```

---

### 3. Create Payout

Create a new payout transaction using bridge route configuration.

```http
POST /api/payouts
```

**Request Body:**

```json
{
  "commerce_id": "550e8400-e29b-41d4-a716-446655440000",
  "from_fiat": "USD",
  "to_fiat": "COP",
  "from_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to_name": "John Doe",
  "to_email": "john@example.com",
  "to_amount": 450000.75
}
```

**Required Fields:**

- `commerce_id` - ID of the commerce creating the payout
- `from_fiat` - Source fiat currency (e.g., "USD")
- `to_fiat` - Destination fiat currency (e.g., "COP")
- `from_address` - Source wallet address
- `to_name` - Recipient name
- `to_email` - Recipient email
- `to_amount` - Amount in destination currency

**Optional Fields:**

- `to_address` - Destination wallet address (will be provided later when user claims the payout)

**Note:** The system automatically:

1. Looks up the bridge route configuration based on the fiat currency pair
2. Calculates `fromAmount` using the exchange rate from `fiat_exchange_rates` table
3. Uses the route's blockchain details (chains, tokens, provider, etc.) for the payout

**Response 201 - Created:**

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "commerce_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "from_chain": 44787,
    "from_chain_name": "alfajores",
    "from_token_symbol": "cCOP",
    "from_token_address": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    "from_token_decimals": 18,
    "from_amount": 112.5,
    "from_currency": "USD",
    "to_chain": 42220,
    "to_chain_name": "celo",
    "to_address": null,
    "to_token_symbol": "cUSD",
    "to_token_address": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    "to_token_decimals": 18,
    "to_amount": 450000.75,
    "to_currency": "COP",
    "to_name": "John Doe",
    "to_email": "john@example.com",
    "provider": "squid",
    "status": "Pending",
    "created_at": "2025-10-21T12:00:00.000Z"
  }
}
```

**Response 400 - Missing Fields:**

```json
{
  "error": "Missing required fields: commerce_id, from_address, from_chain, to_chain, to_address"
}
```

**Response 404 - Commerce Not Found:**

```json
{
  "error": "Commerce not found"
}
```

**Response 500 - Server Error:**

```json
{
  "error": "Failed to create payout"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/payouts \
  -H "Content-Type: application/json" \
  -d '{
    "commerce_id": "550e8400-e29b-41d4-a716-446655440000",
    "from_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "from_chain": 44787,
    "from_chain_name": "alfajores",
    "from_token_symbol": "cCOP",
    "from_token_address": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    "from_token_decimals": 18,
    "fromAmount": 100000,
    "fromCurrency": "COP",
    "to_chain": 42220,
    "to_chain_name": "celo",
    "to_address": "0x1234567890123456789012345678901234567890",
    "to_token_symbol": "cUSD",
    "to_token_address": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    "to_token_decimals": 18,
    "to_amount": 25.5,
    "toCurrency": "USD",
    "to_name": "John Doe",
    "to_email": "john@example.com",
    "provider": "squid"
  }'
```

---

## 📦 TypeScript Types

Type definitions for API requests and responses:

```typescript
// Commerce Types
export interface CommerceData {
  commerce_id: string;
  name: string;
  wallet: string;
  spread: number;
  currency: string;
  currencySymbol: string;
  description_spanish: string;
  description_english: string;
  minAmount: number | null;
  maxAmount: number | null;
  icon_url: string | null;
  confirmation_url: string | null;
  confirmation_email: string | null;
  created_at: string;
}

export interface RegisterCommerceRequest {
  // Required fields
  wallet: string;
  name: string;
  description_spanish: string;
  description_english: string;

  // Optional fields (frontend provides or uses defaults)
  email?: string;
  icon_url?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  currencySymbol?: string;
  confirmation_url?: string;
}

// Payout Types
export interface CreatePayoutRequest {
  commerce_id: string;
  from_address: string;
  from_chain: number;
  from_chain_name: string;
  from_token_symbol: string;
  from_token_address: string;
  from_token_decimals: number;
  fromAmount: number;
  fromCurrency: string;
  to_chain: number;
  to_chain_name: string;
  to_address: string;
  to_token_symbol: string;
  to_token_address: string;
  to_token_decimals: number;
  to_amount: number;
  toCurrency: string;
  to_name: string;
  to_email: string;
  provider: string;
}

export interface PayoutResponse extends CreatePayoutRequest {
  id: string;
  created_at: string;
}

// API Response Wrappers
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  error: string;
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Status Code | Meaning        | Action                        |
| ----------- | -------------- | ----------------------------- |
| 200         | Success (GET)  | Process data                  |
| 201         | Created (POST) | Resource created successfully |
| 400         | Bad Request    | Check request body/parameters |
| 404         | Not Found      | Resource doesn't exist        |
| 409         | Conflict       | Resource already exists       |
| 500         | Server Error   | Contact backend team          |

### Common Errors

#### GET /api/commerces/by-wallet/:wallet

| Error                       | Cause                          | Solution                |
| --------------------------- | ------------------------------ | ----------------------- |
| 404 Commerce not found      | Wallet has no commerce account | Register commerce first |
| 400 Wallet address required | Missing wallet parameter       | Provide wallet in URL   |

#### POST /api/commerces

| Error                       | Cause                                 | Solution                    |
| --------------------------- | ------------------------------------- | --------------------------- |
| 409 Commerce already exists | Wallet already registered             | Use existing commerce_id    |
| 400 Missing required fields | Missing wallet, name, or descriptions | Include all required fields |

#### POST /api/payouts

| Error                       | Cause                   | Solution                    |
| --------------------------- | ----------------------- | --------------------------- |
| 404 Commerce not found      | Invalid commerce_id     | Verify commerce exists      |
| 400 Missing required fields | Incomplete request body | Include all required fields |

---

## 🧪 Testing the API

### 1. Health Check

Verify backend is running:

```bash
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

### 2. Test Authentication Flow

```bash
# Step 1: Try to get commerce (will fail first time)
curl http://localhost:3000/api/commerces/by-wallet/0xYourWalletAddress

# Expected: 404 Not Found

# Step 2: Register commerce
curl -X POST http://localhost:3000/api/commerces \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xYourWalletAddress",
    "name": "Test Business",
    "description_spanish": "Negocio de prueba",
    "description_english": "Test business",
    "email": "test@example.com"
  }'

# Expected: 201 Created with commerce_id

# Step 3: Get commerce again (should work now)
curl http://localhost:3000/api/commerces/by-wallet/0xYourWalletAddress

# Expected: 200 OK with commerce data
```

### 3. Test Payout Creation

```bash
curl -X POST http://localhost:3000/api/payouts \
  -H "Content-Type: application/json" \
  -d '{
    "commerce_id": "your-commerce-id-from-step-2",
    "from_address": "0xYourWalletAddress",
    "from_chain": 44787,
    "from_chain_name": "alfajores",
    "from_token_symbol": "cCOP",
    "from_token_address": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    "from_token_decimals": 18,
    "fromAmount": 100000,
    "fromCurrency": "COP",
    "to_chain": 42220,
    "to_chain_name": "celo",
    "to_address": "0x1234567890123456789012345678901234567890",
    "to_token_symbol": "cUSD",
    "to_token_address": "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    "to_token_decimals": 18,
    "to_amount": 25.5,
    "toCurrency": "USD",
    "to_name": "John Doe",
    "to_email": "john@example.com",
    "provider": "squid"
  }'

# Expected: 201 Created with payout data including id and created_at
```

---

## 🔒 CORS Configuration

The backend has CORS enabled for all origins in development:

```typescript
// Backend CORS config (already configured)
{
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}
```

No additional headers required from frontend.

---

## 📋 Field Requirements for Registration

The frontend must collect these fields from the user during registration:

### Fields to Request from User:

- ✅ `name` - Business name
- ✅ `description_spanish` - Spanish description
- ✅ `description_english` - English description
- ✅ `email` - Email for notifications (optional but recommended)

### Fields Provided by Frontend:

The frontend should send these fields with default or pre-configured values:

- `wallet` - From Privy/wallet provider
- `icon_url` - User's uploaded logo or null
- `currency` - Default "COP" or let user select
- `minAmount` - Default null or set limit
- `maxAmount` - Default null or set limit
- `currencySymbol` - Default "$" or based on currency
- `confirmation_url` - Webhook URL if applicable, or null

### Backend Defaults:

- `spread` - Automatically set to 0 (0%)
- All null values are acceptable for optional fields

---

## 📝 Notes

### Wallet Address Format

- Must be a valid Ethereum address format: `0x` followed by 40 hexadecimal characters
- Case insensitive (backend normalizes to lowercase)
- Example: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

### Commerce ID

- UUID v4 format
- Generated automatically by backend
- Must be stored in frontend after registration
- Required for all payout operations

### Chain IDs

Common chain IDs used in the system:

- `44787` - Celo Alfajores (testnet)
- `42220` - Celo Mainnet

### Provider Field

Supported bridge providers:

- `"squid"` - Squid Router
- `"lifi"` - LI.FI
- Others as configured

---

## 🔗 Related Documentation

- [Complete Architecture](./ARCHITECTURE.md) - Full system documentation
- [API Endpoints](./ARCHITECTURE.md#api-endpoints) - All available endpoints
- [Database Schema](../db/schema.sql) - Database structure

---

## 🐛 Troubleshooting

### Backend Not Accessible

```bash
# Check if backend is running
curl http://localhost:3000/health

# If no response, start backend:
cd deramp-backend
npm run dev
```

### CORS Errors

CORS is already configured. If you still get CORS errors:

1. Verify backend is running on correct port
2. Check you're using the correct URL
3. Verify request headers are correct

### 404 Errors

- Verify the endpoint URL is correct (check for typos)
- Ensure you're using `/api` prefix for all API calls
- Verify the resource exists (e.g., commerce_id is valid)

### 409 Conflict (Commerce Already Exists)

This means the wallet is already registered. Use `GET /api/auth/commerce/:wallet` to get the existing commerce_id.

---

## Bridge Routes API

### Get Available Bridge Routes

**Endpoint:** `GET /api/bridge-routes`

**Description:** Retrieves available bridge routes with optional filtering.

**Query Parameters:**

- `from_fiat` (optional) - Filter by source fiat currency (e.g., "USD")
- `to_fiat` (optional) - Filter by destination fiat currency (e.g., "COP")
- `is_active` (optional) - Filter by active status (true/false)

**Example Requests:**

```bash
# Get all bridge routes
GET /api/bridge-routes

# Get routes from USD to any currency
GET /api/bridge-routes?from_fiat=USD

# Get routes from USD to COP
GET /api/bridge-routes?from_fiat=USD&to_fiat=COP

# Get only active routes
GET /api/bridge-routes?is_active=true
```

**Response 200 - Success:**

```json
{
  "success": true,
  "data": [
    {
      "id": "bridge-route-uuid",
      "from_fiat": "USD",
      "to_fiat": "COP",
      "from_chain": 1,
      "from_chain_name": "Ethereum",
      "from_token_symbol": "USDC",
      "from_token_address": "0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C",
      "from_token_decimals": 6,
      "to_chain": 137,
      "to_chain_name": "Polygon",
      "to_token_symbol": "USDC",
      "to_token_address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      "to_token_decimals": 6,
      "provider": "LayerZero",
      "is_active": true,
      "created_at": "2025-10-21T12:00:00.000Z",
      "updated_at": "2025-10-21T12:00:00.000Z"
    }
  ]
}
```

### Get Specific Bridge Route

**Endpoint:** `GET /api/bridge-routes/route`

**Description:** Gets a specific bridge route by fiat currency pair.

**Query Parameters:**

- `from_fiat` (required) - Source fiat currency
- `to_fiat` (required) - Destination fiat currency

**Example Request:**

```bash
GET /api/bridge-routes/route?from_fiat=USD&to_fiat=COP
```

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "id": "bridge-route-uuid",
    "from_fiat": "USD",
    "to_fiat": "COP",
    "from_chain": 1,
    "from_chain_name": "Ethereum",
    "from_token_symbol": "USDC",
    "from_token_address": "0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C",
    "from_token_decimals": 6,
    "to_chain": 137,
    "to_chain_name": "Polygon",
    "to_token_symbol": "USDC",
    "to_token_address": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "to_token_decimals": 6,
    "provider": "LayerZero",
    "is_active": true,
    "created_at": "2025-10-21T12:00:00.000Z",
    "updated_at": "2025-10-21T12:00:00.000Z"
  }
}
```

**Response 404 - Route Not Found:**

```json
{
  "error": "No active bridge route found for USD → COP"
}
```

---

**Last Updated**: October 21, 2025  
**API Version**: v1  
**Backend Version**: 1.0.0
