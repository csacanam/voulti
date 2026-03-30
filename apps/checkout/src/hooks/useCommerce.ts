import { useState, useEffect } from 'react';
import { getCommerce, CommerceResponse, CommerceData } from '../services/commerceService';

export const useCommerce = (commerceId: string) => {
  const [commerce, setCommerce] = useState<CommerceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommerce = async () => {
      if (!commerceId) {
        setError('Commerce ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response: CommerceResponse = await getCommerce(commerceId);

        if (!response.success || !response.data) {
          setError(response.error || 'Failed to load commerce information');
          setCommerce(null);
        } else {
          setCommerce(response.data);
          setError(null);
        }
      } catch (err) {
        console.error('Error in useCommerce:', err);
        setError('Failed to load commerce information');
        setCommerce(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCommerce();
  }, [commerceId]);

  return { commerce, loading, error };
}; 