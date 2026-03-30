export interface VaultConfig {
  address: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  network: {
    chainId: number;
    name: string;
  };
}

export const VAULTS: Record<string, Record<string, VaultConfig>> = {
  celo: {
    cCOP: {
      address: "0x8d0D5D852062017F312a00e39f3B2311CF12aCbf",
      token: {
        address: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
        symbol: "cCOP",
        decimals: 18,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
    cREAL: {
      address: "0xB7d2300eA9f301F2F782bf52F452658E1F68d45a",
      token: {
        address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
        symbol: "cREAL",
        decimals: 18,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
    BRLA: {
      address: "0x0B3D083289C71FdbD4921448B4f1ED96B6E9f402",
      token: {
        address: "0xFECB3F7c54E2CAAE9dC6Ac9060A822D47E053760",
        symbol: "BRLA",
        decimals: 18,
      },
      network: {
        chainId: 42220,
        name: "Celo",
      },
    },
  },
  arbitrum: {
    MXNB: {
      address: "0x4B87eE9DFEAd2d20911cCF0c7AD8667099A46d00",
      token: {
        address: "0xF197FFC28c23E0309B5559e7a166f2c6164C80aA",
        symbol: "MXNB",
        decimals: 6,
      },
      network: {
        chainId: 42161,
        name: "Arbitrum One",
      },
    },
  },
};

export function getVaultConfig(
  network: string,
  tokenSymbol: string
): VaultConfig | undefined {
  return VAULTS[network]?.[tokenSymbol];
}

export function getVaultAddress(
  chainId: number,
  tokenSymbol: string
): string | undefined {
  const network = Object.keys(VAULTS).find((net) => {
    const tokens = VAULTS[net];
    return Object.values(tokens).some(
      (vault) => vault.network.chainId === chainId
    );
  });

  if (!network) return undefined;
  return VAULTS[network][tokenSymbol]?.address;
}

export function vaultExists(
  chainId: number,
  tokenSymbol: string
): boolean {
  const address = getVaultAddress(chainId, tokenSymbol);
  return (
    address !== undefined &&
    address !== "0x0000000000000000000000000000000000000000"
  );
}

export function getVaultsByNetwork(network: string): VaultConfig[] {
  return Object.values(VAULTS[network] || {});
}

export function getVaultsByChainId(chainId: number): VaultConfig[] {
  const allVaults: VaultConfig[] = [];
  Object.values(VAULTS).forEach((networkVaults) => {
    Object.values(networkVaults).forEach((vault) => {
      if (vault.network.chainId === chainId) {
        allVaults.push(vault);
      }
    });
  });
  return allVaults;
}
