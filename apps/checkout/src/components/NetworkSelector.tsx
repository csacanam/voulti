import { SUPPORTED_CHAINS } from '../config/chains';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetworkAvailability } from '../hooks/useNetworkAvailability';

interface NetworkSelectorProps {
  selectedChainId: number | null;
  onSelect: (chainId: number) => void;
}

export function NetworkSelector({ selectedChainId, onSelect }: NetworkSelectorProps) {
  const { t } = useLanguage();
  const { isUnavailable } = useNetworkAvailability();
  const enabledChains = SUPPORTED_CHAINS.filter(c => c.enabled);

  return (
    <div className="space-y-2">
      <label className="block text-gray-900 font-medium">{t.payByAddress.selectNetwork}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {enabledChains.map(config => {
          // Shown disabled rather than hidden. Payers arrive with a network
          // already in mind — a campaign that says "dona en Celo", a wallet
          // that only holds one chain — and an option that silently vanishes
          // reads as a broken page, which sends them to support instead of to
          // the network that does work.
          const unavailable = isUnavailable(config.chain.id);

          return (
            <button
              key={config.chain.id}
              onClick={() => !unavailable && onSelect(config.chain.id)}
              disabled={unavailable}
              className={`p-4 rounded-lg text-sm font-medium transition-all border min-h-[52px] ${
                unavailable
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : selectedChainId === config.chain.id
                    ? 'border-violet-500 bg-violet-50 text-violet-700 active:scale-[0.98]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:bg-gray-100 active:scale-[0.98]'
              }`}
            >
              <span className="block">{config.chain.name}</span>
              {unavailable && (
                <span className="block text-xs font-normal text-gray-400 mt-0.5">
                  {t.payByAddress.networkUnavailable}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
