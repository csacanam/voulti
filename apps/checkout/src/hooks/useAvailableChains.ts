import { useMemo } from 'react';
import { Chain } from 'wagmi/chains';
import { Token } from '../types/invoice';
import { getBackendNameToChainMap, getChainDebugInfo } from '../config/chains';

export const useAvailableChains = (tokens: Token[]) => {
  return useMemo(() => {
    const uniqueNetworks = Array.from(new Set(tokens.map(token => token.network)));
    const networkToChainMap = getBackendNameToChainMap();
    
    const availableChains = uniqueNetworks
      .map(network => {
        const chain = networkToChainMap[network];
        if (!chain) {
          const debugInfo = getChainDebugInfo(network);
          console.warn(`⚠️ Unknown network: "${network}".`, debugInfo);
        }
        return chain;
      })
      .filter((chain): chain is Chain => chain !== undefined);
    
    return availableChains;
  }, [tokens]);
}; 