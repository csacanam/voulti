// src/blockchain/config/contracts.ts
// Contract addresses are populated after deployment to each network.
// Use placeholder values until contracts are deployed.

// Contract addresses populated after deployment.
// For local testing, use the setup-local script which auto-generates these.
export const CONTRACTS: Record<string, {
  DERAMP_PROXY: string;
  DERAMP_STORAGE: string;
  ACCESS_MANAGER: string;
  INVOICE_MANAGER: string;
  PAYMENT_PROCESSOR: string;
}> = {
  hardhat: {
    DERAMP_PROXY: process.env.HARDHAT_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.HARDHAT_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.HARDHAT_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.HARDHAT_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.HARDHAT_PAYMENT_PROCESSOR_ADDRESS || "",
  },
  celo: {
    DERAMP_PROXY: process.env.CELO_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.CELO_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.CELO_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.CELO_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.CELO_PAYMENT_PROCESSOR_ADDRESS || "",
  },
  arbitrum: {
    DERAMP_PROXY: process.env.ARBITRUM_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.ARBITRUM_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.ARBITRUM_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.ARBITRUM_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.ARBITRUM_PAYMENT_PROCESSOR_ADDRESS || "",
  },
  polygon: {
    DERAMP_PROXY: process.env.POLYGON_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.POLYGON_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.POLYGON_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.POLYGON_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.POLYGON_PAYMENT_PROCESSOR_ADDRESS || "",
  },
  base: {
    DERAMP_PROXY: process.env.BASE_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.BASE_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.BASE_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.BASE_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.BASE_PAYMENT_PROCESSOR_ADDRESS || "",
  },
  bsc: {
    DERAMP_PROXY: process.env.BSC_PROXY_ADDRESS || "",
    DERAMP_STORAGE: process.env.BSC_STORAGE_ADDRESS || "",
    ACCESS_MANAGER: process.env.BSC_ACCESS_MANAGER_ADDRESS || "",
    INVOICE_MANAGER: process.env.BSC_INVOICE_MANAGER_ADDRESS || "",
    PAYMENT_PROCESSOR: process.env.BSC_PAYMENT_PROCESSOR_ADDRESS || "",
  },
};
