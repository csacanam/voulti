/**
 * Payout Service
 * Handles payout history retrieval.
 * Note: Actual transfers are signed directly by the commerce wallet (withdrawTo on DerampProxy).
 */

import { apiClient } from "./api"

export interface Payout {
  id: string
  to_amount: number
  to_currency: string
  to_name: string
  to_email: string
  to_address: string | null
  status: string
  created_at: string
  claimed_at: string | null
}

export interface PayoutsResponse {
  payouts: Payout[]
}

// Keep for compatibility - simplified
export interface CreatePayoutData {
  commerce_id: string
  to_name: string
  to_email: string
  to_amount: number
}

export interface PayoutResponse {
  success: boolean
  data: Payout
}

export const payoutService = {
  async getPayouts(commerceId: string): Promise<Payout[]> {
    const endpoint = `/commerces/${commerceId}/payouts`
    const response = await apiClient.get<PayoutsResponse>(endpoint)
    return response.payouts
  },
}
