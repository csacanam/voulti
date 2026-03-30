import { InvoiceResponse } from '../types/invoice';

export interface CreateInvoiceRequest {
  commerce_id: string;
  amount_fiat: number;
}

export interface CreateInvoiceResponse {
  success: boolean;
  data?: {
    id: string;
    commerce_id: string;
    amount_fiat: number;
    fiat_currency: string;
    status: string;
    expires_at: string | null;
    created_at: string;
  };
  error?: string;
}

export const createInvoice = async (request: CreateInvoiceRequest): Promise<CreateInvoiceResponse> => {
  try {
    // Use proxy in development, direct URL in production
    const baseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || '');

    const response = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to create invoice'
      };
    }

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
};

export const getInvoice = async (invoiceId: string): Promise<InvoiceResponse> => {
  try {
    // Use proxy in development, direct URL in production
    const baseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || '');

    // Make API call to backend
    const response = await fetch(`${baseUrl}/api/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Invoice not found' };
      }
      if (response.status >= 500) {
        return { error: 'Server error. Please try again later.' };
      }
      return { error: `Request failed with status ${response.status}` };
    }

    // Parse and return response
    const data = await response.json();
    return data;

  } catch (error) {
    // Handle network errors
    console.error('Error fetching invoice:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Network error. Please check your connection and try again.' };
    }
    
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};