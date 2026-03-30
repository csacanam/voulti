/**
 * DerampProxy contract addresses per network.
 * Populated from env vars after deployment.
 */

export const PROXY_ADDRESSES: Record<string, string> = {
  hardhat: process.env.NEXT_PUBLIC_HARDHAT_PROXY_ADDRESS || "",
  celo: process.env.NEXT_PUBLIC_CELO_PROXY_ADDRESS || "",
  arbitrum: process.env.NEXT_PUBLIC_ARBITRUM_PROXY_ADDRESS || "",
  polygon: process.env.NEXT_PUBLIC_POLYGON_PROXY_ADDRESS || "",
  base: process.env.NEXT_PUBLIC_BASE_PROXY_ADDRESS || "",
  bsc: process.env.NEXT_PUBLIC_BSC_PROXY_ADDRESS || "",
}

export const DERAMP_PROXY_ABI = [
  "function withdrawTo(address token, uint256 amount, address to) external",
] as const
