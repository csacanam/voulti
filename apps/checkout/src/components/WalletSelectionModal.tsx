import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MetaMaskLogo, BaseLogo } from '../assets/walletLogos';

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleWalletSelect = (walletType: 'metamask' | 'base') => {
    const currentUrl = window.location.href;

    if (walletType === 'metamask') {
      const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
      const metamaskUrl = `https://metamask.app.link/dapp/${cleanUrl}`;
      window.open(metamaskUrl, '_blank');
    } else if (walletType === 'base') {
      const baseUrl = `cbwallet://dapp?url=${encodeURIComponent(currentUrl)}`;
      window.location.href = baseUrl;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-white mb-5">
          {t.wallet?.selectWallet || 'Select Wallet'}
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => handleWalletSelect('metamask')}
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-orange-500/50 hover:bg-gray-800/80 transition-all flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <MetaMaskLogo size={32} />
            </div>
            <span className="text-white font-medium">MetaMask</span>
          </button>

          <button
            onClick={() => handleWalletSelect('base')}
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500/50 hover:bg-gray-800/80 transition-all flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <BaseLogo size={40} />
            </div>
            <span className="text-white font-medium">Base Wallet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
