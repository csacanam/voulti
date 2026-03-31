import React from 'react';
import { Calculator, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { interpolate } from '../utils/i18n';

interface PaymentAmountProps {
  amountToPay?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  rateToUsd?: number;
  updatedAt?: string;
  amountFiat: number;
  fiatCurrency: string;
}

export const PaymentAmount: React.FC<PaymentAmountProps> = ({
  amountToPay,
  tokenSymbol,
  tokenDecimals,
  rateToUsd,
  updatedAt,
  amountFiat,
  fiatCurrency,
}) => {
  const { t, language } = useLanguage();
  if (!amountToPay || !tokenSymbol) {
    return null;
  }

  // Format the amount to pay with appropriate decimals
  const formatAmount = (amount: string, decimals: number = 6) => {
    const num = Number(amount);
    if (num === 0) return '0';

    // For very large numbers (like cCOP), show fewer decimals
    if (num > 1000) return num.toFixed(2);
    // For normal amounts, show appropriate decimals
    if (num > 1) return num.toFixed(Math.min(4, decimals));
    // For small amounts, show more decimals
    return num.toFixed(Math.min(8, decimals));
  };

  // Format the rate
  const formatRate = (rate: number) => {
    if (rate >= 1) return rate.toFixed(4);
    if (rate >= 0.01) return rate.toFixed(6);
    return rate.toFixed(8);
  };

  // Format updated time to show actual date/time
  const formatUpdatedTime = (timestamp: string) => {
    try {
      // The backend timestamp is in UTC, so we need to force UTC interpretation
      // and then convert to user's local timezone
      const date = new Date(timestamp + 'Z'); // Force UTC interpretation
      const locale = language === 'es' ? 'es-CO' : 'en-US';

      if (language === 'es') {
        const formattedDate = date.toLocaleString(locale, {
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return formattedDate;
      } else {
        const formattedDate = date.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return formattedDate;
      }
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const formatFiatAmount = (amount: number, currency: string) => {
    const locale = language === 'es' ? 'es-CO' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  };

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Calculator className="h-5 w-5 text-violet-600" />
        <h3 className="text-violet-700 font-medium">{t.payment.amountToPay}</h3>
      </div>

      <div className="space-y-3">
        {/* Main amount */}
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {formatAmount(amountToPay, tokenDecimals)} {tokenSymbol}
          </div>
          <div className="text-gray-500 text-sm">
            ≈ {formatFiatAmount(amountFiat, fiatCurrency)}
          </div>
        </div>

        {/* Rate info */}
        {rateToUsd && t.payment?.price && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{interpolate(t.payment.price, { symbol: tokenSymbol })}:</span>
            <span className="text-gray-600">${formatRate(rateToUsd)} USD</span>
          </div>
        )}

        {/* Last updated */}
        {updatedAt && t.payment?.lastUpdated && (
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{interpolate(t.payment.lastUpdated, { time: formatUpdatedTime(updatedAt) })}</span>
          </div>
        )}
      </div>
    </div>
  );
};
