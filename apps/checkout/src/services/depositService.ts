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

export const depositService = {
  async generateAddress(params: GenerateDepositRequest): Promise<DepositData> {
    const res = await fetch(`${API_URL}/deposit/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate deposit address');
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
