import { useEffect, useState } from 'react';
import { depositService } from '../services/depositService';

/**
 * Which chain IDs can currently accept a pay-by-address deposit.
 *
 * `null` means the answer is unknown — the request failed, or has not come
 * back yet. Callers must treat that as "show everything", never as "show
 * nothing": the check exists to steer payers away from a network that would
 * strand their money, and a checkout that offers no networks at all because
 * one fetch failed is worse than the problem it is guarding against.
 */
export function useNetworkAvailability() {
  const [unavailableChainIds, setUnavailableChainIds] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    depositService.getNetworkAvailability().then(networks => {
      if (cancelled || !networks) return;

      setUnavailableChainIds(
        networks.filter(n => !n.depositEnabled).map(n => n.chainId)
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    unavailableChainIds,
    isUnavailable: (chainId: number) => unavailableChainIds?.includes(chainId) ?? false,
  };
}
