import { Token, GroupedToken } from '../types/invoice';
import { findChainIdByBackendName } from '../config/chains';

export const groupTokensBySymbol = (tokens: Token[]): GroupedToken[] => {
  const grouped = tokens.reduce((acc, token) => {
    const existing = acc.find(group => group.symbol === token.symbol);
    
    const networkWithChainId = {
      network: token.network,
      chain_id: findChainIdByBackendName(token.network), // Add chain_id
      contract_address: token.contract_address,
      decimals: token.decimals,
      id: token.id,
      rate_to_usd: token.rate_to_usd,
      amount_to_pay: token.amount_to_pay,
      updated_at: token.updated_at,
      logo: token.logo // Include logo field
    };
    
    if (existing) {
      existing.networks.push(networkWithChainId);
    } else {
      acc.push({
        symbol: token.symbol,
        name: token.name,
        networks: [networkWithChainId]
      });
    }
    
    return acc;
  }, [] as GroupedToken[]);

  return grouped;
};