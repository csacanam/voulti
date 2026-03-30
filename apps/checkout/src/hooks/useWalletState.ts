import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isDetecting: boolean;
  lastUpdate: Date;
  walletType: 'metamask' | 'coinbase' | 'rainbow' | 'trust' | 'phantom' | 'unknown';
}

export interface WalletActions {
  disconnect: () => void;
  refreshState: () => void;
  setWalletType: (type: WalletState['walletType']) => void;
}

export const useWalletState = (): WalletState & WalletActions => {
  const { isConnected: wagmiConnected, address: wagmiAddress, chainId: wagmiChainId } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isDetecting: true,
    lastUpdate: new Date(),
    walletType: 'unknown'
  });

  // Detect wallet type
  const detectWalletType = useCallback((): WalletState['walletType'] => {
    if (!window.ethereum) return 'unknown';
    
    const ethereum = window.ethereum as any;
    if (ethereum.isMetaMask) return 'metamask';
    if (ethereum.isCoinbaseWallet) return 'coinbase';
    if (ethereum.isRainbow) return 'rainbow';
    if (ethereum.isTrust) return 'trust';
    if (ethereum.isPhantom) return 'phantom';
    
    return 'unknown';
  }, []);

  // Update state with consistency checks
  const updateState = useCallback((newState: Partial<WalletState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState, lastUpdate: new Date() };
      
      return updated;
    });
  }, []);

  // Refresh state manually
  const refreshState = useCallback(() => {
    updateState({ isDetecting: true });
    
    // Force a re-evaluation
    setTimeout(() => {
      updateState({ isDetecting: false });
    }, 100);
  }, [updateState]);

  // Enhanced disconnect with state cleanup
  const disconnect = useCallback(() => {
    try {
      wagmiDisconnect();
      
      // Clear local state immediately
      updateState({
        isConnected: false,
        address: null,
        chainId: null,
        walletType: 'unknown'
      });
      
      // Clear any persistent data
      localStorage.removeItem('wagmi');
      localStorage.removeItem('walletconnect');
      sessionStorage.clear();
      
    } catch (error) {
      // silently ignore
    }
  }, [wagmiDisconnect, updateState]);

  // Main state synchronization effect
  useEffect(() => {
    const walletType = detectWalletType();
    
    // Enhanced validation: check both Wagmi and window.ethereum
    const ethereum = window.ethereum as any;
    const ethereumConnected = ethereum?.selectedAddress && ethereum?.chainId;
    
    // Ensure we have valid data before updating
    const isValidState = wagmiAddress && wagmiChainId;
    
    // Determine the real connection state
    let finalConnected = false;
    let finalAddress = null;
    let finalChainId = null;
    
    if (wagmiConnected && isValidState) {
      // Wagmi says connected and has valid data
      finalConnected = true;
      finalAddress = wagmiAddress;
      finalChainId = wagmiChainId;
    } else if (ethereumConnected) {
      // Wagmi not connected but ethereum is - sync the state
      finalConnected = true;
      finalAddress = ethereum.selectedAddress;
      finalChainId = parseInt(ethereum.chainId, 16);
    }

    updateState({
      isConnected: finalConnected,
      address: finalAddress,
      chainId: finalChainId,
      isDetecting: false,
      walletType
    });
    
  }, [wagmiConnected, wagmiAddress, wagmiChainId, detectWalletType, updateState]);

  // Additional validation: cross-check with window.ethereum
  useEffect(() => {
    if (!window.ethereum) return;
    
    const ethereum = window.ethereum as any;
    
    // If Wagmi says connected but ethereum doesn't, there's a mismatch
    if (wagmiConnected && (!ethereum.selectedAddress || !ethereum.chainId)) {
      // Force a refresh to resolve the mismatch
      setTimeout(() => {
        refreshState();
      }, 1000);
    }
  }, [wagmiConnected, refreshState]);

  // Set wallet type manually
  const setWalletType = useCallback((type: WalletState['walletType']) => {
    updateState({ walletType: type });
  }, [updateState]);

  return {
    ...state,
    disconnect,
    refreshState,
    setWalletType
  };
};
