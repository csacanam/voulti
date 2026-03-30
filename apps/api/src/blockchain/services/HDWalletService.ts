// src/blockchain/services/HDWalletService.ts
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { NETWORKS, type NetworkName } from '../config/networks';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const DERIVATION_BASE_PATH = "m/44'/60'/0'/0";

export interface DepositAddressRecord {
  id: string;
  invoice_id: string;
  network: string;
  chain_id: number;
  address: string;
  derivation_index: number;
  token_address: string;
  token_symbol: string;
  token_decimals: number;
  expected_amount: string;
  status: string;
  detected_amount: string | null;
  detected_at: string | null;
  gas_tx_hash: string | null;
  approve_tx_hash: string | null;
  pay_invoice_tx_hash: string | null;
  sweep_error: string | null;
  sweep_retries: number;
  refund_tx_hash: string | null;
  wrong_network_detected: string | null;
  created_at: string;
}

function getMnemonic(): string {
  const mnemonic = process.env.HD_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error('HD_WALLET_MNEMONIC not configured');
  }
  return mnemonic;
}

export class HDWalletService {
  /**
   * Derive an HD wallet at a specific index, connected to a network's provider.
   */
  static deriveWallet(index: number, network: NetworkName): ethers.Wallet {
    const mnemonic = getMnemonic();
    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(mnemonic),
      `${DERIVATION_BASE_PATH}/${index}`
    );

    const networkConfig = NETWORKS[network];
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
      name: networkConfig.name,
      chainId: networkConfig.chainId,
    });

    return new ethers.Wallet(hdNode.privateKey, provider);
  }

  /**
   * Atomically allocate the next derivation index.
   */
  static async allocateNextIndex(): Promise<number> {
    // Read current index
    const { data, error: readError } = await supabase
      .from('hd_wallet_counter')
      .select('next_index')
      .eq('id', 1)
      .single();

    if (readError || !data) {
      throw new Error('Failed to read hd_wallet_counter');
    }

    const currentIndex = data.next_index;

    // Increment atomically
    const { error: updateError } = await supabase
      .from('hd_wallet_counter')
      .update({ next_index: currentIndex + 1, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .eq('next_index', currentIndex); // optimistic lock

    if (updateError) {
      throw new Error('Failed to allocate HD wallet index (concurrent conflict)');
    }

    return currentIndex;
  }

  /**
   * Generate a deposit address for an invoice on a specific network.
   * Returns existing address if one already exists for this invoice+network.
   */
  static async generateDepositAddress(
    invoiceId: string,
    network: NetworkName,
    token: { address: string; symbol: string; decimals: number },
    expectedAmount: string
  ): Promise<DepositAddressRecord> {
    const networkConfig = NETWORKS[network];

    // Check if deposit address already exists for this invoice+network
    const { data: existing } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('network', network)
      .single();

    if (existing) {
      return existing as DepositAddressRecord;
    }

    // Allocate new index and derive address
    const index = await this.allocateNextIndex();
    const wallet = this.deriveWallet(index, network);

    // Insert into DB
    const { data: record, error } = await supabase
      .from('deposit_addresses')
      .insert({
        invoice_id: invoiceId,
        network,
        chain_id: networkConfig.chainId,
        address: wallet.address,
        derivation_index: index,
        token_address: token.address,
        token_symbol: token.symbol,
        token_decimals: token.decimals,
        expected_amount: expectedAmount,
        status: 'awaiting',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deposit address: ${error.message}`);
    }

    return record as DepositAddressRecord;
  }
}
