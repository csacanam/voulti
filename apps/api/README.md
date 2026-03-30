# Deramp Backend

A robust crypto payments gateway backend built with **Fastify**, **TypeScript**, and **Supabase**. Generates payment invoices and validates stablecoin payments on blockchain smart contracts.

## 🚀 Features

- **Multi-Network Support**: Celo Alfajores (testnet) and Mainnet
- **ENS Configuration**: Automatic ENS handling per network
- **Invoice Management**: Create, track, and update payment invoices
- **Blockchain Integration**: Direct smart contract interaction
- **Payment Validation**: Real-time payment status verification
- **Commerce Management**: Multi-commerce support with token whitelisting
- **Database Sync**: Automatic backend-blockchain synchronization
- **Recipient Portal**: Complete payout claiming system with Privy authentication
- **Vault Integration**: Automated deposit detection and email notifications

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Celo wallet with testnet funds (for development)
- **Private RPC URLs** (recommended for production)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/csacanam/deramp-backend.git
cd deramp-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env` file:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-key

# Email Service
RESEND_APIKEY=your_resend_api_key

# Blockchain
PRIVATE_KEY=your_celo_private_key_here

# Private RPC URLs (Optional - falls back to public RPCs if not set)
CELO_RPC_URL=https://your-celo-rpc-provider.com
ARBITRUM_RPC_URL=https://your-arbitrum-rpc-provider.com

# Frontend
FRONTEND_URL=https://voulti.com

# Privy Authentication (Required for recipient portal)
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. RPC Configuration (Recommended)

For production, use private RPC providers to avoid rate limits and improve reliability:

**Celo RPC Providers:**

- [Alchemy](https://www.alchemy.com/) - Free tier available
- [Infura](https://infura.io/) - Free tier available
- [QuickNode](https://www.quicknode.com/) - Free tier available

**Arbitrum RPC Providers:**

- [Alchemy](https://www.alchemy.com/) - Free tier available
- [Infura](https://infura.io/) - Free tier available
- [QuickNode](https://www.quicknode.com/) - Free tier available

**Example configuration:**

```env
CELO_RPC_URL=https://celo-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 5. Database Setup

Run the schema in `db/schema.sql` on your Supabase database.

**Important**: For the recipient portal, ensure the `payouts` table has the `claimed_at` column:

```sql
ALTER TABLE payouts ADD COLUMN claimed_at TIMESTAMP NULL;
```

### 6. Start Development Server

```bash
npm run dev
```

Server runs at: http://localhost:3000

## 📦 Available Scripts

| Command         | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Development mode with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start`     | Run compiled production build    |
| `npm test`      | Run test suite                   |

## 🏗️ Project Structure

```
src/
├── index.ts                    # Fastify app entrypoint
├── routes/
│   ├── invoices.ts            # Invoice CRUD operations
│   ├── commerces.ts           # Commerce management
│   ├── payouts.ts             # Payout management
│   └── blockchain.ts          # Blockchain interactions
└── blockchain/
    ├── config/
    │   ├── networks.ts        # Network configurations
    │   ├── contracts.ts       # Contract addresses
    │   └── tokens.js          # Token configurations
    ├── services/
    │   ├── DerampServices.ts  # Base blockchain service
    │   └── InvoiceServices.ts # Invoice-specific operations
    ├── utils/
    │   ├── web3.ts           # Web3 provider configuration
    │   └── errors.ts         # Error handling
    └── abi/                  # Smart contract ABIs
```

## 🔌 API Endpoints

### Invoice Management

- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id/status` - Update invoice status
- `PUT /api/invoices/:id/payment-data` - Update payment data

### Blockchain Operations

- `POST /api/blockchain/create` - Create invoice on blockchain
- `GET /api/blockchain/status/:id` - Check blockchain status
- `POST /api/blockchain/cancel/:id` - Cancel invoice on blockchain

### Commerce Management

- `GET /api/commerces/:id` - Get commerce details
- `GET /api/invoices/admin/commerce-tokens/:id` - Check token consistency

### Payout Management

- `POST /api/payouts` - Create new payout

## 🔧 Key Features

### ENS Configuration

The backend automatically handles ENS (Ethereum Name Service) configuration per network:

```javascript
// Frontend request
{
  "network": "alfajores",
  "supportsENS": false,  // Required for Celo networks
  "paymentOptions": [...]
}
```

### Payment Data Synchronization

Automatic synchronization between backend database and blockchain:

```javascript
// Update payment data when payment detected
PUT /api/invoices/:id/payment-data
{
  "paid_token": "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
  "paid_network": "alfajores",
  "paid_tx_hash": "0x...",
  "wallet_address": "0x...",
  "paid_amount": 102.806000963941002624
}
```

## 🎯 Recipient Portal

The backend includes a complete recipient portal for payout claiming:

### Features

- **Public Payout Viewing**: Anyone can view payout details with a link
- **Privy Authentication**: Secure wallet binding via Privy tokens
- **Automatic Wallet Binding**: Binds wallet to all pending payouts on login
- **Secure Claiming**: Only bound wallets can claim funds

### API Endpoints

- `GET /api/payouts/:id/public` - View payout details (no auth)
- `POST /api/recipients/initialize` - Bind wallet to payouts (auth required)
- `POST /api/payouts/:id/claim` - Claim payout (no auth, security via binding)

### Documentation

See `docs/RECIPIENT_PORTAL_API.md` for complete API documentation.

## 🧪 Testing

### Quick Test

```bash
# Test invoice creation
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "commerce_id": "your-commerce-id",
    "amount_fiat": 100,
    "fiat_currency": "COP"
  }'

# Test blockchain status
curl "http://localhost:3000/api/blockchain/status/invoice-id?network=alfajores&supportsENS=false"

# Test recipient portal
curl http://localhost:3000/api/payouts/payout-id/public
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=8080  # Use port 8080 for production
```

## 📚 Documentation

### For Frontend Developers 🎨

- **[Frontend Integration Guide](./docs/FRONTEND_INTEGRATION.md)** - **START HERE** for API integration

### Core Documentation 📖

- **[Documentation Index](./docs/DOCUMENTATION_INDEX.md)** - Complete navigation hub
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Quick reference guide
- **[Architecture](./docs/ARCHITECTURE.md)** - Complete system architecture
- **[Visual Overview](./docs/VISUAL_OVERVIEW.md)** - Diagrams and flowcharts
- **[Network Configuration](./docs/NETWORK_CONFIGURATION_ANALYSIS.md)** - Network setup analysis

### Specific Guides 🔧

- [Blockchain Integration Guide](./src/blockchain/BLOCKCHAIN_INTEGRATION.md)
- [Database Schema](./db/schema.sql)
- [Database Documentation](./db/README.md)
- [Business Services](./src/business/README.md)
- [TODO List](./TODO.md) - Upcoming features and improvements

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Status**: Production Ready
