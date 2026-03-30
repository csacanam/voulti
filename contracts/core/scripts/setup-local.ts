/**
 * Local Development Setup Script
 *
 * Prerequisites:
 *   1. Hardhat node running: cd contracts/core && npx hardhat node
 *   2. pnpm install done at root
 *
 * Usage:
 *   cd contracts/core && npx hardhat run scripts/setup-local.ts --network hardhat
 *
 * This script:
 *   1. Deploys all DerampProxy contracts
 *   2. Deploys MockERC20 tokens (USDC, USDT)
 *   3. Whitelists tokens globally and for a test commerce
 *   4. Mints test tokens to Hardhat account #1 (the "customer")
 *   5. Generates .env files for apps/api and apps/checkout
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Hardhat default accounts (from mnemonic "test test test test test test test test test test test junk")
// Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (deployer/admin/backend)
// Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (customer)
// Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (commerce)

async function main() {
  const [deployer, customer, commerce] = await ethers.getSigners();

  console.log("=== Voulti Local Setup ===\n");
  console.log(`Deployer/Admin: ${deployer.address}`);
  console.log(`Customer:       ${customer.address}`);
  console.log(`Commerce:       ${commerce.address}\n`);

  // 1. Deploy MockERC20 tokens
  console.log("--- Deploying Mock Tokens ---");
  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`USDC: ${usdcAddress}`);

  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log(`USDT: ${usdtAddress}`);

  // 2. Deploy core contracts
  console.log("\n--- Deploying Core Contracts ---");

  const DerampStorage = await ethers.getContractFactory("DerampStorage");
  const storage = await DerampStorage.deploy();
  await storage.waitForDeployment();
  const storageAddress = await storage.getAddress();
  console.log(`Storage: ${storageAddress}`);

  const DerampProxy = await ethers.getContractFactory("DerampProxy");
  const proxy = await DerampProxy.deploy();
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log(`Proxy:   ${proxyAddress}`);

  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = await AccessManager.deploy(storageAddress, proxyAddress);
  await accessManager.waitForDeployment();
  const accessManagerAddress = await accessManager.getAddress();
  console.log(`Access:  ${accessManagerAddress}`);

  const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
  const invoiceManager = await InvoiceManager.deploy(storageAddress, accessManagerAddress, proxyAddress);
  await invoiceManager.waitForDeployment();
  const invoiceManagerAddress = await invoiceManager.getAddress();
  console.log(`Invoice: ${invoiceManagerAddress}`);

  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(storageAddress, accessManagerAddress, proxyAddress);
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log(`Payment: ${paymentProcessorAddress}`);

  const TreasuryManager = await ethers.getContractFactory("TreasuryManager");
  const treasuryManager = await TreasuryManager.deploy(storageAddress, accessManagerAddress, proxyAddress);
  await treasuryManager.waitForDeployment();
  const treasuryManagerAddress = await treasuryManager.getAddress();

  const WithdrawalManager = await ethers.getContractFactory("WithdrawalManager");
  const withdrawalManager = await WithdrawalManager.deploy(storageAddress, accessManagerAddress, proxyAddress);
  await withdrawalManager.waitForDeployment();
  const withdrawalManagerAddress = await withdrawalManager.getAddress();

  // 3. Wire up modules
  console.log("\n--- Configuring Modules ---");
  await proxy.setStorageContract(storageAddress);
  await proxy.setAccessManager(accessManagerAddress);
  await proxy.setInvoiceManager(invoiceManagerAddress);
  await proxy.setPaymentProcessor(paymentProcessorAddress);
  await proxy.setTreasuryManager(treasuryManagerAddress);
  await proxy.setWithdrawalManager(withdrawalManagerAddress);

  await storage.setModule("AccessManager", accessManagerAddress);
  await storage.setModule("InvoiceManager", invoiceManagerAddress);
  await storage.setModule("PaymentProcessor", paymentProcessorAddress);
  await storage.setModule("WithdrawalManager", withdrawalManagerAddress);
  await storage.setModule("TreasuryManager", treasuryManagerAddress);
  console.log("Modules configured");

  // 4. Setup roles (deployer keeps all roles for local dev)
  console.log("\n--- Setting Up Roles ---");
  const ONBOARDING_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ONBOARDING_ROLE"));
  const TOKEN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TOKEN_MANAGER_ROLE"));
  const BACKEND_OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BACKEND_OPERATOR_ROLE"));

  // Deployer already has DEFAULT_ADMIN_ROLE, grant the rest
  await accessManager.grantRole(ONBOARDING_ROLE, deployer.address);
  await accessManager.grantRole(TOKEN_MANAGER_ROLE, deployer.address);
  await accessManager.grantRole(BACKEND_OPERATOR_ROLE, deployer.address);
  console.log("Roles assigned to deployer");

  // 5. Whitelist tokens
  console.log("\n--- Whitelisting Tokens ---");
  await accessManager.addTokenToWhitelist(usdcAddress);
  await accessManager.addTokenToWhitelist(usdtAddress);
  console.log("USDC and USDT whitelisted globally");

  // 6. Setup test commerce
  console.log("\n--- Setting Up Test Commerce ---");
  await accessManager.addCommerceToWhitelist(commerce.address);
  await accessManager.addTokenToCommerceWhitelist(commerce.address, [usdcAddress, usdtAddress]);
  console.log(`Commerce ${commerce.address} whitelisted with USDC + USDT`);

  // 7. Mint test tokens to customer
  console.log("\n--- Minting Test Tokens ---");
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC/USDT
  await usdc.mint(customer.address, mintAmount);
  await usdt.mint(customer.address, mintAmount);
  console.log(`Minted 10,000 USDC + 10,000 USDT to customer ${customer.address}`);

  // Also mint some to deployer for testing
  await usdc.mint(deployer.address, mintAmount);
  await usdt.mint(deployer.address, mintAmount);

  // 8. Add treasury wallet
  await proxy.addTreasuryWallet(deployer.address, "Local Treasury");
  console.log("Treasury wallet configured");

  // 9. Generate .env files
  console.log("\n--- Generating .env Files ---");

  // Hardhat account #0 private key (well-known, for local dev only)
  const deployerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const rootDir = path.resolve(__dirname, "..", "..", "..");

  // Read existing Supabase key if .env already exists
  const apiEnvPath = path.join(rootDir, "apps/api/.env");
  let existingSupabaseKey = "YOUR_SUPABASE_ANON_KEY_HERE";
  let existingResendKey = "re_dummy_local_dev";
  if (fs.existsSync(apiEnvPath)) {
    const existing = fs.readFileSync(apiEnvPath, "utf8");
    const keyMatch = existing.match(/SUPABASE_KEY=(.+)/);
    if (keyMatch && !keyMatch[1].includes("YOUR_")) existingSupabaseKey = keyMatch[1].trim();
    const resendMatch = existing.match(/RESEND_APIKEY=(.+)/);
    if (resendMatch) existingResendKey = resendMatch[1].trim();
  }

  const apiEnv = `# Generated by setup-local.ts — DO NOT COMMIT
PORT=3000
SUPABASE_URL=https://zeawntozmgvpiqpelwdy.supabase.co
SUPABASE_KEY=${existingSupabaseKey}
RESEND_APIKEY=${existingResendKey}

# Hardhat local
BACKEND_PRIVATE_KEY=${deployerKey}
HD_WALLET_MNEMONIC=abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
SWEEP_POLL_INTERVAL_MS=5000
SWEEP_MAX_RETRIES=5

# Hardhat contracts
HARDHAT_PROXY_ADDRESS=${proxyAddress}
HARDHAT_STORAGE_ADDRESS=${storageAddress}
HARDHAT_ACCESS_MANAGER_ADDRESS=${accessManagerAddress}
HARDHAT_INVOICE_MANAGER_ADDRESS=${invoiceManagerAddress}
HARDHAT_PAYMENT_PROCESSOR_ADDRESS=${paymentProcessorAddress}

# Hardhat mock tokens
HARDHAT_USDC_ADDRESS=${usdcAddress}
HARDHAT_USDT_ADDRESS=${usdtAddress}
`;

  const checkoutEnv = `# Generated by setup-local.ts — DO NOT COMMIT
VITE_BACKEND_URL=http://127.0.0.1:3000
VITE_WALLETCONNECT_PROJECT_ID=

# Hardhat contracts
VITE_HARDHAT_PROXY_ADDRESS=${proxyAddress}
VITE_HARDHAT_STORAGE_ADDRESS=${storageAddress}
VITE_HARDHAT_ACCESS_MANAGER_ADDRESS=${accessManagerAddress}
VITE_HARDHAT_INVOICE_MANAGER_ADDRESS=${invoiceManagerAddress}
VITE_HARDHAT_PAYMENT_PROCESSOR_ADDRESS=${paymentProcessorAddress}

# Hardhat mock tokens
VITE_HARDHAT_USDC_ADDRESS=${usdcAddress}
VITE_HARDHAT_USDT_ADDRESS=${usdtAddress}
`;

  fs.writeFileSync(path.join(rootDir, "apps/api/.env"), apiEnv);
  fs.writeFileSync(path.join(rootDir, "apps/checkout/.env"), checkoutEnv);
  console.log("Created apps/api/.env");
  console.log("Created apps/checkout/.env");

  // 10. Summary
  console.log("\n==========================================");
  console.log("        LOCAL SETUP COMPLETE");
  console.log("==========================================");
  console.log(`\nContracts (Hardhat, chain 31337):`);
  console.log(`  Proxy:   ${proxyAddress}`);
  console.log(`  Storage: ${storageAddress}`);
  console.log(`  Access:  ${accessManagerAddress}`);
  console.log(`  Invoice: ${invoiceManagerAddress}`);
  console.log(`  Payment: ${paymentProcessorAddress}`);
  console.log(`\nMock Tokens:`);
  console.log(`  USDC: ${usdcAddress} (6 decimals)`);
  console.log(`  USDT: ${usdtAddress} (6 decimals)`);
  console.log(`\nAccounts:`);
  console.log(`  Deployer/Admin: ${deployer.address}`);
  console.log(`  Customer:       ${customer.address} (10,000 USDC + 10,000 USDT)`);
  console.log(`  Commerce:       ${commerce.address} (whitelisted)`);
  console.log(`\nNext steps:`);
  console.log(`  1. Update apps/api/.env with your Supabase anon key`);
  console.log(`  2. Run SQL migrations in Supabase (deposit_addresses, hd_wallet_counter tables)`);
  console.log(`  3. Seed Supabase: insert a commerce with wallet=${commerce.address}`);
  console.log(`  4. Start API:      pnpm dev:api`);
  console.log(`  5. Start Checkout: pnpm dev:checkout`);
  console.log(`  6. Open checkout, create invoice, and test both payment flows`);
  console.log(`\n  Import customer wallet in MetaMask:`);
  console.log(`  Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`);
  console.log(`  Add Hardhat network: RPC http://127.0.0.1:8545, Chain ID 31337`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
