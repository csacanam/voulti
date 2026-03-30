import { Chain } from 'wagmi/chains';
import { celo, arbitrum, polygon, base, bsc, hardhat } from 'wagmi/chains';

// Token configuration interface
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Centralized configuration of all supported blockchains
export interface ChainConfig {
  chain: Chain;
  backendNames: string[];
  enabled: boolean;
  priority: number;
  contracts: {
    DERAMP_PROXY: string;
    DERAMP_STORAGE: string;
    ACCESS_MANAGER: string;
    INVOICE_MANAGER: string;
    PAYMENT_PROCESSOR: string;
  };
  tokens: Record<string, TokenConfig>;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Contract addresses are populated after deployment via env vars or hardcoded after deploy.
// Empty strings mean "not yet deployed".
export const SUPPORTED_CHAINS: ChainConfig[] = [
  // Hardhat local (only enabled when env vars are set)
  ...(import.meta.env.VITE_HARDHAT_PROXY_ADDRESS ? [{
    chain: hardhat,
    backendNames: ['Hardhat', 'Hardhat Local', 'hardhat'],
    enabled: true,
    priority: 0,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_HARDHAT_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_HARDHAT_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_HARDHAT_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_HARDHAT_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_HARDHAT_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: import.meta.env.VITE_HARDHAT_USDC_ADDRESS || "", symbol: "USDC", name: "Mock USDC", decimals: 6 },
      USDT: { address: import.meta.env.VITE_HARDHAT_USDT_ADDRESS || "", symbol: "USDT", name: "Mock USDT", decimals: 6 },
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorer: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  } as ChainConfig] : []),
  {
    chain: celo,
    backendNames: ['Celo', 'CELO', 'Celo Mainnet'],
    enabled: true,
    priority: 1,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_CELO_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_CELO_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_CELO_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_CELO_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_CELO_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT: { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", symbol: "USDT", name: "Tether USD", decimals: 6 },
      CUSD: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", symbol: "cUSD", name: "Celo Dollar", decimals: 18 },
      CCOP: { address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", symbol: "cCOP", name: "Celo Colombian Peso", decimals: 18 },
      CREAL: { address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", symbol: "cREAL", name: "Celo Brazilian Real", decimals: 18 },
      BRLA: { address: "0xfecb3f7c54e2caae9dc6ac9060a822d47e053760", symbol: "BRLA", name: "Brazilian Digital Real", decimals: 18 },
    },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorer: 'https://celoscan.io',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  },
  {
    chain: arbitrum,
    backendNames: ['Arbitrum', 'Arbitrum One'],
    enabled: true,
    priority: 2,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_ARBITRUM_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_ARBITRUM_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_ARBITRUM_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_ARBITRUM_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_ARBITRUM_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    chain: polygon,
    backendNames: ['Polygon', 'Polygon Mainnet'],
    enabled: true,
    priority: 3,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_POLYGON_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_POLYGON_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_POLYGON_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_POLYGON_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_POLYGON_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  },
  {
    chain: base,
    backendNames: ['Base', 'Base Mainnet'],
    enabled: true,
    priority: 4,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_BASE_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_BASE_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_BASE_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_BASE_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_BASE_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  {
    chain: bsc,
    backendNames: ['BSC', 'BNB Smart Chain'],
    enabled: true,
    priority: 5,
    contracts: {
      DERAMP_PROXY: import.meta.env.VITE_BSC_PROXY_ADDRESS || "",
      DERAMP_STORAGE: import.meta.env.VITE_BSC_STORAGE_ADDRESS || "",
      ACCESS_MANAGER: import.meta.env.VITE_BSC_ACCESS_MANAGER_ADDRESS || "",
      INVOICE_MANAGER: import.meta.env.VITE_BSC_INVOICE_MANAGER_ADDRESS || "",
      PAYMENT_PROCESSOR: import.meta.env.VITE_BSC_PAYMENT_PROCESSOR_ADDRESS || "",
    },
    tokens: {
      USDC: { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
      USDT: { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18 },
    },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
];

// Get all enabled chains for wagmi
export const getAllEnabledChains = () => {
  const enabledChains = SUPPORTED_CHAINS
    .filter(config => config.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(config => config.chain);

  if (enabledChains.length === 0) {
    throw new Error('No blockchains enabled. Check SUPPORTED_CHAINS configuration.');
  }

  return enabledChains;
};

// Mapping of backend names to chain objects
export const getBackendNameToChainMap = (): Record<string, Chain> => {
  const map: Record<string, Chain> = {};
  SUPPORTED_CHAINS.filter(c => c.enabled).forEach(config => {
    config.backendNames.forEach(name => { map[name] = config.chain; });
  });
  return map;
};

// Mapping of backend names to chain IDs
export const getBackendNameToChainIdMap = (): Record<string, number> => {
  const map: Record<string, number> = {};
  SUPPORTED_CHAINS.filter(c => c.enabled).forEach(config => {
    config.backendNames.forEach(name => { map[name] = config.chain.id; });
  });
  return map;
};

// Find chain ID by backend name
export const findChainIdByBackendName = (backendName: string): number | undefined => {
  return SUPPORTED_CHAINS.filter(c => c.enabled).find(c => c.backendNames.includes(backendName))?.chain.id;
};

// Find chain by backend name
export const findChainByBackendName = (backendName: string): Chain | undefined => {
  return SUPPORTED_CHAINS.filter(c => c.enabled).find(c => c.backendNames.includes(backendName))?.chain;
};

// Find chain config by backend name
export const findChainConfigByBackendName = (backendName: string): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.filter(c => c.enabled).find(c => c.backendNames.includes(backendName));
};

// Find chain config by chain ID
export const findChainConfigByChainId = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS.filter(c => c.enabled).find(c => c.chain.id === chainId);
};

// Get block explorer URL for a transaction
export const getBlockExplorerUrl = (networkName: string, txHash: string): string | null => {
  const chainConfig = findChainConfigByBackendName(networkName);
  if (!chainConfig) return null;
  return `${chainConfig.blockExplorer}/tx/${txHash}`;
};
