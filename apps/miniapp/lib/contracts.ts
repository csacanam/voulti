export const PROXY_ADDRESSES: Record<string, string> = {
  celo: "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
  arbitrum: "0xf8553C9Df40057b2920A245637B8C0581EC75767",
  polygon: "0xc7F4313179532680Fc731DAD955221e901A582D9",
  base: "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
  bsc: "0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F",
}

export const DERAMP_PROXY_ABI = [
  "function withdrawTo(address token, uint256 amount, address to) external",
]

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
}

export const NETWORKS: Record<string, NetworkConfig> = {
  celo: {
    chainId: 42220,
    name: "Celo",
    rpcUrl: "https://forno.celo.org",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
}

// Min native balance to attempt a direct withdraw (skip gasless fee)
export const GAS_THRESHOLDS: Record<string, number> = {
  celo: 0.01,
  arbitrum: 0.0002,
  polygon: 0.05,
  base: 0.0002,
  bsc: 0.0005,
}
