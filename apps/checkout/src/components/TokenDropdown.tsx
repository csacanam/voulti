import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GroupedToken } from '../types/invoice';
import { useLanguage } from '../contexts/LanguageContext';
import { TokenSelectionModal } from './TokenSelectionModal';

interface TokenDropdownProps {
  tokens: GroupedToken[];
  selectedToken: GroupedToken | null;
  onTokenSelect: (token: GroupedToken) => void;
  currentChainId?: number; // Add current chain ID to filter tokens
}

export const TokenDropdown: React.FC<TokenDropdownProps> = ({
  tokens,
  selectedToken,
  onTokenSelect,
  currentChainId
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter tokens by current network
  const availableTokens = currentChainId 
    ? tokens.filter(token => 
        token.networks.some(network => network.chain_id === currentChainId)
      )
    : tokens;

  // If no tokens available for current network, show message
  if (availableTokens.length === 0 && currentChainId) {
    return (
      <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
        <span className="text-gray-400 text-sm">
          {t.payment?.noTokensAvailable || 'No tokens available for current network'}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Button that opens the modal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-left flex items-center justify-between hover:border-gray-600 transition-colors"
      >
        <span className="text-white">
          {selectedToken ? (
            <div>
              <div className="font-bold">{selectedToken.symbol}</div>
              <div className="text-gray-400 text-sm">{selectedToken.name}</div>
            </div>
          ) : t.payment.selectTokenPlaceholder}
        </span>
        <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
      </button>
      
      {/* Token Selection Modal */}
      <TokenSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tokens={tokens}
        selectedToken={selectedToken}
        onTokenSelect={onTokenSelect}
        currentChainId={currentChainId}
      />
    </>
  );
};