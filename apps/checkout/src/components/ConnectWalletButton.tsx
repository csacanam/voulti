import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Wallet, AlertCircle } from 'lucide-react';
import { useConnect } from 'wagmi';

interface ConnectWalletButtonProps {
  selectedNetwork?: string;
  onConnected?: () => void;
  className?: string;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  onConnected,
  className = ''
}) => {
  const { connect, connectors, isPending } = useConnect();
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (isConnecting) return;

    if (!window.ethereum) {
      setError('No wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const ethereum = window.ethereum as any;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // MetaMask Mobile — use Wagmi connector
      if (ethereum.isMetaMask && isMobile) {
        const connector = connectors[0];
        if (!connector) throw new Error('No wallet connector available');
        await connect({ connector });
        onConnected?.();
        return;
      }

      // MetaMask Desktop — use direct connection
      if (ethereum.isMetaMask) {
        const existingAccounts = await ethereum.request({ method: 'eth_accounts' });

        if (existingAccounts?.length > 0) {
          onConnected?.();
          return;
        }

        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts?.length > 0) {
          onConnected?.();
        }
        return;
      }

      // Other wallets — use Wagmi
      const connector = connectors[0];
      if (!connector) throw new Error('No wallet connector available');
      await connect({ connector });
      onConnected?.();

    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected. Please try again.');
      } else if (err.message?.includes('already pending')) {
        setError('A connection request is already pending. Please check your wallet.');
        setTimeout(() => setIsConnecting(false), 2000);
        return;
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={connectWallet}
        disabled={isPending || isConnecting}
        className={`w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 ${className}`}
      >
        {isPending || isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5" />
            <span>{t.payment?.connectWallet || 'Connect Wallet'}</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};
