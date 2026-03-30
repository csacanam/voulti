export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export type NetworkTokens = Record<string, Token>;
export type TokenConfig = Record<string, NetworkTokens>;

export const TOKENS: TokenConfig = {
  alfajores: {
    CELO: {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "CELO",
      name: "Celo",
      decimals: 18,
    },
    CCOP: {
      address: "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4",
      symbol: "cCOP",
      name: "Celo Colombian Peso",
      decimals: 18,
    },
    CUSD: {
      address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
      symbol: "cUSD",
      name: "Celo Dollar",
      decimals: 18,
    },
    CEUR: {
      address: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
      symbol: "cEUR",
      name: "Celo Euro",
      decimals: 18,
    },
    USDC: {
      address: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  },
};

export function getToken(
  network: string,
  symbol: string
): Token | undefined {
  return TOKENS[network]?.[symbol];
}

export function getTokenByAddress(
  network: string,
  address: string
): Token | undefined {
  const networkTokens = TOKENS[network];
  if (!networkTokens) return undefined;
  return Object.values(networkTokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}
