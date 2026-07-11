// src/blockchain/utils/web3.ts
import { ethers } from "ethers";
import { NETWORKS } from "../config/networks";

// Provider with automatic failover across every endpoint in the network's
// rpcUrls list. quorum: 1 + ascending priority makes FallbackProvider act as
// plain failover (same idea as viem's fallback() transport): requests go to
// the first endpoint and spill over to the next when it errors or stalls,
// so an Alchemy outage or free-tier 429 doesn't brick on-chain calls.
// `supportsENS` is kept for signature compatibility; none of our networks
// configure ENS, so lookups fail the same way regardless of its value.
export function getProvider(network: string, supportsENS?: boolean): ethers.AbstractProvider {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  const chain = new ethers.Network(networkConfig.name, networkConfig.chainId);

  const providers = networkConfig.rpcUrls.map((url, i) => ({
    provider: new ethers.JsonRpcProvider(url, chain, { staticNetwork: true }),
    priority: i + 1,
    weight: 1,
    stallTimeout: 1500,
  }));

  if (providers.length === 1) return providers[0].provider;

  return new ethers.FallbackProvider(providers, chain, { quorum: 1 });
}

export function getWallet(privateKey: string, network: string, supportsENS?: boolean): ethers.Wallet {
  const provider = getProvider(network, supportsENS);
  return new ethers.Wallet(privateKey, provider);
}
