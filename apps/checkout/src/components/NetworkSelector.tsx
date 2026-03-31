import { SUPPORTED_CHAINS } from '../config/chains';
import { useLanguage } from '../contexts/LanguageContext';

interface NetworkSelectorProps {
  selectedChainId: number | null;
  onSelect: (chainId: number) => void;
}

export function NetworkSelector({ selectedChainId, onSelect }: NetworkSelectorProps) {
  const { t } = useLanguage();
  const enabledChains = SUPPORTED_CHAINS.filter(c => c.enabled);

  return (
    <div className="space-y-2">
      <label className="block text-gray-900 font-medium">{t.payByAddress.selectNetwork}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {enabledChains.map(config => (
          <button
            key={config.chain.id}
            onClick={() => onSelect(config.chain.id)}
            className={`p-4 rounded-lg text-sm font-medium transition-all border min-h-[52px] active:scale-[0.98] ${
              selectedChainId === config.chain.id
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:bg-gray-100'
            }`}
          >
            {config.chain.name}
          </button>
        ))}
      </div>
    </div>
  );
}
