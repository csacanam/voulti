// services/depositService.ts

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000';

export interface GenerateDepositRequest {
  invoiceId: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  expectedAmount: string;
}

export interface DepositData {
  address: string;
  network: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  expectedAmount: string;
  expiresAt: string | null;
  status: string;
}

export interface DepositStatusData {
  invoiceStatus: string;
  deposits: Array<{
    id: string;
    address: string;
    network: string;
    status: string;
    expected_amount: string;
    detected_amount: string | null;
    token_symbol: string;
    pay_invoice_tx_hash: string | null;
  }>;
}

export interface DepositError extends Error {
  code?: string;
}

export interface NetworkAvailability {
  network: string;
  chainId: number;
  depositEnabled: boolean;
}

export const depositService = {
  /**
   * Networks whose hot wallet can still fund a sweep.
   *
   * Returns null — not an empty list — when the check itself fails, so callers
   * can tell "every network is out of gas" apart from "we could not ask". The
   * two must not collapse into the same UI, or one failed request leaves a
   * payer staring at a checkout with no way to pay at all.
   */
  async getNetworkAvailability(): Promise<NetworkAvailability[] | null> {
    try {
      const res = await fetch(`${API_URL}/deposit/networks`);
      if (!res.ok) return null;

      const data = await res.json();
      return Array.isArray(data?.data) ? data.data : null;
    } catch {
      return null;
    }
  },

  async generateAddress(params: GenerateDepositRequest): Promise<DepositData> {
    const res = await fetch(`${API_URL}/deposit/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to generate deposit address') as DepositError;
      // Carried through so the UI can show a translated message instead of the
      // API's English one — the payer picked this network and needs to be told
      // to pick another, in their own language.
      error.code = err.code;
      throw error;
    }

    const data = await res.json();
    return data.data;
  },

  async getStatus(invoiceId: string): Promise<DepositStatusData> {
    const res = await fetch(`${API_URL}/deposit/status/${invoiceId}`);

    if (!res.ok) {
      throw new Error('Failed to fetch deposit status');
    }

    const data = await res.json();
    return data.data;
  },
};
