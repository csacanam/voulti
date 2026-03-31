import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NetworkMismatchWarningProps {
  expectedNetwork: string;
  currentNetwork: string;
  onSwitchNetwork: () => void;
  isSwitching?: boolean;
}

export const NetworkMismatchWarning: React.FC<NetworkMismatchWarningProps> = ({
  expectedNetwork,
  currentNetwork,
  onSwitchNetwork,
  isSwitching = false
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-amber-700">
            {t.payment?.networkMismatchTitle || 'Red incorrecta detectada'}
          </h3>

          <p className="text-gray-600 max-w-md">
            {t.payment?.networkMismatchDescription?.replace('{expected}', expectedNetwork).replace('{current}', currentNetwork) ||
             `Esta orden fue creada en ${expectedNetwork}, pero estás conectado a ${currentNetwork}.`}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onSwitchNetwork}
            disabled={isSwitching}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {isSwitching ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            <span>
              {isSwitching
                ? (t.payment?.switchingNetwork || 'Cambiando red...')
                : (t.payment?.switchToCorrectNetwork || 'Cambiar a red correcta')
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
