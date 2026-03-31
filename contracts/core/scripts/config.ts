// Token addresses to whitelist per network — ALL VERIFIED ON-CHAIN
export const TOKENS_BY_NETWORK: Record<string, string[]> = {
  celo: [
    "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // USDC (Circle native, 6 decimals)
    "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", // USDT (Tether official, 6 decimals)
    "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", // COPm (Mento Colombian Peso, 18 decimals)
  ],
  arbitrum: [
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC (Circle native, 6 decimals)
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USD₮0 (Tether Zero, 6 decimals)
  ],
  polygon: [
    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC (Circle native, 6 decimals)
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT0 (Tether Zero, 6 decimals)
  ],
  base: [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (Circle native, 6 decimals)
  ],
  bsc: [
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC (Binance-Peg, 18 decimals)
    "0x55d398326f99059fF775485246999027B3197955", // USDT (Binance-Peg BSC-USD, 18 decimals)
  ],
};

// Fallback for backward compatibility
export const PRODUCTION_TOKENS = TOKENS_BY_NETWORK.celo;

// Internal validation constants
export const VALIDATION = {
  EMPTY_ADDRESS: "0x0000000000000000000000000000000000000000",
};
