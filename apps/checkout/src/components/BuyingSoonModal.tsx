import React from 'react';
import { ShoppingCart, X, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { interpolate } from '../utils/i18n';

interface BuyingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
}

export const BuyingSoonModal: React.FC<BuyingSoonModalProps> = ({
  isOpen,
  onClose,
  tokenSymbol
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden max-w-md w-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            {t.tokens?.buyingSoon || 'Coming Soon'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-400">
                {interpolate(t.tokens?.buyingSoon || 'Function to buy {symbol} coming soon', { symbol: tokenSymbol })}
              </h3>
              
              <p className="text-gray-300">
                {interpolate(t.tokens?.buyingSoon || 'We are working on adding the ability to buy {symbol} directly in the app. Stay tuned!', { symbol: tokenSymbol })}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {t.payment?.close || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
