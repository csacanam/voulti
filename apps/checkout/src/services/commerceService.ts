export interface CommerceData {
  id: string;
  name: string;
  description_spanish?: string;
  description_english?: string;
  icon_url?: string;
  currency: string;
  currency_symbol: string;
  supported_tokens?: string[];
  min_amount?: number;
  max_amount?: number;
}

export interface CommerceResponse {
  success: boolean;
  data?: CommerceData;
  error?: string;
}

export const getCommerce = async (commerceId: string): Promise<CommerceResponse> => {
  try {
    // Use proxy in development, direct URL in production
    const baseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_BACKEND_URL || '');
    
    // Build the full URL
    const fullUrl = `${baseUrl}/api/commerces/${commerceId}`;
    
    // Make API call to backend
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Commerce not found' };
      }
      if (response.status >= 500) {
        return { success: false, error: 'Server error. Please try again later.' };
      }
      return { success: false, error: `Request failed with status ${response.status}` };
    }

    // Parse and return response
    const data = await response.json();
    return data;

  } catch (error) {
    // Handle network errors
    console.error('Error fetching commerce:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
    
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}; 