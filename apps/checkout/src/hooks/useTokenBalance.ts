import { useBalance, useAccount, useChainId } from 'wagmi';
import { useMemo } from 'react';

interface UseTokenBalanceProps {
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  requiredChainId?: number;
  enabled?: boolean;
}

export const useTokenBalance = ({ 
  tokenAddress, 
  tokenSymbol, 
  tokenDecimals,
  requiredChainId,
  enabled = true 
}: UseTokenBalanceProps) => {
  const { address: walletAddress, isConnected } = useAccount();
  const currentChainId = useChainId();

  // Check if we're on the wrong network
  const isWrongNetwork = useMemo(() => {
    if (!isConnected || !requiredChainId) return false;
    return currentChainId !== requiredChainId;
  }, [isConnected, currentChainId, requiredChainId]);

  const { data: balance, isLoading, error } = useBalance({
    address: walletAddress,
    token: tokenAddress as `0x${string}`,
    chainId: requiredChainId,
    query: {
      enabled: enabled && isConnected && !!tokenAddress && !!walletAddress && !!requiredChainId,
    },
  });

  const formattedBalance = useMemo(() => {
    if (!balance) return null;

    return {
      value: balance.value,
      formatted: balance.formatted,
      symbol: tokenSymbol || balance.symbol,
      decimals: tokenDecimals || balance.decimals,
    };
  }, [balance, tokenSymbol, tokenDecimals]);

  return {
    balance: formattedBalance,
    isLoading: isLoading && enabled,
    error: error,
    hasBalance: formattedBalance ? Number(formattedBalance.formatted) > 0 : false,
    isConnected,
    isWrongNetwork,
    currentChainId,
    requiredChainId,
  };
}; 