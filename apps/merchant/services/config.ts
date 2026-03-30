/**
 * API Configuration
 * Centralized configuration for backend API
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000/api",
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    "Content-Type": "application/json",
  },
} as const

export const API_ENDPOINTS = {
  // Commerce endpoints
  COMMERCES: {
    GET_BY_WALLET: (wallet: string) => `/commerces/by-wallet/${wallet}`,
    CREATE: "/commerces",
  },
  // Future endpoints
  PAYMENTS: {
    // CREATE_PAYMENT: "/payments",
    // GET_PAYMENT: (id: string) => `/payments/${id}`,
  },
  PAYOUTS: {
    CREATE_PAYOUT: "/payouts",
    GET_PAYOUTS: "/payouts",
  },
} as const

