import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Coins } from 'lucide-react';
import { GroupedToken } from '../types/invoice';
import { useLanguage } from '../contexts/LanguageContext';

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: GroupedToken[];
  selectedToken: GroupedToken | null;
  onTokenSelect: (token: GroupedToken) => void;
  currentChainId?: number;
}

export const TokenSelectionModal: React.FC<TokenSelectionModalProps> = ({
  isOpen,
  onClose,
  tokens,
  selectedToken,
  onTokenSelect,
  currentChainId
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Prevent body scroll when modal is open (standard solution for mobile scroll issues)
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      // Cleanup function to restore scroll
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Filter tokens by current network and search query
  const availableTokens = useMemo(() => {
    let filtered = currentChainId 
      ? tokens.filter(token => 
          token.networks.some(network => network.chain_id === currentChainId)
        )
      : tokens;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically by symbol
    return filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [tokens, currentChainId, searchQuery]);

  const handleTokenSelect = (token: GroupedToken) => {
    onTokenSelect(token);
    onClose();
    setSearchQuery(''); // Reset search when closing
  };

  const handleClose = () => {
    setSearchQuery(''); // Reset search when closing
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden max-w-md w-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-white leading-tight">
                {t.payment?.selectTokenTitle || 'Select Token'}
              </h2>
              <p className="text-sm text-gray-400 leading-tight mt-1">
                {t.payment?.selectTokenDescription || 'Choose your preferred payment token'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t.payment?.searchTokens || 'Search tokens...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Token List - Scrollable area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {availableTokens.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400 text-lg font-medium">
                {searchQuery.trim() 
                  ? (t.payment?.noTokensFound || 'No tokens found')
                  : (t.payment?.noTokensAvailable || 'No tokens available for current network')
                }
              </p>
              {searchQuery.trim() && (
                <p className="text-gray-500 text-sm mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {availableTokens.map((token) => {
                // Find the network info for current chain
                const networkInfo = token.networks.find(network => network.chain_id === currentChainId);
                const isSelected = selectedToken?.symbol === token.symbol;
                
                return (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token)}
                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-100'
                        : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            {networkInfo?.logo ? (
                              <img 
                                src={networkInfo.logo} 
                                alt={`${token.symbol} logo`}
                                className="w-8 h-8 rounded object-cover"
                                onError={(e) => {
                                  // Fallback to letter if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`text-black font-bold text-sm ${networkInfo?.logo ? 'hidden' : ''}`}>
                              {token.symbol.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className={`font-bold ${isSelected ? 'text-blue-100' : 'text-white'}`}>
                              {token.symbol}
                            </div>
                            <div className={`text-sm ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                              {token.name}
                            </div>
                          </div>
                        </div>
                        
                        {networkInfo && (
                          <div className="mt-3 space-y-1">
                            <div className={`text-sm ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                              {t.payment?.amountToPay || 'Amount to pay'}: {networkInfo.amount_to_pay} {token.symbol}
                            </div>
                            {networkInfo.rate_to_usd && (
                              <div className={`text-sm ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                                {t.payment?.tokenPrice?.replace('{price}', networkInfo.rate_to_usd.toString()) || `Price: $${networkInfo.rate_to_usd}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="ml-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex-shrink-0">
          <div className="text-center text-sm text-gray-400">
            {availableTokens.length > 0 && (
              <span>
                {availableTokens.length} {availableTokens.length === 1 ? 'token' : 'tokens'} available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
