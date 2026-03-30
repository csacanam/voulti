/**
 * Network Configuration
 * Centralized configuration for blockchain networks
 */

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  blockExplorer: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

export const NETWORKS: Record<string, NetworkConfig> = {
  hardhat: {
    chainId: 31337,
    name: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  celo: {
    chainId: 42220,
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
}

export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(NETWORKS).find((network) => network.chainId === chainId) || null
}

export function getNetworkByName(name: string): NetworkConfig | null {
  return NETWORKS[name] || null
}
