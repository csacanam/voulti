import React, { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useLanguage } from '../contexts/LanguageContext';
import { ConnectWalletButton } from './ConnectWalletButton';
import { NetworkChangeModal } from './NetworkChangeModal';
import { SUPPORTED_CHAINS } from '../config/chains';
import { Wallet, CheckCircle, Globe, LogOut, Copy, Check } from 'lucide-react';

interface WalletConnectionFlowProps {
  children: React.ReactNode;
  expectedNetwork?: string;
  className?: string;
  isInWalletApp?: boolean;
  onOpenWalletSelection?: () => void;
}

export const WalletConnectionFlow: React.FC<WalletConnectionFlowProps> = ({
  children,
  className = '',
  isInWalletApp = false,
  onOpenWalletSelection
}) => {
  const { isConnected, address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { t } = useLanguage();
  const [isNetworkChangeModalOpen, setIsNetworkChangeModalOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const isOnCompatibleNetwork = (): boolean => {
    if (!chainId) return false;
    return SUPPORTED_CHAINS.filter(c => c.enabled).some(c => c.chain.id === chainId);
  };

  const getCurrentNetworkInfo = () => {
    if (!chainId) return null;
    const config = SUPPORTED_CHAINS.filter(c => c.enabled).find(c => c.chain.id === chainId);
    return config ? { name: config.chain.name } : null;
  };

  const handleNetworkChange = async (targetChainId: number) => {
    if (!window.ethereum) return;

    const ethereum = window.ethereum as any;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        const targetChain = SUPPORTED_CHAINS.find(c => c.chain.id === targetChainId);
        if (targetChain) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: targetChain.chain.name,
              nativeCurrency: targetChain.chain.nativeCurrency,
              rpcUrls: targetChain.chain.rpcUrls.default.http,
              blockExplorerUrls: targetChain.chain.blockExplorers?.default.url
                ? [targetChain.chain.blockExplorers.default.url]
                : undefined,
            }],
          });
        }
      }
    }
  };

  // Step 1: Not connected
  if (!isConnected) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {t.wallet?.connectFirst || 'Connect your wallet'}
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            Connect your wallet to select a token and complete the payment.
          </p>

          {isInWalletApp ? (
            <ConnectWalletButton className="w-full max-w-sm mx-auto" />
          ) : (
            <button
              onClick={onOpenWalletSelection}
              className="w-full max-w-sm mx-auto px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              {t.payment?.connectWallet || 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Connected but wrong network
  if (!isOnCompatibleNetwork()) {
    const currentNetworkInfo = getCurrentNetworkInfo();

    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2 text-center">
            {t.wallet?.wrongNetwork || 'Switch network to continue'}
          </h2>
          <p className="text-sm text-gray-400 mb-5 text-center">
            {currentNetworkInfo
              ? `You're connected to ${currentNetworkInfo.name}, which is not supported. Please switch to a compatible network.`
              : 'Your current network is not supported. Please switch to a compatible network.'}
          </p>

          {/* Wallet info */}
          {address && (
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg mb-4">
              <span className="text-sm text-gray-300 font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Disconnect
              </button>
            </div>
          )}

          <button
            onClick={() => setIsNetworkChangeModalOpen(true)}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            {t.wallet?.changeNetwork || 'Switch Network'}
          </button>
        </div>

        <NetworkChangeModal
          isOpen={isNetworkChangeModalOpen}
          onClose={() => setIsNetworkChangeModalOpen(false)}
          onNetworkChange={handleNetworkChange}
        />
      </div>
    );
  }

  // Step 3: Connected and on compatible network
  const currentNetworkInfo = getCurrentNetworkInfo();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Wallet status bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 text-sm text-white font-mono hover:text-purple-300 transition-colors min-h-[32px]"
                  title="Copy address"
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                  {addressCopied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
                {currentNetworkInfo && (
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400 hidden sm:inline">
                    {currentNetworkInfo.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsNetworkChangeModalOpen(true)}
              className="px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors min-h-[36px]"
            >
              Switch
            </button>
            <button
              onClick={() => disconnect()}
              className="px-3 py-2 text-xs text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors min-h-[36px]"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <NetworkChangeModal
        isOpen={isNetworkChangeModalOpen}
        onClose={() => setIsNetworkChangeModalOpen(false)}
        onNetworkChange={handleNetworkChange}
      />

      {children}
    </div>
  );
};
