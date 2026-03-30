# Instant Payouts - Smart Contracts

Smart contracts for the Voulti Instant Payouts platform, built with Foundry.

## Overview

This repository contains the smart contracts that power cross-chain payout functionality. The main contract is `PayoutVault`, a **generic ERC20 vault** that receives and stores tokens from Squid Router's cross-chain swaps.

## Contracts

### PayoutVault

A **generic, reusable vault contract** that works with any ERC20 token. Deploy one instance per token you want to manage (e.g., cCOP on Celo, cREAL on Celo, mxnB on Arbitrum, BRL1 on Polygon).

**Key Features:**

- ✅ **Token Agnostic**: Works with any ERC20
- ✅ **Multi-Chain Ready**: Deploy on any EVM chain
- ✅ Secure deposits from Squid Router post-hooks
- ✅ Balance tracking per commerce
- ✅ Owner-only withdrawals
- ✅ Event logging for transparency
- ✅ Gas optimized with immutable variables

**Example Deployments:**

- cCOP on Celo: TBD
- cREAL on Celo: TBD
- mxnB on Arbitrum: TBD
- BRL1 on Polygon: TBD

## Project Structure

```
contracts/
├── src/
│   ├── PayoutVault.sol      # Main vault contract
│   └── Counter.sol           # Example contract (can be removed)
├── test/
│   ├── PayoutVault.t.sol    # Vault tests (8 tests, all passing)
│   └── Counter.t.sol         # Example tests
├── script/
│   ├── PayoutVault.s.sol    # Deployment scripts
│   └── Counter.s.sol         # Example script
└── lib/                      # Dependencies (forge-std)
```

## Development Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Git for version control

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd instant-payouts/contracts

# Install dependencies
forge install

# Build contracts
forge build
```

## Quick Links

- 📖 **[Deployment Guide](./DEPLOYMENT.md)** - Complete deployment workflow
- 🔄 **[Frontend Integration](../frontend/blockchain/README.md)** - How to use ABIs and vault addresses in frontend
- 📋 **[ABI Export Script](./scripts/copy-abis.sh)** - Auto-copy ABIs to frontend

## Testing

Run the complete test suite:

```bash
# Run all tests
forge test

# Run specific contract tests
forge test --match-contract PayoutVaultTest

# Run with verbose output
forge test -vv

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

**Current Test Results:**

- PayoutVault: 18/18 tests passing ✅
- All security checks included
- Double-claim prevention
- Cross-commerce attack prevention

## Deployment

> 📖 **For complete deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

### Setup Environment

Create a `.env` file in the contracts directory:

```bash
PRIVATE_KEY=your_deployer_private_key
VAULT_OWNER=0xYourCommerceWalletAddress
TOKEN_ADDRESS=0xTokenYouWantToVault
```

### Deploy to Any Network

**The vault is generic - you deploy one instance per token you want to manage.**

#### Deploy for cCOP on Celo

```bash
TOKEN_ADDRESS=0x8A567e2aE79CA692Bd748aB832081C45de4041eA \
forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
  --rpc-url https://forno.celo.org \
  --broadcast \
  --verify
```

#### Deploy for cREAL on Celo

```bash
TOKEN_ADDRESS=0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787 \
forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
  --rpc-url https://forno.celo.org \
  --broadcast \
  --verify
```

#### Deploy for mxnB on Arbitrum

```bash
TOKEN_ADDRESS=0xYourMxnBTokenAddress \
forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
  --rpc-url https://arb1.arbitrum.io/rpc \
  --broadcast \
  --verify
```

#### Local Testing (with Mock Token)

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy
forge script script/PayoutVault.s.sol:PayoutVaultDeploymentWithMockToken \
  --rpc-url http://localhost:8545 \
  --broadcast
```

## Integration with Squid

The `PayoutVault` is designed to work with Squid Router's post-hook feature. After a cross-chain swap completes, Squid automatically calls the vault's `deposit()` function.

### Post-Hook Configuration Example

```javascript
const postHook = {
  chainType: "evm",
  calls: [
    {
      callType: 1, // FULL_TOKEN_BALANCE
      target: VAULT_ADDRESS, // Your deployed PayoutVault
      value: "0",
      callData: vaultInterface.encodeFunctionData("deposit", [
        COMMERCE_ADDRESS,
        "0", // Replaced with actual balance
        PAYOUT_ID,
      ]),
      payload: {
        tokenAddress: CCOP_TOKEN_ADDRESS,
        inputPos: "1",
      },
      estimatedGas: "100000",
      chainType: "evm",
    },
  ],
  provider: "Voulti",
  description: "Deposit to PayoutVault",
};
```

## Contract Details

### PayoutVault Functions

#### Write Functions

**`deposit(address commerce, uint256 amount, string calldata payoutId)`**

- Deposits cCOP tokens into the vault
- Called by Squid Router via post-hook
- Emits `Deposit(commerce, amount, payoutId)` event

**`withdraw(address to, uint256 amount)`**

- Withdraws cCOP tokens from vault
- Only callable by vault owner
- Emits `Withdrawal(owner, to, amount)` event

#### View Functions

- `getBalance(address commerce)`: Get commerce balance
- `getTotalBalance()`: Get total vault balance
- `commerceBalances(address)`: Public balance mapping
- `totalDeposits()`: Total deposited amount
- `owner()`: Vault owner address
- `token()`: ERC20 token address this vault manages

### Gas Estimates

- `deposit()`: ~107,000 gas
- `withdraw()`: ~121,000 gas
- View functions: ~2,000 gas

## Network Information

### Celo Mainnet

- Chain ID: 42220
- RPC: `https://forno.celo.org`
- Explorer: `https://explorer.celo.org`
- Tokens:
  - cCOP: `0x8A567e2aE79CA692Bd748aB832081C45de4041eA`
  - cREAL: `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787`

### Celo Alfajores Testnet

- Chain ID: 44787
- RPC: `https://alfajores-forno.celo-testnet.org`
- Explorer: `https://alfajores.celoscan.io`
- Faucet: `https://faucet.celo.org`

### Arbitrum One

- Chain ID: 42161
- RPC: `https://arb1.arbitrum.io/rpc`
- Explorer: `https://arbiscan.io`

### Polygon

- Chain ID: 137
- RPC: `https://polygon-rpc.com`
- Explorer: `https://polygonscan.com`

## Security

- ✅ Owner-only withdrawals
- ✅ Immutable token address
- ✅ Zero amount checks
- ✅ Transfer validation
- ✅ Event logging for transparency
- ⚠️ Single owner (consider multi-sig for production)

## Foundry Documentation

**Foundry** is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools)
- **Cast**: Swiss army knife for interacting with EVM smart contracts
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network
- **Chisel**: Fast, utilitarian, and verbose solidity REPL

📖 [Foundry Book](https://book.getfoundry.sh/)

### Useful Commands

```bash
# Build
forge build

# Test
forge test

# Format code
forge fmt

# Gas snapshots
forge snapshot

# Start local node
anvil

# Deploy
forge script script/PayoutVault.s.sol:PayoutVaultDeployment \
  --rpc-url <your_rpc_url> \
  --broadcast

# Interact with contracts
cast <subcommand>

# Help
forge --help
anvil --help
cast --help
```

## Future Enhancements

- [ ] Multi-sig support for withdrawals
- [ ] Batch withdrawals
- [ ] Emergency pause mechanism
- [ ] Fee collection
- [ ] Yield generation (DeFi integration)

## Support

For issues or questions:

1. Check test cases in `test/PayoutVault.t.sol`
2. Review deployment script in `script/PayoutVault.s.sol`
3. See main project README for architecture details

## License

MIT License
