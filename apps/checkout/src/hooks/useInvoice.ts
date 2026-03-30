import { useState, useEffect, useCallback } from 'react';
import { Invoice, InvoiceError } from '../types/invoice';
import { getInvoice } from '../services/invoiceService';

interface UseInvoiceReturn {
  invoice: Invoice | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export const useInvoice = (invoiceId: string): UseInvoiceReturn => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getInvoice(invoiceId);
      
      if ('error' in response) {
        setError(response.error);
        setInvoice(null);
      } else {
        setInvoice(response);
        setError(null);
      }
    } catch (err) {
      setError('Error al cargar la orden');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, fetchInvoice]);

  const refetch = useCallback(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [fetchInvoice, invoiceId]);

  return { invoice, error, loading, refetch };
};