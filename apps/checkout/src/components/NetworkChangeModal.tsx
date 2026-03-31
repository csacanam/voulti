import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Check } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../config/chains';
import { useAccount } from 'wagmi';

interface NetworkChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNetworkChange: (chainId: number) => void;
}

export const NetworkChangeModal: React.FC<NetworkChangeModalProps> = ({
  isOpen,
  onClose,
  onNetworkChange
}) => {
  const { t } = useLanguage();
  const { chainId: currentChainId } = useAccount();

  if (!isOpen) return null;

  const handleNetworkChange = async (targetChainId: number) => {
    try {
      onNetworkChange(targetChainId);
      onClose();
    } catch (error) {
      // silently ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {t.wallet?.changeNetwork || 'Cambiar red'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-gray-600 text-sm">
            {t.wallet?.selectNetwork || 'Selecciona una red compatible:'}
          </p>

          {SUPPORTED_CHAINS
            .filter(config => config.enabled)
            .map(config => {
              const isCurrentNetwork = currentChainId === config.chain.id;

              return (
                <div
                  key={config.chain.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer
                    ${isCurrentNetwork
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-300'
                    }
                  `}
                  onClick={() => !isCurrentNetwork && handleNetworkChange(config.chain.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="font-medium">{config.chain.name}</div>
                      <div className="text-xs text-gray-400">
                        {config.chain.testnet ? 'Testnet' : 'Mainnet'}
                      </div>
                    </div>
                  </div>

                  {isCurrentNetwork && (
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">
                        {t.wallet?.currentNetwork || 'Actual'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
