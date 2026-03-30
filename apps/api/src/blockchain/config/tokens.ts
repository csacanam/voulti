// src/blockchain/config/tokens.ts

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface NetworkTokens {
  [key: string]: Token;
}

interface TokenConfig {
  [networkName: string]: NetworkTokens;
}

export const TOKENS: TokenConfig = {
  hardhat: {
    USDC: {
      address: process.env.HARDHAT_USDC_ADDRESS || "",
      symbol: "USDC",
      name: "Mock USDC",
      decimals: 6,
    },
    USDT: {
      address: process.env.HARDHAT_USDT_ADDRESS || "",
      symbol: "USDT",
      name: "Mock USDT",
      decimals: 6,
    },
  },
  celo: {
    USDC: {
      address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    USDT: {
      address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
    CUSD: {
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      symbol: "cUSD",
      name: "Celo Dollar",
      decimals: 18,
    },
    CCOP: {
      address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
      symbol: "cCOP",
      name: "Celo Colombian Peso",
      decimals: 18,
    },
    CREAL: {
      address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
      symbol: "cREAL",
      name: "Celo Brazilian Real",
      decimals: 18,
    },
    BRLA: {
      address: "0xfecb3f7c54e2caae9dc6ac9060a822d47e053760",
      symbol: "BRLA",
      name: "Brazilian Digital Real",
      decimals: 18,
    },
  },
  arbitrum: {
    USDC: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    USDT: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
  },
  polygon: {
    USDC: {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
    USDT: {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
    },
  },
  base: {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  },
  bsc: {
    USDC: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 18,
    },
    USDT: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 18,
    },
  },
};
