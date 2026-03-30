# DeRamp - Crypto Payment Checkout

A modern web application for processing payments with stable cryptocurrencies (stablecoins) on the Celo blockchain. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Complete crypto payment flow** with wallet connection and smart contract integration
- **Multi-state payment button** (initial, loading, ready, approving, confirm, processing)
- **Celo blockchain integration** with DerampProxy smart contract
- **Token approval and payment execution** using ethers.js
- **Support for multiple tokens** (cCOP, CUSD, CEUR, USDC on Celo Alfajores)
- **Real-time balance checking** and insufficient balance validation
- **Backend integration** for invoice creation, status checking, and payment updates
- **User-friendly error messages** in English and Spanish
- **Responsive design** with dark theme
- **Order status tracking** (pending, paid, expired)
- **Order ID display** when payment is completed

## 🛠️ Technologies

- **React 18** with TypeScript
- **Vite** as bundler and dev server
- **Tailwind CSS** for styling
- **React Router DOM** for navigation
- **Wagmi** for wallet connection
- **Ethers.js v6** for blockchain interaction
- **Lucide React** for icons
- **ESLint** for linting

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd deramp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   # Create .env file
   VITE_BACKEND_URL=http://127.0.0.1:3000
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5175
   ```

## 🎯 Usage

### Payment Flow

1. **Access checkout URL** with invoice ID: `/checkout/{invoice-id}`
2. **Connect wallet** (MetaMask, WalletConnect, etc.)
3. **Select token and network** (currently Celo Alfajores)
4. **Click "Pay Now"** to create invoice on blockchain
5. **Click "Authorize {TOKEN}"** to approve token spending
6. **Click "Confirm Payment"** to execute payment
7. **View Order ID** when payment is completed

### Available Test URLs

- **Commerce page**: `/commerce/{commerce-id}`
- **Checkout page**: `/checkout/{invoice-id}`

## 🏗️ Project Structure

```
src/
├── blockchain/              # Blockchain configuration
│   ├── abi/                    # Smart contract ABIs
│   │   └── DerampProxy.json    # Main contract ABI
│   ├── config/                 # Blockchain configuration
│   │   ├── chains.ts           # Chain configuration
│   │   ├── contracts.ts        # Contract addresses
│   │   ├── networks.ts         # Network settings
│   │   └── tokens.ts           # Token configuration
│   └── types.ts                # Blockchain types
├── components/              # React components
│   ├── CheckoutPage.tsx        # Main checkout page
│   ├── PaymentButton.tsx       # Payment button component
│   ├── TokenDropdown.tsx       # Token selector
│   ├── NetworkDropdown.tsx     # Network selector
│   ├── StatusBadge.tsx         # Status badge
│   ├── LoadingSpinner.tsx      # Loading spinner
│   └── ErrorMessage.tsx        # Error message
├── hooks/                   # Custom hooks
│   ├── usePaymentButton.ts     # Payment button logic
│   ├── useInvoice.ts           # Invoice loading
│   ├── useCommerce.ts          # Commerce loading
│   ├── useTokenBalance.ts      # Token balance checking
│   └── useCopyToClipboard.ts   # Copy to clipboard
├── services/                # API services
│   ├── blockchainService.ts    # Blockchain API calls
│   ├── invoiceService.ts       # Invoice API calls
│   └── commerceService.ts      # Commerce API calls
├── types/                   # Type definitions
│   ├── invoice.ts              # Invoice types
│   └── global.d.ts             # Global types
├── utils/                   # Utilities
│   ├── i18n.ts                 # Internationalization
│   └── tokenUtils.ts           # Token utilities
├── locales/                 # Translations
│   ├── en.ts                   # English translations
│   └── es.ts                   # Spanish translations
├── config/                  # App configuration
│   ├── chains.ts               # Chain configuration
│   └── wagmi.ts                # Wagmi configuration
├── App.tsx                  # Main component
└── main.tsx                 # Entry point
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend URL (required)
VITE_BACKEND_URL=http://127.0.0.1:3000

# WalletConnect Project ID (optional, has fallback)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Blockchain Configuration

The app is currently configured for **Celo Alfajores testnet**:

- **Network**: Celo Alfajores (Chain ID: 44787)
- **Main Contract**: DerampProxy at `0xc44cDAdf371DFCa94e325d1B35e27968921Ef668`
- **Supported Tokens**: cCOP, CUSD, CEUR, USDC

### Backend Endpoints

The app expects these backend endpoints:

- `GET /api/blockchain/status/:invoiceId?network=:network`
- `POST /api/blockchain/create`
- `PUT /api/invoices/:id/payment-data`
- `POST /api/invoices/:id/status`
- `GET /api/invoices/:id`
- `GET /api/commerces/:id`

## 🧪 Testing

### Development Testing

1. **Start backend server** on port 3000
2. **Connect MetaMask** to Celo Alfajores
3. **Get test tokens** from [Celo Faucet](https://faucet.celo.org/)
4. **Test payment flow** with real transactions

### Available Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Build for production

# Linting
npm run lint         # Run ESLint

# Preview
npm run preview      # Preview production build
```

## 🚀 Deployment

1. **Build for production**

   ```bash
   npm run build
   ```

2. **Static files are generated in** `dist/`

3. **Deploy** to your preferred platform (Netlify, Vercel, etc.)

4. **Configure environment variables** in production:
   ```bash
   VITE_BACKEND_URL=https://your-backend.com
   ```

## 🔒 Security

- **Wallet connection** handled by Wagmi
- **Smart contract calls** use ethers.js with proper error handling
- **Backend communication** uses HTTPS in production
- **No sensitive data** stored in frontend

## 🚨 Error Handling

The app handles various error scenarios:

- **Wallet not connected**: Shows connection prompt
- **Wrong network**: Requests network switch
- **Insufficient balance**: Shows balance error
- **Transaction failures**: Shows user-friendly error messages
- **Backend errors**: Graceful fallback with retry options

## 📚 Documentation

- [Payment Flow Documentation](./PAYMENT_FLOW_README.md) - Detailed payment flow implementation
- [Blockchain Configuration](./src/blockchain/config/) - Smart contract and network setup
- [API Documentation](./src/services/) - Backend integration details
- [TODO List](./TODO.md) - Pending features and improvements

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-functionality`)
3. Commit your changes (`git commit -m 'Add new functionality'`)
4. Push to the branch (`git push origin feature/new-functionality`)
5. Open a Pull Request

## 📄 License

This project is under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check [existing issues](../../issues)
2. Create a [new issue](../../issues/new) with:
   - Error description
   - Steps to reproduce
   - Browser and wallet information
   - Network and transaction details

---

**DeRamp** - Making crypto payments simple and accessible 🚀
