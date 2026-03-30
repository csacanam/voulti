# Blockchain Integration Guide - Deramp Backend

## Overview

This guide documents the blockchain integration for the Deramp backend, which handles invoice creation, payment validation, and smart contract interactions on Celo networks.

## Current Implementation

### Supported Networks

- **Celo Alfajores** (Testnet) - Primary development network
- **Celo Mainnet** - Production network (ready for deployment)

### Key Features

- ✅ ENS (Ethereum Name Service) configuration per network
- ✅ Multi-token payment support
- ✅ Invoice lifecycle management
- ✅ Payment data synchronization
- ✅ Commerce token whitelisting
- ✅ Error handling and validation

## Architecture

### Service Layer

```
DerampService (Base)
├── InvoiceService (Invoice operations)
├── Provider configuration with ENS support
└── Wallet management
```

### Smart Contracts

- **DerampProxy**: Main proxy contract for all operations
- **InvoiceManager**: Invoice lifecycle management
- **AccessManager**: Token whitelisting and commerce permissions

## Configuration

### Environment Variables

```env
# Required for blockchain operations
PRIVATE_KEY=your_celo_private_key_here

# Optional: Override RPC URLs
CELO_ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC_URL=https://forno.celo.org
```

### Network Configuration

```typescript
// src/blockchain/config/networks.ts
export const NETWORKS = {
  alfajores: {
    name: "Celo Alfajores",
    chainId: 44787,
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    blockExplorer: "https://alfajores.celoscan.io",
  },
  mainnet: {
    name: "Celo",
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
  },
};
```

## ENS Configuration

### Problem Solved

Celo networks don't support ENS, causing errors when ethers.js tries to resolve ENS names.

### Solution

The backend accepts a `supportsENS` parameter to configure the provider correctly:

```typescript
// Frontend must send supportsENS: false for Celo networks
{
  "network": "alfajores",
  "supportsENS": false,  // Disables ENS for Celo
  "paymentOptions": [...]
}
```

### Implementation

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

  // If supportsENS is explicitly false, disable ENS
  if (supportsENS === false) {
    providerConfig.ensAddress = undefined;
  }

  return new ethers.JsonRpcProvider(networkConfig.rpcUrl, providerConfig);
}
```

## API Endpoints

### Create Invoice on Blockchain

```http
POST /api/blockchain/create
Content-Type: application/json

{
  "invoiceId": "uuid-string",
  "network": "alfajores",
  "supportsENS": false,
  "paymentOptions": [
    {
      "token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
      "amount": "102.806000963941002624"
    }
  ],
  "expiresAt": 1753061860
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "invoiceId": "uuid-string",
    "blockNumber": 52107064,
    "blockchainInvoiceId": "0xbd3e6ef3cba6aa36061a138986295c08de020f335ed7230f4523b487b59d1565",
    "commerce": "0x853DC6EBb05d896c8D6DbF73EE687f8bA3163eF0",
    "expiresAt": 1753061860,
    "paymentOptions": [...]
  }
}
```

### Check Invoice Status

```http
GET /api/blockchain/status/{invoiceId}?network=alfajores&supportsENS=false
```

**Response:**

```json
{
  "success": true,
  "data": {
    "invoiceId": "uuid-string",
    "exists": true,
    "status": "paid",
    "commerce": "0x853DC6EBb05d896c8D6DbF73EE687f8bA3163eF0",
    "expiresAt": 1753061860,
    "paymentOptions": [...],
    "paidAmount": "102.806000963941002624",
    "paidToken": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    "paidAt": 1753060787
  }
}
```

### Cancel Invoice

```http
POST /api/blockchain/cancel/{invoiceId}
Content-Type: application/json

{
  "network": "alfajores",
  "supportsENS": false
}
```

## Payment Data Synchronization

### Update Payment Data

When a payment is detected on the blockchain, update the backend:

```http
PUT /api/invoices/{invoiceId}/payment-data
Content-Type: application/json

{
  "paid_token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
  "paid_network": "alfajores",
  "paid_tx_hash": "0x35cc5d36f5d550ad4dc78b28791bb1adfc048d94d00be39bfe65c865f7097386",
  "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "paid_amount": 102.806000963941002624
}
```

## Token Management

### Supported Tokens (Celo Alfajores)

- **cCOP**: `0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4`
- **cUSD**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- **cEUR**: `0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F`
- **USDC**: `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`

### Token Whitelisting

Tokens must be whitelisted for each commerce in the AccessManager contract:

```typescript
// Check if token is whitelisted
const isWhitelisted = await invoiceService.isTokenWhitelistedForCommerce(
  commerceAddress,
  tokenAddress
);
```

## Error Handling

### Common Errors

#### ENS Error (Fixed)

```
"network does not support ENS (operation=\"getEnsAddress\", info={ \"network\": { \"chainId\": \"44787\", \"name\": \"Celo Alfajores\" } }, code=UNSUPPORTED_OPERATION, version=6.15.0)"
```

**Solution**: Always send `supportsENS: false` for Celo networks.

#### Token Not Whitelisted

```
"Token 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B (USDC) is not whitelisted for commerce 0x853DC6EBb05d896c8D6DbF73EE687f8bA3163eF0"
```

**Solution**: Whitelist the token in the AccessManager contract or use a different token.

#### Invoice Already Exists

```
"Invoice already exists in blockchain"
```

**Solution**: Check if invoice exists before creating, or use a different invoice ID.

## Development Workflow

### 1. Setup Environment

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### 2. Test Invoice Creation

```bash
# Create invoice in backend
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "commerce_id": "your-commerce-id",
    "amount_fiat": 100,
    "fiat_currency": "COP"
  }'

# Create invoice on blockchain
curl -X POST http://localhost:3000/api/blockchain/create \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "invoice-uuid",
    "network": "alfajores",
    "supportsENS": false,
    "paymentOptions": [
      {
        "token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
        "amount": "102.806000963941002624"
      }
    ],
    "expiresAt": 1753061860
  }'
```

### 3. Monitor Payment Status

```bash
# Check blockchain status
curl "http://localhost:3000/api/blockchain/status/invoice-uuid?network=alfajores&supportsENS=false"

# Update payment data when payment detected
curl -X PUT http://localhost:3000/api/invoices/invoice-uuid/payment-data \
  -H "Content-Type: application/json" \
  -d '{
    "paid_token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
    "paid_network": "alfajores",
    "paid_tx_hash": "0x...",
    "wallet_address": "0x...",
    "paid_amount": 102.806000963941002624
  }'
```

## Production Deployment

### Environment Variables

```env
NODE_ENV=production
PORT=8080
PRIVATE_KEY=your_production_private_key
SUPABASE_URL=your_production_supabase_url
SUPABASE_KEY=your_production_supabase_key
```

### Build and Deploy

```bash
npm run build
npm start
```

## Troubleshooting

### ENS Errors Still Occurring

1. Verify `supportsENS: false` is sent in all requests
2. Check that the provider is configured correctly
3. Ensure all contract calls use the wallet, not the provider directly

### Payment Not Detected

1. Verify the transaction hash is correct
2. Check that the payment amount matches exactly
3. Ensure the token address is correct
4. Verify the invoice exists on blockchain

### Token Whitelisting Issues

1. Check if token is whitelisted for the commerce
2. Verify the commerce address is correct
3. Use the admin endpoint to check token consistency

## Future Enhancements

- [ ] Support for additional networks (Ethereum, Polygon)
- [ ] Webhook notifications for payment events
- [ ] Batch operations for multiple invoices
- [ ] Advanced payment analytics
- [ ] Multi-signature support

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Status**: Production Ready
