/**
 * Token Configuration — verified on-chain 2026-03-30
 */

export interface TokenConfig {
  address: string
  symbol: string
  name: string
  decimals: number
  network: string
  chainId: number
}

export const SUPPORTED_TOKENS: TokenConfig[] = [
  // Celo
  { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", symbol: "USDC", name: "USD Coin", decimals: 6, network: "celo", chainId: 42220 },
  { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", symbol: "USDT", name: "Tether USD", decimals: 6, network: "celo", chainId: 42220 },
  { address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA", symbol: "COPm", name: "Mento Colombian Peso", decimals: 18, network: "celo", chainId: 42220 },
  // Arbitrum
  { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, network: "arbitrum", chainId: 42161 },
  { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USD₮0", name: "Tether Zero", decimals: 6, network: "arbitrum", chainId: 42161 },
  // Polygon
  { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, network: "polygon", chainId: 137 },
  { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT0", name: "Tether Zero", decimals: 6, network: "polygon", chainId: 137 },
  // Base
  { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, network: "base", chainId: 8453 },
  // BSC
  { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, network: "bsc", chainId: 56 },
  { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, network: "bsc", chainId: 56 },
]

export function getTokensByNetwork(network: string): TokenConfig[] {
  return SUPPORTED_TOKENS.filter((t) => t.network === network)
}

export function getTokenByAddress(address: string, network: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase() && t.network === network
  )
}
