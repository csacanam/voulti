import React from 'react';
import { Wallet, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useLanguage } from '../contexts/LanguageContext';

interface TokenBalanceProps {
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  requiredChainId?: number;
  requiredAmount?: number;
  className?: string;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  requiredChainId,
  requiredAmount,
  className = '',
}) => {
  const { t } = useLanguage();
  const { balance, isLoading, error, hasBalance, isConnected, isWrongNetwork, currentChainId } = useTokenBalance({
    tokenAddress,
    tokenSymbol,
    tokenDecimals,
    requiredChainId,
  });

  if (!isConnected) {
    return null;
  }



  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-400 text-sm ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>{t.balance.error}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-400 text-sm animate-pulse ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>{t.balance.loading}</span>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className={`flex items-center space-x-2 text-gray-400 text-sm ${className}`}>
        <Wallet className="h-4 w-4" />
        <span>{t.balance.notAvailable}</span>
      </div>
    );
  }

  const balanceNumber = Number(balance.formatted);
  const isLowBalance = balanceNumber < 1; // Less than 1 token
  const hasSufficientBalance = requiredAmount ? balanceNumber >= requiredAmount : true;
  
  // Format balance to show fewer decimals for display
  const formatBalance = (value: string) => {
    const num = Number(value);
    if (num === 0) return '0';
    if (num < 0.001) return '< 0.001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toFixed(2);
  };

  const getBalanceColor = () => {
    if (!hasBalance) return 'text-red-400';
    if (requiredAmount && !hasSufficientBalance) return 'text-orange-400';
    if (isLowBalance) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBalanceIcon = () => {
    if (!hasBalance) return <XCircle className="h-4 w-4 text-red-400" />;
    if (requiredAmount && !hasSufficientBalance) return <AlertCircle className="h-4 w-4 text-orange-400" />;
    if (hasBalance) return <CheckCircle className="h-4 w-4 text-green-400" />;
    return <Wallet className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {getBalanceIcon()}
      <span className="text-gray-300">{t.balance.label}</span>
      <span className={`font-medium ${getBalanceColor()}`}>
        {formatBalance(balance.formatted)} {balance.symbol}
      </span>
      {!hasBalance && (
        <span className="text-red-400 text-xs">{t.balance.noFunds}</span>
      )}
      {requiredAmount && hasBalance && !hasSufficientBalance && (
        <span className="text-orange-400 text-xs">({t.balance.insufficient})</span>
      )}
    </div>
  );
}; 