// src/blockchain/services/DerampServices.ts
import { getWallet } from "../utils/web3";
import { CONTRACTS } from "../config/contracts";
import { type NetworkName } from "../config/networks";
import DerampProxyABI from "../abi/DerampProxy.json";
import { ethers } from "ethers";

export class DerampService {
  protected network: string;
  protected contractAddress: string;
  protected abi: any;
  protected wallet: ethers.Wallet | null;
  protected contract: ethers.Contract | null;
  protected provider: ethers.Provider | null;
  protected supportsENS?: boolean;

  constructor(network: string, supportsENS?: boolean) {
    this.network = network;
    this.contractAddress = CONTRACTS[network].DERAMP_PROXY;
    this.abi = DerampProxyABI.abi; // Extract only the abi array
    this.wallet = null;
    this.contract = null;
    this.provider = null;
    this.supportsENS = supportsENS;
  }

  async init(privateKey: string): Promise<void> {
    this.wallet = getWallet(privateKey, this.network, this.supportsENS);
    this.provider = this.wallet.provider;
    this.contract = new ethers.Contract(
      this.contractAddress,
      this.abi,
      this.wallet
    );
  }
} 