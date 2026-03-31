/**
 * Setup script for already-deployed contracts.
 * Run after deploy.ts if configuration step failed (e.g. nonce issues).
 *
 * Usage:
 *   npx hardhat run scripts/setup-deployed.ts --network celo
 *
 * Set DEPLOYED_ADDRESSES env or edit the addresses below.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// === EDIT THESE WITH YOUR DEPLOYED ADDRESSES ===
const ADDRESSES: Record<string, Record<string, string>> = {
  celo: {
    storage: "0x7409D7b82259e3Ce652eD1e15890Ea8401aEEeDC",
    proxy: "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
    accessManager: "0xd5aBA8310dC3fB5D0B22C8492222E5446EB1abe8",
    invoiceManager: "0x3c46D60709145C6EC781D5FA2bc6A172eA7Af37A",
    paymentProcessor: "0x3C2f18E20E6E3cDFf1dAb14CcF3639e56Ed57421",
    treasuryManager: "0xD5255c4195648B57607F0e86357B16ce02aC881B",
    withdrawalManager: "0xEF8A95f78566591E1D15218565812Ef952B857d9",
  },
  base: {
    storage: "0x8734Cb91Bfe02Fd2De4abD8F2965447DF8d03987",
    proxy: "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
    accessManager: "0x8cCb89B6b4B4218869B19F86a5CAC32076E2e834",
    invoiceManager: "0xD3038EF4cC94BA00b8578379aB3cec15D1863a1a",
    paymentProcessor: "0xE2c5Da5A7e31621f30EaCe149f3d0A9f844e82F0",
    treasuryManager: "0xDDa64f4AafA052bbB009e623eF1388A4cf6792e0",
    withdrawalManager: "0x7Ce6fE6e4FE173a38500DC83Ed7D5B897D4E96BA",
  },
  polygon: {
    storage: "0xF96B7A8ef6480f8A83e71a563F83043625817290",
    proxy: "0xc7F4313179532680Fc731DAD955221e901A582D9",
    accessManager: "0x9dcB5c3ad14F58f53B2662c16e8FA3dDeE782e1D",
    invoiceManager: "0xAd24bdAc4eE6681A01D2a5B93A2a8eeeA024C5Fc",
    paymentProcessor: "0x6368b0509a566478049e37e9C8dBfA596ad6eBA3",
    treasuryManager: "0xcAdfE13436Be54e1FCABcb75B52EC85C46fFB4eC",
    withdrawalManager: "0x835414bD4a9cFCA2BC753a0c820903CD535A0c83",
  },
};

async function main() {
  const network = process.env.HARDHAT_NETWORK || "hardhat";
  const addresses = ADDRESSES[network];

  if (!addresses) {
    console.error(`No deployed addresses for network: ${network}`);
    console.log("Available:", Object.keys(ADDRESSES).join(", "));
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`\nSetting up ${network} with deployer: ${deployer.address}\n`);

  const adminWallet = process.env.ADMIN_WALLET || deployer.address;
  const backendWallet = process.env.BACKEND_WALLET || adminWallet;

  // Get contract instances
  const proxy = await ethers.getContractAt("DerampProxy", addresses.proxy);
  const storage = await ethers.getContractAt("DerampStorage", addresses.storage);
  const accessManager = await ethers.getContractAt("AccessManager", addresses.accessManager);

  // Step 1: Configure proxy modules
  console.log("1. Configuring proxy modules...");
  try {
    // Check if already configured
    const currentStorage = await proxy.storageContract();
    if (currentStorage === ethers.ZeroAddress) {
      await (await proxy.setStorageContract(addresses.storage)).wait();
      console.log("   Storage set");
      await (await proxy.setAccessManager(addresses.accessManager)).wait();
      console.log("   AccessManager set");
      await (await proxy.setInvoiceManager(addresses.invoiceManager)).wait();
      console.log("   InvoiceManager set");
      await (await proxy.setPaymentProcessor(addresses.paymentProcessor)).wait();
      console.log("   PaymentProcessor set");
      await (await proxy.setTreasuryManager(addresses.treasuryManager)).wait();
      console.log("   TreasuryManager set");
      await (await proxy.setWithdrawalManager(addresses.withdrawalManager)).wait();
      console.log("   WithdrawalManager set");
    } else {
      console.log("   Already configured, skipping");
    }
  } catch (e: any) {
    console.log("   Error:", e.message?.slice(0, 100));
  }

  // Step 2: Authorize modules in storage
  console.log("2. Authorizing modules in storage...");
  try {
    await (await storage.setModule("AccessManager", addresses.accessManager)).wait();
    await (await storage.setModule("InvoiceManager", addresses.invoiceManager)).wait();
    await (await storage.setModule("PaymentProcessor", addresses.paymentProcessor)).wait();
    await (await storage.setModule("WithdrawalManager", addresses.withdrawalManager)).wait();
    await (await storage.setModule("TreasuryManager", addresses.treasuryManager)).wait();
    console.log("   Modules authorized");
  } catch (e: any) {
    console.log("   Error (may already be set):", e.message?.slice(0, 100));
  }

  // Step 3: Whitelist tokens
  console.log("3. Whitelisting tokens...");
  const configModule = require("./config");
  const tokens = configModule.TOKENS_BY_NETWORK?.[network] || [];
  let tokensAdded = 0;
  for (const token of tokens) {
    try {
      await (await accessManager.addTokenToWhitelist(token)).wait();
      console.log(`   Whitelisted: ${token}`);
      tokensAdded++;
    } catch (e: any) {
      console.log(`   Skip ${token}: ${e.message?.slice(0, 60)}`);
    }
  }
  console.log(`   ${tokensAdded} tokens whitelisted`);

  // Step 4: Setup roles
  console.log("4. Setting up roles...");
  const ONBOARDING_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ONBOARDING_ROLE"));
  const TOKEN_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TOKEN_MANAGER_ROLE"));
  const TREASURY_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TREASURY_MANAGER_ROLE"));
  const BACKEND_OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BACKEND_OPERATOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  try {
    if (adminWallet.toLowerCase() !== deployer.address.toLowerCase()) {
      // Transfer roles to admin
      await (await accessManager.grantRole(DEFAULT_ADMIN_ROLE, adminWallet)).wait();
      await (await accessManager.grantRole(ONBOARDING_ROLE, adminWallet)).wait();
      await (await accessManager.grantRole(TOKEN_MANAGER_ROLE, adminWallet)).wait();
      await (await accessManager.grantRole(TREASURY_MANAGER_ROLE, adminWallet)).wait();
      console.log(`   Roles granted to admin: ${adminWallet}`);

      // Backend operator
      await (await accessManager.grantRole(BACKEND_OPERATOR_ROLE, backendWallet)).wait();
      console.log(`   Backend operator: ${backendWallet}`);

      // Revoke from deployer
      await (await accessManager.revokeRole(ONBOARDING_ROLE, deployer.address)).wait();
      await (await accessManager.revokeRole(TOKEN_MANAGER_ROLE, deployer.address)).wait();
      await (await accessManager.revokeRole(TREASURY_MANAGER_ROLE, deployer.address)).wait();
      await (await accessManager.revokeRole(BACKEND_OPERATOR_ROLE, deployer.address)).wait();
      await (await accessManager.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();
      console.log("   Deployer roles revoked");
    } else {
      // Same wallet — grant all roles
      await (await accessManager.grantRole(ONBOARDING_ROLE, deployer.address)).wait();
      await (await accessManager.grantRole(TOKEN_MANAGER_ROLE, deployer.address)).wait();
      await (await accessManager.grantRole(TREASURY_MANAGER_ROLE, deployer.address)).wait();
      await (await accessManager.grantRole(BACKEND_OPERATOR_ROLE, deployer.address)).wait();
      console.log(`   All roles assigned to: ${deployer.address}`);
    }
  } catch (e: any) {
    console.log("   Role error:", e.message?.slice(0, 100));
  }

  // Step 5: Treasury wallet
  console.log("5. Setting up treasury...");
  try {
    await (await proxy.addTreasuryWallet(adminWallet, "Main Treasury")).wait();
    console.log(`   Treasury: ${adminWallet}`);
  } catch (e: any) {
    console.log("   Skip:", e.message?.slice(0, 60));
  }

  // Step 6: Save addresses
  const addressesDir = path.join(__dirname, "..", "deployed-addresses");
  if (!fs.existsSync(addressesDir)) fs.mkdirSync(addressesDir, { recursive: true });

  const outputPath = path.join(addressesDir, `${network}-contract-addresses.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    network,
    deployedAt: new Date().toISOString(),
    addresses,
  }, null, 2));
  console.log(`\nAddresses saved to: ${outputPath}`);

  console.log("\n=== Setup complete ===");
  console.log(`Proxy:            ${addresses.proxy}`);
  console.log(`Storage:          ${addresses.storage}`);
  console.log(`AccessManager:    ${addresses.accessManager}`);
  console.log(`InvoiceManager:   ${addresses.invoiceManager}`);
  console.log(`PaymentProcessor: ${addresses.paymentProcessor}`);
  console.log(`TreasuryManager:  ${addresses.treasuryManager}`);
  console.log(`WithdrawalManager:${addresses.withdrawalManager}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
