export type ContractAddresses = Record<string, string>;
export type ContractsConfig = Record<string, ContractAddresses>;

export const CONTRACTS: ContractsConfig = {
  alfajores: {
    DERAMP_PROXY: "0xc44cDAdf371DFCa94e325d1B35e27968921Ef668",
    DERAMP_STORAGE: "0x25f5A82B9B021a35178A25540bb0f052fF22e6b4",
    ACCESS_MANAGER: "0x776D9E84D5DAaecCb014f8aa8D64a6876B47a696",
    INVOICE_MANAGER: "0xe7c011eB0328287B11aC711885a2f76d5797012f",
    PAYMENT_PROCESSOR: "0x23b353F6B8F90155f7854Ca3813C0216819543B1",
  },
};

export function getContractAddress(
  network: string,
  contractName: string
): string | undefined {
  return CONTRACTS[network]?.[contractName];
}
