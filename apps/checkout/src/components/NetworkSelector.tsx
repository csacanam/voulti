import { SUPPORTED_CHAINS } from '../config/chains';

interface NetworkSelectorProps {
  selectedChainId: number | null;
  onSelect: (chainId: number) => void;
}

export function NetworkSelector({ selectedChainId, onSelect }: NetworkSelectorProps) {
  const enabledChains = SUPPORTED_CHAINS.filter(c => c.enabled);

  return (
    <div className="space-y-2">
      <label className="block text-white font-medium">Select Network</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {enabledChains.map(config => (
          <button
            key={config.chain.id}
            onClick={() => onSelect(config.chain.id)}
            className={`p-4 rounded-lg text-sm font-medium transition-all border min-h-[52px] active:scale-[0.98] ${
              selectedChainId === config.chain.id
                ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 active:bg-gray-700'
            }`}
          >
            {config.chain.name}
          </button>
        ))}
      </div>
    </div>
  );
}
