// src/blockchain/config/networks.ts

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || "";
const alchemyUrl = (net: string) => ALCHEMY_KEY ? `https://${net}.g.alchemy.com/v2/${ALCHEMY_KEY}` : "";

// Ordered RPC endpoints per network: env override first, then Alchemy, then
// free public endpoints. getProvider() wraps them in a FallbackProvider so a
// request that fails on one endpoint (outage, HTTP 429 "monthly capacity
// limit", etc.) is retried on the next instead of taking the API down.
const rpcUrls = (...urls: (string | undefined)[]) =>
  urls.filter((u): u is string => Boolean(u));

export const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: "Hardhat Local",
    rpcUrls: rpcUrls(process.env.HARDHAT_RPC_URL, "http://127.0.0.1:8545"),
    blockExplorer: "",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  celo: {
    chainId: 42220,
    name: "Celo",
    rpcUrls: rpcUrls(
      process.env.CELO_RPC_URL,
      alchemyUrl("celo-mainnet"),
      "https://forno.celo.org",
      "https://celo.drpc.org"
    ),
    blockExplorer: "https://celoscan.io",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrls: rpcUrls(
      process.env.ARBITRUM_RPC_URL,
      alchemyUrl("arb-mainnet"),
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.drpc.org"
    ),
    blockExplorer: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrls: rpcUrls(
      process.env.POLYGON_RPC_URL,
      alchemyUrl("polygon-mainnet"),
      "https://polygon-bor-rpc.publicnode.com",
      "https://polygon.drpc.org"
    ),
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrls: rpcUrls(
      process.env.BASE_RPC_URL,
      alchemyUrl("base-mainnet"),
      "https://mainnet.base.org",
      "https://base.drpc.org"
    ),
    blockExplorer: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrls: rpcUrls(
      process.env.BSC_RPC_URL,
      "https://bsc-dataseed.binance.org",
      "https://bsc-rpc.publicnode.com"
    ),
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
};

export type NetworkName = keyof typeof NETWORKS;

export function getNetworkByChainId(chainId: number): NetworkName {
  const network = Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId);
  if (!network) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }
  return network[0] as NetworkName;
}
