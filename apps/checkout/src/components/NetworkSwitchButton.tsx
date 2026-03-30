import React, { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetworkDetection } from '../hooks/useNetworkDetection';
import { findChainConfigByChainId } from '../config/chains';

interface NetworkSwitchButtonProps {
  targetChainId: number;
  onSwitch?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const NetworkSwitchButton: React.FC<NetworkSwitchButtonProps> = ({
  targetChainId,
  onSwitch,
  onError,
  className = '',
}) => {
  const { data: walletClient } = useWalletClient();
  const { t } = useLanguage();
  const [isSwitching, setIsSwitching] = useState(false);

  const targetChainConfig = findChainConfigByChainId(targetChainId);
  const expectedBackendName = targetChainConfig?.backendNames?.[0] || 'Celo';
  const targetChainName = targetChainConfig?.chain.name || `Chain ID ${targetChainId}`;
  const targetNativeCurrency = targetChainConfig?.nativeCurrency || {
    name: 'Native Token',
    symbol: 'NATIVE',
    decimals: 18,
  };
  const targetRpcUrls = targetChainConfig?.rpcUrls || [];
  const targetExplorerUrl = targetChainConfig?.blockExplorer || '';
  
  // Use our enhanced network detection
  const { networkInfo } = useNetworkDetection(expectedBackendName);

  const handleSwitchNetwork = async () => {
    try {
      setIsSwitching(true);

      if (!walletClient) {
        throw new Error('No wallet client available');
      }

      // Convert chainId to hex
      const chainIdHex = `0x${targetChainId.toString(16)}`;

      await walletClient.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      // Call success callback
      onSwitch?.();
      
      // Refresh network detection instead of reloading page
      setTimeout(() => {
        // refreshNetwork(); // This line is removed
      }, 500);
      
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === 4902) {
        // Chain not added to wallet, try to add it
        try {
          await walletClient?.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: targetChainName,
              nativeCurrency: targetNativeCurrency,
              rpcUrls: targetRpcUrls.length > 0 ? targetRpcUrls : ['https://example-rpc.invalid'],
              blockExplorerUrls: targetExplorerUrl ? [targetExplorerUrl] : [],
            }],
          });
          // Refresh network detection
          setTimeout(() => {
            // refreshNetwork(); // This line is removed
          }, 500);
          
        } catch (addError) {
          onError?.(
            t.network?.addNetworkError ||
            `Unable to add ${targetChainName}. Please add it manually in your wallet.`
          );
        }
      } else if (error.code === 4001) {
        // User rejected the request
        onError?.(
          t.network?.switchCancelled ||
          'Network change cancelled by the user.'
        );
      } else {
        onError?.(
          t.network?.switchError ||
          `Failed to switch network. Please switch to ${targetChainName} manually in your wallet.`
        );
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // Show current network status
  const getNetworkStatusText = () => {
    if (!networkInfo) return t.network?.detecting || 'Detecting network...';
    
    if (networkInfo.isCorrect) {
      return `✅ ${t.network?.connectedTo || 'Connected to'} ${networkInfo.expectedName}`;
    }
    
    if (networkInfo.isSupported) {
      return `⚠️ ${t.network?.wrongNetwork || 'Wrong network'}: ${networkInfo.name} (ID: ${networkInfo.chainId})`;
    }
    
    return `❌ ${t.network?.unsupported || 'Unsupported network'} (ID: ${networkInfo.chainId})`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Network Status Display */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">
            {t.network?.status || 'Network Status'}
          </h3>
        </div>
        
        <div className="text-sm text-gray-300 mb-3">
          {getNetworkStatusText()}
        </div>
        
        {networkInfo && !networkInfo.isCorrect && (
          <div className="text-xs text-gray-400 space-y-1">
            <div>
              {t.network?.expected || 'Expected network'}: {networkInfo.expectedName} (ID: {networkInfo.expectedChainId})
            </div>
            <div>
              {t.network?.current || 'Current network'}: {networkInfo.name} (ID: {networkInfo.chainId})
            </div>
          </div>
        )}
      </div>

      {/* Switch Network Button - only show if not on correct network */}
      {networkInfo && !networkInfo.isCorrect && (
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitching}
          className={`
            w-full px-4 py-3 font-medium rounded-lg transition-colors
            ${isSwitching 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
            }
            flex items-center justify-center space-x-2
          `}
        >
          <svg className={`w-5 h-5 ${isSwitching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>
            {isSwitching 
              ? (t.network?.switching || 'Switching network...') 
              : `${t.network?.switchTo || 'Switch to'} ${networkInfo.expectedName || targetChainName}`
            }
          </span>
        </button>
      )}

      {/* Success message when on correct network */}
      {networkInfo && networkInfo.isCorrect && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 text-center">
          <div className="text-green-400 text-sm font-medium">
            ✅ {t.network?.connected || 'Connected to the correct network'}
          </div>
        </div>
      )}
    </div>
  );
}; 