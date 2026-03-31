import React from 'react';
import { AlertCircle, X, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  title,
  message,
  type = 'error'
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const config = {
    error: {
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      accent: 'text-red-700',
    },
    warning: {
      icon: <AlertCircle className="h-6 w-6 text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      accent: 'text-amber-700',
    },
    info: {
      icon: <AlertCircle className="h-6 w-6 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      accent: 'text-blue-700',
    },
  }[type];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {title || (type === 'error' ? 'Something went wrong' : type === 'warning' ? 'Attention' : 'Information')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className={`${config.bg} border ${config.border} rounded-lg p-4 flex gap-3`}>
            <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>

          {type === 'error' && (
            <p className="text-xs text-gray-400 mt-3">
              If this problem persists, please try refreshing the page or contact support.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 flex gap-3">
          {onRetry && (
            <button
              onClick={() => { onClose(); onRetry(); }}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
          <button
            onClick={onClose}
            className={`${onRetry ? 'flex-1' : 'w-full'} bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200`}
          >
            {onRetry ? (
              <>
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </>
            ) : (
              t.payment?.close || 'Close'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
