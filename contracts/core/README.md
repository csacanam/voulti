# Deramp - Modular Smart Contract System

A comprehensive, modular smart contract system for payment processing, invoice management, and treasury operations built on Ethereum and compatible networks.

## 🏗️ Architecture

Deramp uses a modular proxy-based architecture that separates concerns and enables easy upgrades:

### Core Components

- **DerampProxy**: Main entry point that delegates calls to specialized modules
- **DerampStorage**: Centralized storage contract for all system data
- **AccessManager**: Role-based access control and whitelist management
- **InvoiceManager**: Invoice lifecycle management
- **PaymentProcessor**: Payment processing and refunds
- **WithdrawalManager**: Balance withdrawals and analytics
- **TreasuryManager**: Treasury operations and fee distribution

### Key Features

- ✅ **Modular Design**: Easy to upgrade individual components
- ✅ **Role-Based Access Control**: Granular permissions for different operations
- ✅ **Multi-Token Support**: Support for any ERC20 token
- ✅ **Comprehensive Testing**: 198+ tests covering all scenarios
- ✅ **Multi-Network Support**: Deploy on Celo, Base, Polygon, BSC, and more

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Git
- A wallet with funds for deployment

### Installation

```bash
git clone <repository-url>
cd deramp-contracts
npm install
```

### Environment Setup

1. Copy the environment template:

```bash
cp env.example .env
```

2. Configure your environment variables:

```env
# Required
PRIVATE_KEY=your_private_key_here
ADMIN_WALLET=your_admin_wallet_address_here

# Optional
BACKEND_WALLET=your_backend_wallet_address_here
```

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific test categories
npx hardhat test test/2.unit/
npx hardhat test test/3.integration/
npx hardhat test test/4.e2e/
```

### Deployment

```bash
# Deploy to local hardhat network (for testing)
npx hardhat run scripts/deploy.ts --network hardhat

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network celoTestnet

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network celo
```

## 📋 Test Coverage

The system includes comprehensive test coverage:

- **Unit Tests**: Individual module functionality
- **Integration Tests**: Module interactions
- **End-to-End Tests**: Complete user workflows
- **Edge Cases**: Error handling and security scenarios

## 🔐 Security Features

### Role-Based Access Control

- **DEFAULT_ADMIN_ROLE**: Full system control
- **ONBOARDING_ROLE**: Commerce and token whitelist management
- **TOKEN_MANAGER_ROLE**: Token whitelist operations
- **TREASURY_MANAGER_ROLE**: Treasury wallet management
- **BACKEND_OPERATOR_ROLE**: Backend operations

### Security Measures

- Proxy pattern for upgradeability
- Centralized storage with access control
- Comprehensive input validation
- Emergency pause functionality
- Role-based permissions

## 📁 Project Structure

```
deramp-contracts/
├── contracts/           # Smart contracts
│   ├── DerampProxy.sol  # Main entry point
│   ├── storage/         # Data storage
│   ├── modules/         # Business logic modules
│   └── interfaces/      # Contract interfaces
├── scripts/             # Deployment scripts
│   ├── deploy.ts        # Main deployment script
│   ├── config.ts        # Configuration
│   └── README.md        # Deployment guide
├── test/                # Test files
│   ├── 1.setup/         # Test setup
│   ├── 2.unit/          # Unit tests
│   ├── 3.integration/   # Integration tests
│   └── 4.e2e/           # End-to-end tests
├── deployed-addresses/  # Deployed contract addresses
└── docs/                # Documentation
```

## 📚 Documentation

### Core Documentation

- **`docs/ARCHITECTURE.md`**: Detailed architecture documentation
- **`docs/DEPLOYMENT_GUIDE.md`**: Complete deployment guide
- **`scripts/README.md`**: Deployment and configuration guide
- **`docs/ENVIRONMENT_VARIABLES.md`**: Environment variables reference

### Contract Documentation

- **Inline Comments**: All contracts include detailed comments
- **Interface Definitions**: Clear function signatures and parameters
- **Event Logging**: Comprehensive event system for monitoring

## 🌐 Supported Networks

### Mainnets

- **Celo**: `--network celo`
- **Base**: `--network base`
- **Polygon**: `--network polygon`
- **BSC**: `--network bsc`

### Testnets

- **Celo Alfajores**: `--network celoTestnet`
- **Base Goerli**: `--network baseTestnet`
- **Polygon Mumbai**: `--network polygonTestnet`
- **BSC Testnet**: `--network bscTestnet`

## 🔧 Development

### Adding New Networks

1. Add network configuration to `hardhat.config.ts`
2. Update RPC URLs in environment variables
3. Test deployment on the new network

### Adding New Modules

1. Create the module contract in `contracts/modules/`
2. Create the interface in `contracts/interfaces/`
3. Update the proxy to include the new module
4. Add comprehensive tests
5. Update deployment script

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Deramp** - Building the future of decentralized payment processing 🚀

## Production Deployed Addresses

See [deployed-addresses/PRODUCTION.md](deployed-addresses/PRODUCTION.md) for all contract addresses across 5 networks.

**Operator Wallet:** `0x21581Cb82D9a66126fBe7639f4AF55DdfEA48E26`

| Network | Proxy | Tokens |
|---------|-------|--------|
| Celo | `0xcdbBc0DB...` | USDC, USDT, COPm |
| Arbitrum | `0xf8553C9D...` | USDC, USD₮0 |
| Polygon | `0xc7F43131...` | USDC, USDT0 |
| Base | `0x7D8a7f89...` | USDC |
| BSC | `0xDf90971E...` | USDC, USDT |
