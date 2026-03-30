// hooks/useDepositPolling.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { depositService, type DepositStatusData } from '../services/depositService';

const POLL_INTERVAL = 5000;

interface UseDepositPollingResult {
  status: string | null;
  detectedAmount: string | null;
  txHash: string | null;
  invoiceStatus: string | null;
  isPolling: boolean;
  error: string | null;
}

export function useDepositPolling(invoiceId: string | null, enabled: boolean): UseDepositPollingResult {
  const [status, setStatus] = useState<string | null>(null);
  const [detectedAmount, setDetectedAmount] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!invoiceId) return;

    try {
      const data = await depositService.getStatus(invoiceId);
      setInvoiceStatus(data.invoiceStatus);

      if (data.deposits.length > 0) {
        const deposit = data.deposits[0]; // most recent
        setStatus(deposit.status);
        setDetectedAmount(deposit.detected_amount);
        setTxHash(deposit.pay_invoice_tx_hash);

        // Stop polling if terminal state
        if (['swept', 'failed', 'expired'].includes(deposit.status) || data.invoiceStatus === 'Paid') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsPolling(false);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!enabled || !invoiceId) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    poll(); // immediate first call

    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, [enabled, invoiceId, poll]);

  return { status, detectedAmount, txHash, invoiceStatus, isPolling, error };
}
