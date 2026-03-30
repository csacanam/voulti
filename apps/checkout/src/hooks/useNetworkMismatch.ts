import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface UseNetworkMismatchProps {
  selectedNetwork?: number;
}

interface UseNetworkMismatchReturn {
  hasMismatch: boolean;
  expectedNetwork: string;
  currentNetwork: string;
  isSwitching: boolean;
  switchToCorrectNetwork: () => Promise<void>;
}

export const useNetworkMismatch = ({ selectedNetwork }: UseNetworkMismatchProps): UseNetworkMismatchReturn => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [isSwitching, setIsSwitching] = useState(false);

  // Get network names for display
  const getNetworkName = useCallback((chainId: number): string => {
    switch (chainId) {
      case 42220: return 'Celo';
      case 42161: return 'Arbitrum One';
      case 137: return 'Polygon';
      case 8453: return 'Base';
      case 56: return 'BNB Smart Chain';
      default: return `Chain ID ${chainId}`;
    }
  }, []);

  // Check if there's a network mismatch - calculate directly without useCallback
  const hasMismatch = (() => {
    if (!isConnected || !chainId || !selectedNetwork) {
      return false; // No mismatch if not connected or no network selected
    }
    
    const mismatch = chainId !== selectedNetwork;
    return mismatch;
  })();

  // Switch to the correct network
  const switchToCorrectNetwork = useCallback(async (): Promise<void> => {
    if (!selectedNetwork || !isConnected) return;

    try {
      setIsSwitching(true);

      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }

      const ethereum = window.ethereum as any;

      try {
        // Try to switch to the network
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${selectedNetwork.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If the network doesn't exist, add it
        if (switchError.code === 4902) {
          const networkConfig = getNetworkConfig(selectedNetwork);
          if (networkConfig) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          }
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('❌ Error switching network:', error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [selectedNetwork, isConnected]);

  // Get network configuration for adding new networks
  const getNetworkConfig = useCallback((chainId: number) => {
    switch (chainId) {
      case 42220: // Celo
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: 'Celo',
          nativeCurrency: {
            name: 'CELO',
            symbol: 'CELO',
            decimals: 18,
          },
          rpcUrls: ['https://forno.celo.org'],
          blockExplorerUrls: ['https://celoscan.io'],
        };
      case 42161: // Arbitrum One
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: 'Arbitrum One',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io'],
        };
      case 137: // Polygon
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: 'Polygon',
          nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
          },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        };
      case 8453: // Base
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org'],
        };
      case 56: // BNB Smart Chain
        return {
          chainId: `0x${chainId.toString(16)}`,
          chainName: 'BNB Smart Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
          rpcUrls: ['https://bsc-dataseed.binance.org'],
          blockExplorerUrls: ['https://bscscan.com'],
        };
      default:
        return null;
    }
  }, []);

  return {
    hasMismatch: hasMismatch,
    expectedNetwork: selectedNetwork ? getNetworkName(selectedNetwork) : '',
    currentNetwork: chainId ? getNetworkName(chainId) : '',
    isSwitching,
    switchToCorrectNetwork,
  };
};
