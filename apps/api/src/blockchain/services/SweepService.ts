// src/blockchain/services/SweepService.ts
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { HDWalletService, type DepositAddressRecord } from './HDWalletService';
import { NETWORKS, type NetworkName } from '../config/networks';
import { CONTRACTS } from '../config/contracts';
import { TOKENS } from '../config/tokens';
import { getWallet } from '../utils/web3';
import DerampProxyABI from '../abi/DerampProxy.json';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const POLL_INTERVAL = Number(process.env.SWEEP_POLL_INTERVAL_MS || 15000);
const MAX_RETRIES = Number(process.env.SWEEP_MAX_RETRIES || 5);
const GAS_BUFFER = 1.5;

export class SweepService {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  start(): void {
    if (this.pollInterval) return;
    console.log(`[SweepService] Started polling every ${POLL_INTERVAL}ms`);
    this.pollInterval = setInterval(() => this.pollCycle(), POLL_INTERVAL);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[SweepService] Stopped');
    }
  }

  private async pollCycle(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { data: deposits, error } = await supabase
        .from('deposit_addresses')
        .select('*')
        .in('status', ['awaiting', 'partial', 'detected', 'sweeping'])
        .lt('sweep_retries', MAX_RETRIES);

      if (error || !deposits || deposits.length === 0) return;

      for (const deposit of deposits as DepositAddressRecord[]) {
        try {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('status, expires_at')
            .eq('id', deposit.invoice_id)
            .single();

          // Invoice paid via wallet — skip
          if (invoice?.status === 'Paid') {
            // If there are tokens in the HD wallet, refund them
            await this.checkAndRefundOrphanedDeposit(deposit);
            continue;
          }

          if (deposit.status === 'awaiting' || deposit.status === 'partial') {
            await this.checkDeposit(deposit, invoice);
          } else if (deposit.status === 'detected' || deposit.status === 'sweeping') {
            await this.executeSweep(deposit);
          }
        } catch (err: any) {
          console.error(`[SweepService] Error processing deposit ${deposit.id}:`, err.message);
        }
      }

      // Check if tokens arrived on a different network
      await this.checkOtherNetworkDeposits();
    } catch (err: any) {
      console.error('[SweepService] Poll cycle error:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  private async checkDeposit(deposit: DepositAddressRecord, invoice: any): Promise<void> {
    const network = deposit.network as NetworkName;
    const networkConfig = NETWORKS[network];
    const isExpired = invoice?.expires_at && new Date(invoice.expires_at) < new Date();

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
      name: networkConfig.name,
      chainId: networkConfig.chainId,
    });

    const token = new ethers.Contract(deposit.token_address, ERC20_ABI, provider);
    const balance: bigint = await token.balanceOf(deposit.address);
    const expected = ethers.parseUnits(deposit.expected_amount, deposit.token_decimals);

    if (balance >= expected) {
      // Full or overpayment — proceed to sweep
      const detected = ethers.formatUnits(balance, deposit.token_decimals);
      console.log(`[SweepService] Deposit detected: ${detected} ${deposit.token_symbol} at ${deposit.address}`);

      await supabase
        .from('deposit_addresses')
        .update({
          status: 'detected',
          detected_amount: detected,
          detected_at: new Date().toISOString(),
        })
        .eq('id', deposit.id);

      deposit.status = 'detected';
      deposit.detected_amount = detected;
      await this.executeSweep(deposit);

    } else if (balance > 0n) {
      // Partial deposit
      const partial = ethers.formatUnits(balance, deposit.token_decimals);
      const remaining = ethers.formatUnits(expected - balance, deposit.token_decimals);

      console.log(`[SweepService] Partial: ${partial}/${deposit.expected_amount} ${deposit.token_symbol}`);

      await supabase
        .from('deposit_addresses')
        .update({
          status: 'partial',
          detected_amount: partial,
          detected_at: deposit.detected_at || new Date().toISOString(),
        })
        .eq('id', deposit.id);

      if (isExpired) {
        // Invoice expired with partial deposit — refund
        console.log(`[SweepService] Expired with partial deposit, refunding ${partial} ${deposit.token_symbol}`);
        await this.refundDeposit(deposit, balance);
      }
    } else {
      // No deposit
      if (isExpired) {
        await this.updateStatus(deposit.id, 'expired', 'Invoice expired with no deposit');
      }
    }
  }

  private async executeSweep(deposit: DepositAddressRecord): Promise<void> {
    const network = deposit.network as NetworkName;
    const contracts = CONTRACTS[network];
    const backendKey = process.env.BACKEND_PRIVATE_KEY;

    if (!backendKey || !contracts?.DERAMP_PROXY) {
      await this.updateStatus(deposit.id, 'failed', 'Backend key or contract not configured');
      return;
    }

    await supabase
      .from('deposit_addresses')
      .update({ status: 'sweeping' })
      .eq('id', deposit.id);

    try {
      const hdWallet = HDWalletService.deriveWallet(deposit.derivation_index, network);
      const hotWallet = getWallet(backendKey, network, false);
      const expectedAmount = ethers.parseUnits(deposit.expected_amount, deposit.token_decimals);

      // Read actual balance
      const tokenContract = new ethers.Contract(deposit.token_address, ERC20_ABI, hdWallet);
      const actualBalance: bigint = await tokenContract.balanceOf(deposit.address);
      const overpayment = actualBalance > expectedAmount ? actualBalance - expectedAmount : 0n;

      // TX 1: Send gas (if not done yet)
      // Need extra gas if we also need to refund overpayment
      if (!deposit.gas_tx_hash) {
        const extraOps = overpayment > 0n ? 1 : 0; // extra transfer for refund
        const gasNeeded = await this.estimateGasNeeded(hdWallet, 3 + extraOps);
        const gasTx = await hotWallet.sendTransaction({
          to: deposit.address,
          value: gasNeeded,
        });
        await gasTx.wait();

        await supabase
          .from('deposit_addresses')
          .update({ gas_tx_hash: gasTx.hash })
          .eq('id', deposit.id);

        console.log(`[SweepService] Gas sent: ${gasTx.hash}`);
      }

      // TX 2: Approve exact amount for DerampProxy (if not done yet)
      if (!deposit.approve_tx_hash) {
        const approveTx = await tokenContract.approve(contracts.DERAMP_PROXY, expectedAmount);
        await approveTx.wait();

        await supabase
          .from('deposit_addresses')
          .update({ approve_tx_hash: approveTx.hash })
          .eq('id', deposit.id);

        console.log(`[SweepService] Approve: ${approveTx.hash}`);
      }

      // TX 3: Pay invoice with exact expected amount
      if (!deposit.pay_invoice_tx_hash) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('blockchain_invoice_id, commerce_id, expires_at, selected_network')
          .eq('id', deposit.invoice_id)
          .single();

        if (!invoice) throw new Error('Invoice not found in DB');

        // If invoice doesn't exist on-chain yet, or was created on a different network,
        // create it on this network using the backend wallet
        let blockchainInvoiceId = invoice.blockchain_invoice_id;
        if (!blockchainInvoiceId || (invoice.selected_network && invoice.selected_network !== deposit.chain_id)) {
          console.log(`[SweepService] Creating invoice on-chain on ${network} for deposit ${deposit.id}`);

          const { InvoiceService } = await import('./InvoiceServices');
          const invoiceService = new InvoiceService(network, false);
          await invoiceService.init(backendKey);

          // Get commerce wallet
          const { data: commerce } = await supabase
            .from('commerces')
            .select('wallet')
            .eq('id', invoice.commerce_id)
            .single();

          if (!commerce?.wallet) throw new Error('Commerce wallet not found');

          blockchainInvoiceId = ethers.id(deposit.invoice_id);
          const expiresAt = invoice.expires_at
            ? Math.floor(new Date(invoice.expires_at).getTime() / 1000)
            : 0;

          await invoiceService.createInvoice({
            invoiceId: blockchainInvoiceId,
            commerce: commerce.wallet,
            paymentOptions: [{ token: deposit.token_address, amount: deposit.expected_amount, decimals: deposit.token_decimals }],
            expiresAt,
          });

          // Update DB with the on-chain reference
          await supabase
            .from('invoices')
            .update({
              blockchain_invoice_id: blockchainInvoiceId,
              selected_network: deposit.chain_id,
            })
            .eq('id', deposit.invoice_id);
        }

        const proxyContract = new ethers.Contract(
          contracts.DERAMP_PROXY,
          DerampProxyABI.abi || DerampProxyABI,
          hdWallet
        );

        const payTx = await proxyContract.payInvoice(
          blockchainInvoiceId,
          deposit.token_address,
          expectedAmount
        );
        await payTx.wait();

        console.log(`[SweepService] PayInvoice: ${payTx.hash}`);

        // Update invoice as paid — read fee from contract
        const paidAmount = parseFloat(deposit.expected_amount);
        let feePercent = 100; // default 1%
        try {
          const contracts = CONTRACTS[network];
          if (contracts?.ACCESS_MANAGER) {
            const networkConfig = NETWORKS[network];
            const readProvider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
              name: networkConfig.name, chainId: networkConfig.chainId,
            });
            const am = new ethers.Contract(contracts.ACCESS_MANAGER, [
              'function getCommerceFee(address commerce) view returns (uint256)',
            ], readProvider);
            const { data: commerce } = await supabase
              .from('commerces')
              .select('wallet')
              .eq('id', invoice.commerce_id)
              .single();
            if (commerce?.wallet) {
              feePercent = Number(await am.getCommerceFee(commerce.wallet));
            }
          }
        } catch {
          // fallback to default
        }
        const feeAmount = (paidAmount * feePercent) / 10000;

        await supabase
          .from('invoices')
          .update({
            status: 'Paid',
            payment_method: 'address',
            paid_token: deposit.token_symbol,
            paid_network: deposit.network,
            paid_tx_hash: payTx.hash,
            wallet_address: deposit.address,
            paid_amount: paidAmount,
            fee_percent: feePercent,
            fee_amount: feeAmount,
            paid_at: new Date().toISOString(),
          })
          .eq('id', deposit.invoice_id);

        // TX 4: Refund overpayment if any
        let refundTxHash: string | null = null;
        if (overpayment > 0n) {
          const senderAddress = await this.findSenderAddress(deposit);
          if (senderAddress) {
            const refundTx = await tokenContract.transfer(senderAddress, overpayment);
            await refundTx.wait();
            refundTxHash = refundTx.hash;
            const refundAmount = ethers.formatUnits(overpayment, deposit.token_decimals);
            console.log(`[SweepService] Overpayment refunded: ${refundAmount} ${deposit.token_symbol} to ${senderAddress} (${refundTxHash})`);
          } else {
            console.warn(`[SweepService] Cannot refund overpayment: sender unknown for deposit ${deposit.id}`);
          }
        }

        await supabase
          .from('deposit_addresses')
          .update({
            pay_invoice_tx_hash: payTx.hash,
            status: 'swept',
            sweep_error: null,
            refund_tx_hash: refundTxHash,
          })
          .eq('id', deposit.id);

        console.log(`[SweepService] Invoice ${deposit.invoice_id} marked as Paid`);
      }
    } catch (err: any) {
      console.error(`[SweepService] Sweep error for ${deposit.id}:`, err.message);

      await supabase
        .from('deposit_addresses')
        .update({
          sweep_error: err.message,
          sweep_retries: deposit.sweep_retries + 1,
          status: deposit.sweep_retries + 1 >= MAX_RETRIES ? 'failed' : 'sweeping',
        })
        .eq('id', deposit.id);
    }
  }

  /**
   * Refund tokens from HD wallet back to the sender.
   * Used when invoice expires with a partial deposit.
   */
  private async refundDeposit(deposit: DepositAddressRecord, amount: bigint): Promise<void> {
    const network = deposit.network as NetworkName;
    const backendKey = process.env.BACKEND_PRIVATE_KEY;
    if (!backendKey) return;

    try {
      const hdWallet = HDWalletService.deriveWallet(deposit.derivation_index, network);
      const hotWallet = getWallet(backendKey, network, false);
      const tokenContract = new ethers.Contract(deposit.token_address, ERC20_ABI, hdWallet);

      const senderAddress = await this.findSenderAddress(deposit);
      if (!senderAddress) {
        console.warn(`[SweepService] Cannot refund: sender unknown for deposit ${deposit.id}`);
        await this.updateStatus(deposit.id, 'failed', 'Expired partial deposit, sender unknown — manual refund needed');
        return;
      }

      // Send gas for the refund transfer
      const gasNeeded = await this.estimateGasNeeded(hdWallet, 1);
      const gasTx = await hotWallet.sendTransaction({ to: deposit.address, value: gasNeeded });
      await gasTx.wait();

      // Transfer tokens back to sender
      const refundTx = await tokenContract.transfer(senderAddress, amount);
      await refundTx.wait();

      const refundAmount = ethers.formatUnits(amount, deposit.token_decimals);
      console.log(`[SweepService] Refunded ${refundAmount} ${deposit.token_symbol} to ${senderAddress}`);

      await supabase
        .from('deposit_addresses')
        .update({
          status: 'refunded',
          refund_tx_hash: refundTx.hash,
          sweep_error: `Expired. Refunded ${refundAmount} to ${senderAddress}`,
        })
        .eq('id', deposit.id);

      // Mark invoice as expired
      await supabase
        .from('invoices')
        .update({ status: 'Expired', expired_at: new Date().toISOString() })
        .eq('id', deposit.invoice_id);

    } catch (err: any) {
      console.error(`[SweepService] Refund error for ${deposit.id}:`, err.message);
      await this.updateStatus(deposit.id, 'failed', `Refund failed: ${err.message}`);
    }
  }

  /**
   * Check if tokens were sent to HD addresses on a DIFFERENT network.
   * If found, process the payment on that network instead of refunding.
   * Same rules apply: partial → wait/refund on expiry, full → sweep, over → sweep + refund excess.
   */
  private async checkOtherNetworkDeposits(): Promise<void> {
    const { data: deposits } = await supabase
      .from('deposit_addresses')
      .select('*')
      .in('status', ['awaiting', 'partial']);

    if (!deposits || deposits.length === 0) return;

    for (const deposit of deposits as DepositAddressRecord[]) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status, expires_at')
        .eq('id', deposit.invoice_id)
        .single();

      if (invoice?.status === 'Paid') continue;

      for (const [networkName, networkConfig] of Object.entries(NETWORKS)) {
        if (networkName === deposit.network) continue;

        const contracts = CONTRACTS[networkName];
        if (!contracts?.DERAMP_PROXY) continue;

        const networkTokens = TOKENS[networkName];
        if (!networkTokens) continue;

        try {
          const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
            name: networkConfig.name,
            chainId: networkConfig.chainId,
          });

          for (const [, tokenInfo] of Object.entries(networkTokens)) {
            const token = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
            const balance: bigint = await token.balanceOf(deposit.address);

            if (balance > 0n) {
              const amount = ethers.formatUnits(balance, tokenInfo.decimals);
              console.log(
                `[SweepService] Deposit on different network: ${amount} ${tokenInfo.symbol} on ${networkName} (expected ${deposit.network})`
              );

              // Re-target the deposit to the actual network and token
              await supabase
                .from('deposit_addresses')
                .update({
                  network: networkName,
                  chain_id: networkConfig.chainId,
                  token_address: tokenInfo.address,
                  token_symbol: tokenInfo.symbol,
                  token_decimals: tokenInfo.decimals,
                  wrong_network_detected: deposit.network, // remember original
                })
                .eq('id', deposit.id);

              // Now check the deposit with normal logic (partial/full/over)
              const expected = ethers.parseUnits(deposit.expected_amount, tokenInfo.decimals);

              if (balance >= expected) {
                await supabase
                  .from('deposit_addresses')
                  .update({
                    status: 'detected',
                    detected_amount: amount,
                    detected_at: new Date().toISOString(),
                  })
                  .eq('id', deposit.id);

                // Re-read the updated record and sweep
                const { data: updated } = await supabase
                  .from('deposit_addresses')
                  .select('*')
                  .eq('id', deposit.id)
                  .single();

                if (updated) {
                  await this.executeSweep(updated as DepositAddressRecord);
                }
              } else {
                // Partial on the other network — same rules
                const remaining = ethers.formatUnits(expected - balance, tokenInfo.decimals);
                console.log(`[SweepService] Partial on ${networkName}: ${amount}/${deposit.expected_amount}`);

                await supabase
                  .from('deposit_addresses')
                  .update({
                    status: 'partial',
                    detected_amount: amount,
                    detected_at: deposit.detected_at || new Date().toISOString(),
                  })
                  .eq('id', deposit.id);

                const isExpired = invoice?.expires_at && new Date(invoice.expires_at) < new Date();
                if (isExpired) {
                  const updatedDeposit = { ...deposit, network: networkName, token_address: tokenInfo.address, token_symbol: tokenInfo.symbol, token_decimals: tokenInfo.decimals };
                  await this.refundDeposit(updatedDeposit as DepositAddressRecord, balance);
                }
              }

              return; // found tokens, stop checking other networks for this deposit
            }
          }
        } catch {
          // RPC error, skip this network
        }
      }
    }
  }

  /**
   * Find the sender address by looking at recent Transfer events TO the deposit address.
   */
  private async findSenderAddress(deposit: DepositAddressRecord): Promise<string | null> {
    return this.findSenderOnNetwork(
      deposit.address,
      deposit.token_address,
      deposit.network as NetworkName
    );
  }

  private async findSenderOnNetwork(
    depositAddress: string,
    tokenAddress: string,
    network: NetworkName
  ): Promise<string | null> {
    try {
      const networkConfig = NETWORKS[network];
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
        name: networkConfig.name,
        chainId: networkConfig.chainId,
      });

      const token = new ethers.Contract(tokenAddress, [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ], provider);

      // Look at last 1000 blocks for Transfer events to the deposit address
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);

      const filter = token.filters.Transfer(null, depositAddress);
      const events = await token.queryFilter(filter, fromBlock, currentBlock);

      if (events.length > 0) {
        // Return the sender of the most recent transfer
        const lastEvent = events[events.length - 1];
        const args = (lastEvent as ethers.EventLog).args;
        return args[0] as string; // 'from' address
      }
    } catch (err: any) {
      console.error(`[SweepService] Error finding sender on ${network}:`, err.message);
    }

    return null;
  }

  /**
   * If an invoice was paid via wallet but there are tokens in the HD wallet,
   * refund them to the sender.
   */
  private async checkAndRefundOrphanedDeposit(deposit: DepositAddressRecord): Promise<void> {
    const network = deposit.network as NetworkName;
    const networkConfig = NETWORKS[network];

    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
      name: networkConfig.name,
      chainId: networkConfig.chainId,
    });

    const token = new ethers.Contract(deposit.token_address, ERC20_ABI, provider);
    const balance: bigint = await token.balanceOf(deposit.address);

    if (balance > 0n) {
      console.log(`[SweepService] Orphaned deposit: invoice paid via wallet but ${ethers.formatUnits(balance, deposit.token_decimals)} ${deposit.token_symbol} at HD address`);
      await this.refundDeposit(deposit, balance);
    } else {
      await this.updateStatus(deposit.id, 'expired', 'Invoice already paid via wallet');
    }
  }

  private async estimateGasNeeded(hdWallet: ethers.Wallet, numOps: number): Promise<bigint> {
    const provider = hdWallet.provider!;
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');

    // ~150k per operation (approve ~50k, payInvoice ~250k, transfer ~65k)
    const gasPerOp = 150_000n;
    const totalGas = gasPerOp * BigInt(numOps);
    const gasCost = totalGas * gasPrice;
    const buffered = (gasCost * BigInt(Math.floor(GAS_BUFFER * 100))) / 100n;

    return buffered;
  }

  private async updateStatus(id: string, status: string, error?: string): Promise<void> {
    await supabase
      .from('deposit_addresses')
      .update({ status, sweep_error: error || null })
      .eq('id', id);
  }
}

export const sweepService = new SweepService();
