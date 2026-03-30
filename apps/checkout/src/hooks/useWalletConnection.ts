import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface WalletConnectionState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isDetecting: boolean;
  walletType: 'metamask' | 'coinbase' | 'rainbow' | 'trust' | 'phantom' | 'unknown';
  isConnecting: boolean;
  shouldAttemptConnection: boolean;
}

export interface WalletConnectionReturn extends WalletConnectionState {
  triggerConnection: () => void;
}

export const useWalletConnection = (): WalletConnectionReturn => {
  const { isConnected: wagmiConnected, address: wagmiAddress, chainId: wagmiChainId } = useAccount();
  const [state, setState] = useState<WalletConnectionState>({
    isConnected: false,
    address: null,
    chainId: null,
    isDetecting: true,
    walletType: 'unknown',
    isConnecting: false,
    shouldAttemptConnection: false
  });

  // Detect wallet type and connection status
  const detectWalletConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isDetecting: true }));

    try {
      // Check if ethereum is available
      if (!window.ethereum) {
        setState(prev => ({
          ...prev,
          isDetecting: false,
          isConnecting: false
        }));
        return;
      }

      // Detect wallet type
      let walletType: WalletConnectionState['walletType'] = 'unknown';
      if (window.ethereum.isMetaMask) walletType = 'metamask';
      else if (window.ethereum.isCoinbaseWallet) walletType = 'coinbase';
      else if (window.ethereum.isRainbow) walletType = 'rainbow';
      else if (window.ethereum.isTrust) walletType = 'trust';
      else if (window.ethereum.isPhantom) walletType = 'phantom';

      // Try to get connection status directly from wallet
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        const isConnected = accounts && accounts.length > 0;
        const address = isConnected ? accounts[0] : null;
        const chainIdDecimal = chainId ? parseInt(chainId, 16) : null;

        setState(prev => ({
          ...prev,
          isConnected,
          address,
          chainId: chainIdDecimal,
          isDetecting: false,
          isConnecting: false,
          shouldAttemptConnection: !isConnected && prev.shouldAttemptConnection
        }));

      } catch (error) {
        
        // Fallback to wagmi state
        setState(prev => ({
          ...prev,
          isConnected: wagmiConnected,
          address: wagmiAddress || null,
          chainId: wagmiChainId || null,
          isDetecting: false,
          isConnecting: false
        }));
      }

    } catch (error) {
      // Fallback to wagmi state
      setState(prev => ({
        ...prev,
        isConnected: wagmiConnected,
        address: wagmiAddress || null,
        chainId: wagmiChainId || null,
        isDetecting: false,
        isConnecting: false
      }));
    }
  }, [wagmiConnected, wagmiAddress, wagmiChainId]);

  // Attempt to connect to wallet
  const attemptConnection = useCallback(async () => {
    if (!window.ethereum || state.isConnected) return;

    try {
      setState(prev => ({ ...prev, isConnecting: true }));

      // Request accounts - this should trigger the connection flow
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
    } catch (error) {
      // silently ignore
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [state.isConnected]);

  // Listen to wallet events
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      detectWalletConnection();
    };

    const handleChainChanged = (chainId: string) => {
      detectWalletConnection();
    };

    const handleConnect = () => {
      detectWalletConnection();
    };

    const handleDisconnect = () => {
      detectWalletConnection();
    };

    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('connect', handleConnect);
    window.ethereum.on('disconnect', handleDisconnect);

    // Initial detection
    detectWalletConnection();

    return () => {
      // Remove event listeners
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('connect', handleConnect);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    };
  }, [detectWalletConnection]);

  // Auto-attempt connection when shouldAttemptConnection is true
  useEffect(() => {
    if (state.shouldAttemptConnection && !state.isConnected && !state.isConnecting) {
      attemptConnection();
    }
  }, [state.shouldAttemptConnection, state.isConnected, state.isConnecting, attemptConnection]);

  // Update state when wagmi changes
  useEffect(() => {
    if (!state.isDetecting) {
      setState(prev => ({
        ...prev,
        isConnected: wagmiConnected || prev.isConnected,
        address: wagmiAddress || prev.address,
        chainId: wagmiChainId || prev.chainId
      }));
    }
  }, [wagmiConnected, wagmiAddress, wagmiChainId, state.isDetecting]);

  // Function to trigger connection attempt (called from outside)
  const triggerConnection = useCallback(() => {
    setState(prev => ({ ...prev, shouldAttemptConnection: true }));
  }, []);

  return { ...state, triggerConnection };
};
