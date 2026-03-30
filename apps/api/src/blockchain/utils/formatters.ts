import { NETWORKS } from '../config/networks';
import { TOKENS } from '../config/tokens';

/**
 * Utility functions for formatting blockchain data
 */

/**
 * Get block explorer URL for transaction hash
 */
export function getBlockExplorerUrl(network: string, txHash: string): string {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  if (networkConfig?.blockExplorer) {
    return `${networkConfig.blockExplorer}/tx/${txHash}`;
  }
  return `#`; // Fallback if network not found
}

function getNetworksToSearch(network?: string): string[] {
  if (network && TOKENS[network as keyof typeof TOKENS]) {
    return [network];
  }
  return Object.keys(TOKENS);
}

function isAddress(identifier: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(identifier);
}

/**
 * Get token symbol from contract address OR symbol (case-insensitive). Optionally scope by network name.
 */
export function getTokenSymbol(identifier: string, network?: string): string {
  const networks = getNetworksToSearch(network);
  for (const networkName of networks) {
    const networkTokens = TOKENS[networkName];
    for (const tokenKey of Object.keys(networkTokens)) {
      const token = networkTokens[tokenKey];
      if (isAddress(identifier)) {
        if (token.address.toLowerCase() === identifier.toLowerCase()) {
          return token.symbol;
        }
      } else {
        // Match either the exact exported key or the token.symbol (case-insensitive)
        if (tokenKey.toLowerCase() === identifier.toLowerCase() || token.symbol.toLowerCase() === identifier.toLowerCase()) {
          return token.symbol;
        }
      }
    }
  }
  return 'Unknown Token';
}

/**
 * Get token contract address from contract address OR symbol. Optionally scope by network name.
 */
export function getTokenAddress(identifier: string, network?: string): string | null {
  const networks = getNetworksToSearch(network);
  for (const networkName of networks) {
    const networkTokens = TOKENS[networkName];
    for (const tokenKey of Object.keys(networkTokens)) {
      const token = networkTokens[tokenKey];
      if (isAddress(identifier)) {
        if (token.address.toLowerCase() === identifier.toLowerCase()) {
          return token.address;
        }
      } else {
        if (tokenKey.toLowerCase() === identifier.toLowerCase() || token.symbol.toLowerCase() === identifier.toLowerCase()) {
          return token.address;
        }
      }
    }
  }
  return null;
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network: string): string {
  const networkConfig = NETWORKS[network as keyof typeof NETWORKS];
  return networkConfig?.name || network || 'Unknown Network';
}
