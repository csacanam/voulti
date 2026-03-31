/**
 * Verify all contracts on all production networks.
 *
 * Usage:
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/verify-all.ts --network celo
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/verify-all.ts --network arbitrum
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/verify-all.ts --network polygon
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/verify-all.ts --network base
 *   ETHERSCAN_API_KEY=xxx npx hardhat run scripts/verify-all.ts --network bsc
 */

import { run, network } from "hardhat";

const DEPLOYED: Record<string, {
  proxy: string; storage: string; accessManager: string;
  invoiceManager: string; paymentProcessor: string;
  treasuryManager: string; withdrawalManager: string;
}> = {
  celo: {
    proxy: "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
    storage: "0x7409D7b82259e3Ce652eD1e15890Ea8401aEEeDC",
    accessManager: "0xd5aBA8310dC3fB5D0B22C8492222E5446EB1abe8",
    invoiceManager: "0x3c46D60709145C6EC781D5FA2bc6A172eA7Af37A",
    paymentProcessor: "0x3C2f18E20E6E3cDFf1dAb14CcF3639e56Ed57421",
    treasuryManager: "0xD5255c4195648B57607F0e86357B16ce02aC881B",
    withdrawalManager: "0xE2c5Da5A7e31621f30EaCe149f3d0A9f844e82F0",
  },
  arbitrum: {
    proxy: "0xf8553C9Df40057b2920A245637B8C0581EC75767",
    storage: "0xc7E192D0ec4953F4eb49cD7A489AD76c8c03E195",
    accessManager: "0x19EA5d8DEd7CAD3f133516CAAC8620DD7003cE2E",
    invoiceManager: "0x8bc1E1A71BDFA56cF8fC86282C3fb2e93202F847",
    paymentProcessor: "0x271101C3E1e97C93a38F6588914Dc409a5C7bf08",
    treasuryManager: "0xc5c2a7b0B450092e3939246860efFA5C2a6Ec491",
    withdrawalManager: "0xc7c8092b6ca15a0b4E52D7691EfE8657Cc1D367d",
  },
  polygon: {
    proxy: "0xc7F4313179532680Fc731DAD955221e901A582D9",
    storage: "0xF96B7A8ef6480f8A83e71a563F83043625817290",
    accessManager: "0x9dcB5c3ad14F58f53B2662c16e8FA3dDeE782e1D",
    invoiceManager: "0xAd24bdAc4eE6681A01D2a5B93A2a8eeeA024C5Fc",
    paymentProcessor: "0x6368b0509a566478049e37e9C8dBfA596ad6eBA3",
    treasuryManager: "0xcAdfE13436Be54e1FCABcb75B52EC85C46fFB4eC",
    withdrawalManager: "0x842939bE2e1B3b23a0cc24877E7d7b3a8b453714",
  },
  base: {
    proxy: "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
    storage: "0x8734Cb91Bfe02Fd2De4abD8F2965447DF8d03987",
    accessManager: "0x8cCb89B6b4B4218869B19F86a5CAC32076E2e834",
    invoiceManager: "0xD3038EF4cC94BA00b8578379aB3cec15D1863a1a",
    paymentProcessor: "0xE2c5Da5A7e31621f30EaCe149f3d0A9f844e82F0",
    treasuryManager: "0xDDa64f4AafA052bbB009e623eF1388A4cf6792e0",
    withdrawalManager: "0x162E4C7cA7a603891Ac807ABBd90c8C46D62C659",
  },
  bsc: {
    proxy: "0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F",
    storage: "0xafCf44caFb5a654Eec2eD68B787910A357dec120",
    accessManager: "0xA8F2F528B6987bD3F5188EB92673cC7228EC5696",
    invoiceManager: "0x3f2CF115AE719f25Cf7c47097A89FfeB535cAe7A",
    paymentProcessor: "0x0132A3C3049D5697738278B397dd4C54855f2371",
    treasuryManager: "0x45b864640827FD6357e44624203ab4Da48AB95c0",
    withdrawalManager: "0x8eB2F62f6f9ee795B28292b8Db56eD3b4396aF6B",
  },
};

async function verify(address: string, constructorArgs: any[], contractName: string) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`  ✅ ${contractName}`);
  } catch (err: any) {
    if (err.message.includes("already verified")) {
      console.log(`  ✅ ${contractName} (already verified)`);
    } else {
      console.log(`  ❌ ${contractName}: ${err.message.substring(0, 100)}`);
    }
  }
}

async function main() {
  const net = network.name;
  const addr = DEPLOYED[net];

  if (!addr) {
    console.error(`Network "${net}" not found.`);
    process.exit(1);
  }

  console.log(`\n=== Verifying all contracts on ${net} ===\n`);

  // DerampStorage: no constructor args
  console.log("1/7 DerampStorage");
  await verify(addr.storage, [], "DerampStorage");

  // DerampProxy: no constructor args
  console.log("2/7 DerampProxy");
  await verify(addr.proxy, [], "DerampProxy");

  // AccessManager(storage, proxy)
  console.log("3/7 AccessManager");
  await verify(addr.accessManager, [addr.storage, addr.proxy], "AccessManager");

  // InvoiceManager(storage, accessManager, proxy)
  console.log("4/7 InvoiceManager");
  await verify(addr.invoiceManager, [addr.storage, addr.accessManager, addr.proxy], "InvoiceManager");

  // PaymentProcessor(storage, accessManager, proxy)
  console.log("5/7 PaymentProcessor");
  await verify(addr.paymentProcessor, [addr.storage, addr.accessManager, addr.proxy], "PaymentProcessor");

  // TreasuryManager(storage, accessManager, proxy)
  console.log("6/7 TreasuryManager");
  await verify(addr.treasuryManager, [addr.storage, addr.accessManager, addr.proxy], "TreasuryManager");

  // WithdrawalManager(storage, accessManager, proxy)
  console.log("7/7 WithdrawalManager");
  await verify(addr.withdrawalManager, [addr.storage, addr.accessManager, addr.proxy], "WithdrawalManager");

  console.log(`\n=== Done ${net} ===\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
