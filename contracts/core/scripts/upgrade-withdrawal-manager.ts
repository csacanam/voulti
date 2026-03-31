/**
 * Upgrade WithdrawalManager on all production networks.
 *
 * Deploys a new WithdrawalManager with withdrawFor() support,
 * then calls setWithdrawalManager() on each proxy.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-withdrawal-manager.ts --network celo
 *   npx hardhat run scripts/upgrade-withdrawal-manager.ts --network arbitrum
 *   npx hardhat run scripts/upgrade-withdrawal-manager.ts --network polygon
 *   npx hardhat run scripts/upgrade-withdrawal-manager.ts --network base
 *   npx hardhat run scripts/upgrade-withdrawal-manager.ts --network bsc
 */

import { ethers, network } from "hardhat";

const DEPLOYED: Record<string, { proxy: string; storage: string; accessManager: string }> = {
  celo: {
    proxy: "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
    storage: "0x7409D7b82259e3Ce652eD1e15890Ea8401aEEeDC",
    accessManager: "0xd5aBA8310dC3fB5D0B22C8492222E5446EB1abe8",
  },
  arbitrum: {
    proxy: "0xf8553C9Df40057b2920A245637B8C0581EC75767",
    storage: "0xc7E192D0ec4953F4eb49cD7A489AD76c8c03E195",
    accessManager: "0x19EA5d8DEd7CAD3f133516CAAC8620DD7003cE2E",
  },
  polygon: {
    proxy: "0xc7F4313179532680Fc731DAD955221e901A582D9",
    storage: "0xF96B7A8ef6480f8A83e71a563F83043625817290",
    accessManager: "0x9dcB5c3ad14F58f53B2662c16e8FA3dDeE782e1D",
  },
  base: {
    proxy: "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
    storage: "0x8734Cb91Bfe02Fd2De4abD8F2965447DF8d03987",
    accessManager: "0x8cCb89B6b4B4218869B19F86a5CAC32076E2e834",
  },
  bsc: {
    proxy: "0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F",
    storage: "0xafCf44caFb5a654Eec2eD68B787910A357dec120",
    accessManager: "0xA8F2F528B6987bD3F5188EB92673cC7228EC5696",
  },
};

async function waitForSync(ms = 3000) {
  console.log(`  Waiting ${ms / 1000}s for RPC sync...`);
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const networkName = network.name;
  const addresses = DEPLOYED[networkName];

  if (!addresses) {
    console.error(`Network "${networkName}" not found. Use: celo, arbitrum, polygon, base, bsc`);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`\n=== Upgrading WithdrawalManager on ${networkName} ===`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Proxy: ${addresses.proxy}`);
  console.log(`Storage: ${addresses.storage}`);
  console.log(`AccessManager: ${addresses.accessManager}`);

  // 1. Deploy new WithdrawalManager
  console.log(`\n1. Deploying new WithdrawalManager...`);
  const WithdrawalManager = await ethers.getContractFactory("WithdrawalManager");
  const wm = await WithdrawalManager.deploy(
    addresses.storage,
    addresses.accessManager,
    addresses.proxy
  );
  await wm.waitForDeployment();
  const wmAddress = await wm.getAddress();
  console.log(`   New WithdrawalManager: ${wmAddress}`);

  await waitForSync();

  // 2. Authorize the new module in DerampStorage
  console.log(`\n2. Authorizing new module in Storage...`);
  const storageAbi = [
    "function setModule(string calldata name, address moduleAddress) external",
    "function authorizedModules(address) view returns (bool)",
  ];
  const storage = new ethers.Contract(addresses.storage, storageAbi, deployer);
  const authTx = await storage.setModule("WithdrawalManagerV2", wmAddress);
  await authTx.wait();
  console.log(`   Authorized: ${authTx.hash}`);

  await waitForSync();

  // 3. Update proxy to point to new WithdrawalManager
  console.log(`\n3. Updating proxy...`);
  const proxyAbi = [
    "function setWithdrawalManager(address _withdrawalManager) external",
    "function withdrawalManager() view returns (address)",
  ];
  const proxy = new ethers.Contract(addresses.proxy, proxyAbi, deployer);

  const oldWm = await proxy.withdrawalManager();
  console.log(`   Old WithdrawalManager: ${oldWm}`);

  const setTx = await proxy.setWithdrawalManager(wmAddress);
  await setTx.wait();
  console.log(`   Updated: ${setTx.hash}`);

  await waitForSync();

  // 4. Verify
  const newWm = await proxy.withdrawalManager();
  console.log(`\n4. Verification:`);
  console.log(`   Proxy.withdrawalManager() = ${newWm}`);
  console.log(`   Match: ${newWm.toLowerCase() === wmAddress.toLowerCase() ? '✅' : '❌'}`);

  const isAuth = await storage.authorizedModules(wmAddress);
  console.log(`   Storage authorized: ${isAuth ? '✅' : '❌'}`);

  console.log(`\n✅ Done! WithdrawalManager upgraded on ${networkName}`);
  console.log(`   New address: ${wmAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
