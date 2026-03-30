import { Wallet, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps {
  onSelectWallet: () => void;
  onSelectAddress: () => void;
}

export function PaymentMethodSelector({ onSelectWallet, onSelectAddress }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 text-center mb-4">How would you like to pay?</p>

      <button
        onClick={onSelectWallet}
        className="w-full flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-blue-500 hover:bg-gray-800/80 transition-all text-left group"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
          <Wallet className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <div className="font-medium text-white">Connect Wallet</div>
          <div className="text-sm text-gray-400">MetaMask, WalletConnect, Coinbase...</div>
        </div>
      </button>

      <button
        onClick={onSelectAddress}
        className="w-full flex items-center gap-4 p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-purple-500 hover:bg-gray-800/80 transition-all text-left group"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
          <QrCode className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <div className="font-medium text-white">Pay by Address</div>
          <div className="text-sm text-gray-400">Send from any wallet or exchange</div>
        </div>
      </button>
    </div>
  );
}
