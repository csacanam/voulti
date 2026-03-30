import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { NETWORKS } from '../config/chains';

export interface NetworkInfo {
  chainId: number;
  name: string;
  isCorrect: boolean;
  isSupported: boolean;
  expectedChainId: number;
  expectedName: string;
}

export const useNetworkDetection = (expectedNetworkName: string = 'Celo') => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Get expected network info
  const expectedNetwork = useMemo(() => {
    return NETWORKS[expectedNetworkName as keyof typeof NETWORKS];
  }, [expectedNetworkName]);

  // Check if current network is correct
  const isCorrectNetwork = useMemo(() => {
    if (!expectedNetwork || !chainId) return false;
    return chainId === expectedNetwork.chainId;
  }, [expectedNetwork, chainId]);

  // Enhanced network detection with wallet polling
  const detectNetwork = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !walletClient) return;

    try {
      setIsRefreshing(true);

      // Get network info from wallet directly
      const walletChainId = await walletClient.request({ method: 'eth_chainId' });
      const walletChainIdDecimal = parseInt(walletChainId, 16);
      
      // Get accounts to verify connection
      const accounts = await walletClient.request({ method: 'eth_accounts' });
      
      // Determine which chain ID to use (prioritize wallet response)
      const actualChainId = walletChainIdDecimal || chainId;
      
      const networkInfo: NetworkInfo = {
        chainId: actualChainId,
        name: getNetworkName(actualChainId),
        isCorrect: actualChainId === expectedNetwork?.chainId,
        isSupported: !!NETWORKS[getNetworkName(actualChainId) as keyof typeof NETWORKS],
        expectedChainId: expectedNetwork?.chainId || 0,
        expectedName: expectedNetwork?.name || 'Unknown',
      };

      setNetworkInfo(networkInfo);
      setLastRefresh(new Date());

    } catch (error) {
      
      // Fallback to wagmi chainId
      const fallbackInfo: NetworkInfo = {
        chainId: chainId || 0,
        name: getNetworkName(chainId || 0),
        isCorrect: chainId === expectedNetwork?.chainId,
        isSupported: !!NETWORKS[getNetworkName(chainId || 0) as keyof typeof NETWORKS],
        expectedChainId: expectedNetwork?.chainId || 0,
        expectedName: expectedNetwork?.name || 'Unknown',
      };
      
      setNetworkInfo(fallbackInfo);
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected, walletClient, chainId, expectedNetwork]);

  // Auto-detect network when connection changes
  useEffect(() => {
    if (isConnected && walletClient) {
      detectNetwork();
    }
  }, [isConnected, walletClient, detectNetwork]);

  // Listen to MetaMask network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (chainId: string) => {
      // Small delay to let wagmi update
      setTimeout(() => detectNetwork(true), 100);
    };

    const handleAccountsChanged = (accounts: string[]) => {
      // Small delay to let wagmi update
      setTimeout(() => detectNetwork(true), 100);
    };

    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [detectNetwork]);

  // Manual refresh function
  const refreshNetwork = useCallback(() => {
    detectNetwork(true);
  }, [detectNetwork]);

  return {
    networkInfo,
    isCorrectNetwork,
    isRefreshing,
    lastRefresh,
    refreshNetwork,
    detectNetwork,
  };
};

// Helper function to get network name from chain ID
function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 42220:
      return 'Celo';
    case 42161:
      return 'Arbitrum One';
    case 137:
      return 'Polygon';
    case 8453:
      return 'Base';
    case 56:
      return 'BNB Smart Chain';
    default:
      return 'unknown';
  }
}
