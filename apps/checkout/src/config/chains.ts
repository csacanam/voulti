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
      DERAMP_PROXY: import.meta.env.VITE_CELO_PROXY_ADDRESS || "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
      DERAMP_STORAGE: import.meta.env.VITE_CELO_STORAGE_ADDRESS || "0x7409D7b82259e3Ce652eD1e15890Ea8401aEEeDC",
      ACCESS_MANAGER: import.meta.env.VITE_CELO_ACCESS_MANAGER_ADDRESS || "0xd5aBA8310dC3fB5D0B22C8492222E5446EB1abe8",
      INVOICE_MANAGER: import.meta.env.VITE_CELO_INVOICE_MANAGER_ADDRESS || "0x3c46D60709145C6EC781D5FA2bc6A172eA7Af37A",
      PAYMENT_PROCESSOR: import.meta.env.VITE_CELO_PAYMENT_PROCESSOR_ADDRESS || "0x3C2f18E20E6E3cDFf1dAb14CcF3639e56Ed57421",
    },
    tokens: {
      USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT: { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", symbol: "USDT", name: "Tether USD", decimals: 6 },
      COPM: { address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", symbol: "COPm", name: "Mento Colombian Peso", decimals: 18 },
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
      DERAMP_PROXY: import.meta.env.VITE_ARBITRUM_PROXY_ADDRESS || "0xf8553C9Df40057b2920A245637B8C0581EC75767",
      DERAMP_STORAGE: import.meta.env.VITE_ARBITRUM_STORAGE_ADDRESS || "0xc7E192D0ec4953F4eb49cD7A489AD76c8c03E195",
      ACCESS_MANAGER: import.meta.env.VITE_ARBITRUM_ACCESS_MANAGER_ADDRESS || "0x19EA5d8DEd7CAD3f133516CAAC8620DD7003cE2E",
      INVOICE_MANAGER: import.meta.env.VITE_ARBITRUM_INVOICE_MANAGER_ADDRESS || "0x8bc1E1A71BDFA56cF8fC86282C3fb2e93202F847",
      PAYMENT_PROCESSOR: import.meta.env.VITE_ARBITRUM_PAYMENT_PROCESSOR_ADDRESS || "0x271101C3E1e97C93a38F6588914Dc409a5C7bf08",
    },
    tokens: {
      USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT0: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USD₮0", name: "Tether Zero", decimals: 6 },
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
      DERAMP_PROXY: import.meta.env.VITE_POLYGON_PROXY_ADDRESS || "0xc7F4313179532680Fc731DAD955221e901A582D9",
      DERAMP_STORAGE: import.meta.env.VITE_POLYGON_STORAGE_ADDRESS || "0xF96B7A8ef6480f8A83e71a563F83043625817290",
      ACCESS_MANAGER: import.meta.env.VITE_POLYGON_ACCESS_MANAGER_ADDRESS || "0x9dcB5c3ad14F58f53B2662c16e8FA3dDeE782e1D",
      INVOICE_MANAGER: import.meta.env.VITE_POLYGON_INVOICE_MANAGER_ADDRESS || "0xAd24bdAc4eE6681A01D2a5B93A2a8eeeA024C5Fc",
      PAYMENT_PROCESSOR: import.meta.env.VITE_POLYGON_PAYMENT_PROCESSOR_ADDRESS || "0x6368b0509a566478049e37e9C8dBfA596ad6eBA3",
    },
    tokens: {
      USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
      USDT0: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT0", name: "Tether Zero", decimals: 6 },
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
      DERAMP_PROXY: import.meta.env.VITE_BASE_PROXY_ADDRESS || "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
      DERAMP_STORAGE: import.meta.env.VITE_BASE_STORAGE_ADDRESS || "0x8734Cb91Bfe02Fd2De4abD8F2965447DF8d03987",
      ACCESS_MANAGER: import.meta.env.VITE_BASE_ACCESS_MANAGER_ADDRESS || "0x8cCb89B6b4B4218869B19F86a5CAC32076E2e834",
      INVOICE_MANAGER: import.meta.env.VITE_BASE_INVOICE_MANAGER_ADDRESS || "0xD3038EF4cC94BA00b8578379aB3cec15D1863a1a",
      PAYMENT_PROCESSOR: import.meta.env.VITE_BASE_PAYMENT_PROCESSOR_ADDRESS || "0xE2c5Da5A7e31621f30EaCe149f3d0A9f844e82F0",
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
      DERAMP_PROXY: import.meta.env.VITE_BSC_PROXY_ADDRESS || "0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F",
      DERAMP_STORAGE: import.meta.env.VITE_BSC_STORAGE_ADDRESS || "0xafCf44caFb5a654Eec2eD68B787910A357dec120",
      ACCESS_MANAGER: import.meta.env.VITE_BSC_ACCESS_MANAGER_ADDRESS || "0xA8F2F528B6987bD3F5188EB92673cC7228EC5696",
      INVOICE_MANAGER: import.meta.env.VITE_BSC_INVOICE_MANAGER_ADDRESS || "0x3f2CF115AE719f25Cf7c47097A89FfeB535cAe7A",
      PAYMENT_PROCESSOR: import.meta.env.VITE_BSC_PAYMENT_PROCESSOR_ADDRESS || "0x0132A3C3049D5697738278B397dd4C54855f2371",
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
