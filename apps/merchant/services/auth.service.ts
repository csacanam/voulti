/**
 * Authentication Service
 * Handles commerce registration and retrieval
 */

import { apiClient } from "./api"
import { API_ENDPOINTS } from "./config"

export interface CommerceData {
  wallet: string
  name: string
  currency?: string
}

export interface Commerce {
  commerce_id: string
  name: string
  wallet: string
  spread: number
  currency: string
  currencySymbol: string
  description_spanish: string
  description_english: string
  minAmount: number
  maxAmount: number
  icon_url: string | null
  confirmation_url: string | null
  confirmation_email: string
  created_at: string
}

export interface CommerceResponse {
  success: boolean
  data: Commerce
}

export const authService = {
  async getCommerce(wallet: string): Promise<Commerce> {
    const endpoint = API_ENDPOINTS.COMMERCES.GET_BY_WALLET(wallet)
    const response = await apiClient.get<CommerceResponse>(endpoint)
    return response.data
  },

  async registerCommerce(data: CommerceData): Promise<Commerce> {
    const endpoint = API_ENDPOINTS.COMMERCES.CREATE
    const response = await apiClient.post<CommerceResponse>(endpoint, data)
    return response.data
  },
}
