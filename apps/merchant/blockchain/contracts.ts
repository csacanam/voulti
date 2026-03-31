/**
 * DerampProxy contract addresses per network.
 * Production addresses hardcoded. Override with env vars for testing.
 */

export const PROXY_ADDRESSES: Record<string, string> = {
  celo: process.env.NEXT_PUBLIC_CELO_PROXY_ADDRESS || "0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1",
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_PROXY_ADDRESS || "0xf8553C9Df40057b2920A245637B8C0581EC75767",
  polygon: process.env.NEXT_PUBLIC_POLYGON_PROXY_ADDRESS || "0xc7F4313179532680Fc731DAD955221e901A582D9",
  base: process.env.NEXT_PUBLIC_BASE_PROXY_ADDRESS || "0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95",
  bsc: process.env.NEXT_PUBLIC_BSC_PROXY_ADDRESS || "0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F",
  ...(process.env.NEXT_PUBLIC_HARDHAT_PROXY_ADDRESS ? {
    hardhat: process.env.NEXT_PUBLIC_HARDHAT_PROXY_ADDRESS,
  } : {}),
}

export const DERAMP_PROXY_ABI = [
  "function withdrawTo(address token, uint256 amount, address to) external",
] as const
