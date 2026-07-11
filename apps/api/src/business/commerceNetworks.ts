import { ethers } from 'ethers';
import { NETWORKS, type NetworkName } from '../blockchain/config/networks';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';
import { getProvider, getWallet } from '../blockchain/utils/web3';
import AccessManagerABI from '../blockchain/abi/AccessManager.json';

const ACCESS_MANAGER_ABI = [
  'function addCommerceToWhitelist(address commerce)',
  'function removeCommerceFromWhitelist(address commerce)',
  'function addTokenToCommerceWhitelist(address commerce, address[] tokens)',
  'function removeTokenFromCommerceWhitelist(address commerce, address[] tokens)',
  'function isCommerceWhitelisted(address) view returns (bool)',
  'function isTokenWhitelistedForCommerce(address commerce, address token) view returns (bool)',
];

export interface NetworkStatus {
  network: string;
  chainId: number;
  active: boolean; // commerce is whitelisted on-chain
  tokens: {
    symbol: string;
    address: string;
    decimals: number;
    whitelisted: boolean;
  }[];
}

/**
 * Reads the on-chain whitelist status of a commerce on all production networks.
 */
export async function getCommerceNetworkStatus(commerceWallet: string): Promise<NetworkStatus[]> {
  const results: NetworkStatus[] = [];

  await Promise.all(
    Object.entries(CONTRACTS)
      .filter(([name]) => name !== 'hardhat')
      .map(async ([networkName, contracts]) => {
        if (!contracts.ACCESS_MANAGER) return;

        try {
          const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
          const provider = getProvider(networkName);
          const am = new ethers.Contract(contracts.ACCESS_MANAGER, ACCESS_MANAGER_ABI, provider);

          const [active, ...tokenResults] = await Promise.all([
            am.isCommerceWhitelisted(commerceWallet),
            ...Object.values(TOKENS[networkName] || {}).map(t =>
              am.isTokenWhitelistedForCommerce(commerceWallet, t.address).catch(() => false)
            ),
          ]);

          const tokensArr = Object.values(TOKENS[networkName] || {});
          results.push({
            network: networkName,
            chainId: networkConfig.chainId,
            active: Boolean(active),
            tokens: tokensArr.map((t, i) => ({
              symbol: t.symbol,
              address: t.address,
              decimals: t.decimals,
              whitelisted: Boolean(tokenResults[i]),
            })),
          });
        } catch (err: any) {
          console.error(`Network status error on ${networkName}:`, err.message);
          results.push({
            network: networkName,
            chainId: NETWORKS[networkName as keyof typeof NETWORKS]?.chainId || 0,
            active: false,
            tokens: [],
          });
        }
      })
  );

  // Preserve network ordering
  const order = ['celo', 'arbitrum', 'polygon', 'base', 'bsc'];
  return results.sort((a, b) => order.indexOf(a.network) - order.indexOf(b.network));
}

/**
 * Whitelist a commerce on a specific network (adds commerce + all tokens).
 */
export async function enableCommerceOnNetwork(commerceWallet: string, network: string): Promise<string> {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) throw new Error('BACKEND_PRIVATE_KEY not configured');

  const contracts = CONTRACTS[network];
  if (!contracts?.ACCESS_MANAGER) throw new Error(`No contract on ${network}`);

  const signer = getWallet(backendKey, network as NetworkName, false);
  const am = new ethers.Contract(contracts.ACCESS_MANAGER, AccessManagerABI.abi || AccessManagerABI, signer);

  // 1. Add commerce if not already
  const alreadyWhitelisted = await am.isCommerceWhitelisted(commerceWallet);
  let lastTx = '';
  if (!alreadyWhitelisted) {
    const tx = await am.addCommerceToWhitelist(commerceWallet);
    await tx.wait();
    lastTx = tx.hash;
  }

  // 2. Add all tokens
  const networkTokens = TOKENS[network];
  if (networkTokens) {
    const addresses = Object.values(networkTokens).map(t => t.address);
    if (addresses.length > 0) {
      const tx = await am.addTokenToCommerceWhitelist(commerceWallet, addresses);
      await tx.wait();
      lastTx = tx.hash;
    }
  }

  return lastTx;
}

/**
 * Remove a commerce from a network (removes tokens + commerce from whitelist).
 */
export async function disableCommerceOnNetwork(commerceWallet: string, network: string): Promise<string> {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) throw new Error('BACKEND_PRIVATE_KEY not configured');

  const contracts = CONTRACTS[network];
  if (!contracts?.ACCESS_MANAGER) throw new Error(`No contract on ${network}`);

  const signer = getWallet(backendKey, network as NetworkName, false);
  const am = new ethers.Contract(contracts.ACCESS_MANAGER, AccessManagerABI.abi || AccessManagerABI, signer);

  let lastTx = '';

  // 1. Remove tokens
  const networkTokens = TOKENS[network];
  if (networkTokens) {
    const addresses = Object.values(networkTokens).map(t => t.address);
    if (addresses.length > 0) {
      const tx = await am.removeTokenFromCommerceWhitelist(commerceWallet, addresses);
      await tx.wait();
      lastTx = tx.hash;
    }
  }

  // 2. Remove commerce
  const tx = await am.removeCommerceFromWhitelist(commerceWallet);
  await tx.wait();
  lastTx = tx.hash;

  return lastTx;
}
