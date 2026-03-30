// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/PayoutVault.sol";

/**
 * @title DeployVault
 * @notice Smart deployment script that reads token addresses from .env
 * @dev Usage:
 *
 * TOKEN=CCOP forge script script/DeployVault.s.sol:DeployVault --rpc-url https://forno.celo.org --broadcast --verify
 * TOKEN=CREAL forge script script/DeployVault.s.sol:DeployVault --rpc-url https://forno.celo.org --broadcast --verify
 * TOKEN=MXNB forge script script/DeployVault.s.sol:DeployVault --rpc-url https://arb1.arbitrum.io/rpc --broadcast --verify
 */
contract DeployVault is Script {
    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("VAULT_OWNER");
        string memory tokenName = vm.envString("TOKEN");

        // Build env var name: TOKEN_CCOP, TOKEN_CREAL, etc.
        string memory tokenEnvVar = string(
            abi.encodePacked("TOKEN_", tokenName)
        );
        address tokenAddress = vm.envAddress(tokenEnvVar);

        require(
            tokenAddress != address(0),
            string(abi.encodePacked(tokenEnvVar, " not set in .env"))
        );
        require(owner != address(0), "VAULT_OWNER not set");

        console.log("=== PayoutVault Deployment ===");
        console.log("Token:", tokenName);
        console.log("Token Address:", tokenAddress);
        console.log("Network Chain ID:", block.chainid);
        console.log("Vault Owner:", owner);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PayoutVault for this specific token
        PayoutVault vault = new PayoutVault(tokenAddress, owner);

        vm.stopBroadcast();

        console.log("=== Deployment Complete ===");
        console.log("PayoutVault:", address(vault));
        console.log("Token:", address(vault.token()));
        console.log("Owner:", vault.owner());
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update frontend/blockchain/vaults.ts");
        console.log("2. Update backend docs with new address");
        console.log("3. Configure Squid post-hook");
    }
}
