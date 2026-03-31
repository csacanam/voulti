import { Wallet, QrCode } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentMethodSelectorProps {
  onSelectWallet: () => void;
  onSelectAddress: () => void;
}

export function PaymentMethodSelector({ onSelectWallet, onSelectAddress }: PaymentMethodSelectorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 text-center mb-4">{t.paymentMethod.title}</p>

      <button
        onClick={onSelectWallet}
        className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-500 hover:bg-gray-50 transition-all text-left group"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
          <Wallet className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{t.paymentMethod.connectWallet}</div>
          <div className="text-sm text-gray-500">{t.paymentMethod.connectWalletDesc}</div>
        </div>
      </button>

      <button
        onClick={onSelectAddress}
        className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-500 hover:bg-gray-50 transition-all text-left group"
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
          <QrCode className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{t.paymentMethod.payByAddress}</div>
          <div className="text-sm text-gray-500">{t.paymentMethod.payByAddressDesc}</div>
        </div>
      </button>
    </div>
  );
}
