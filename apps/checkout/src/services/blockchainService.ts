import { BlockchainStatusResponse, BlockchainCreateRequest, BlockchainCreateResponse } from '../blockchain/types';

// Use proxy in development, full URL in production
const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : import.meta.env.VITE_BACKEND_URL;

if (!import.meta.env.DEV && !import.meta.env.VITE_BACKEND_URL) {
  console.error('VITE_BACKEND_URL environment variable is not configured');
}

// Debug logging
console.log('🔍 BlockchainService Config:', {
  isDev: import.meta.env.DEV,
  baseUrl,
  backendUrl: import.meta.env.VITE_BACKEND_URL,
  timestamp: new Date().toISOString()
});

export class BlockchainService {
  static async getStatus(invoiceId: string, chainId: number): Promise<BlockchainStatusResponse> {
    try {
      const url = `${baseUrl}/api/blockchain/status/${invoiceId}?chainId=${chainId}`;
      console.log('🌐 BlockchainService.getStatus - Making request to:', url);
      console.log('🌐 Base URL:', baseUrl);
      console.log('🌐 Invoice ID:', invoiceId);
      console.log('🌐 Chain ID:', chainId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🌐 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ getStatus success, data:', data);
      return data;
    } catch (error) {
      console.error('❌ getStatus error:', error);
      throw error;
    }
  }

  static async createInvoice(request: BlockchainCreateRequest): Promise<BlockchainCreateResponse> {
    try {
      const response = await fetch(`${baseUrl}/api/blockchain/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating blockchain invoice:', error);
      throw error;
    }
  }

  static async updatePaymentData(
    invoiceId: string, 
    paymentData: {
      paid_token: string;
      paid_network: string;
      paid_tx_hash: string;
      wallet_address: string;
      paid_amount: number; // Backend expects number, not string
    }
  ): Promise<any> {
    try {
      const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}/payment-data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating payment data:', error);
      throw error;
    }
  }


} 