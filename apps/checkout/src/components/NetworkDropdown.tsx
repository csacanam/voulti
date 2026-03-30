import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';
import { useLanguage } from '../contexts/LanguageContext';

interface NetworkDropdownProps {
  networks: string[];
  selectedNetwork: string;
  onNetworkSelect: (network: string) => void;
  disabled?: boolean;
}

export const NetworkDropdown: React.FC<NetworkDropdownProps> = ({
  networks,
  selectedNetwork,
  onNetworkSelect,
  disabled = false
}) => {
  const { t } = useLanguage();
  const { isOpen, toggleDropdown, closeDropdown, ref, zIndex } = useDropdown('network-dropdown');

  const handleToggle = () => {
    if (!disabled) {
      toggleDropdown();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full border rounded-lg p-3 text-left flex items-center justify-between transition-colors ${
          disabled 
            ? 'bg-gray-900 border-gray-800 text-gray-500 cursor-not-allowed' 
            : 'bg-gray-800 border-gray-700 text-white hover:border-gray-600'
        }`}
      >
        <span>{selectedNetwork || t.payment.selectNetwork}</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${
          disabled ? 'text-gray-600' : 'text-gray-400'
        } ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && !disabled && (
        <div className={`absolute ${zIndex} w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg`}>
          {networks.map((network) => (
            <button
              key={network}
              onClick={() => {
                onNetworkSelect(network);
                closeDropdown();
              }}
              className="w-full text-left p-3 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg text-white"
            >
              {network}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};