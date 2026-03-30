// src/blockchain/utils/web3.ts
import { ethers } from "ethers";
import { NETWORKS } from "../config/networks";

export function getProvider(network: string, supportsENS?: boolean): ethers.JsonRpcProvider {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  
  const providerConfig: any = {
    name: networkConfig.name,
    chainId: networkConfig.chainId
  };

  // If supportsENS is explicitly false, disable ENS
  if (supportsENS === false) {
    providerConfig.ensAddress = undefined;
  }

  return new ethers.JsonRpcProvider(networkConfig.rpcUrl, providerConfig);
}

export function getWallet(privateKey: string, network: string, supportsENS?: boolean): ethers.Wallet {
  const provider = getProvider(network, supportsENS);
  return new ethers.Wallet(privateKey, provider);
} 