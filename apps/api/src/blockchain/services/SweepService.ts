// src/blockchain/services/SweepService.ts
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { HDWalletService, type DepositAddressRecord } from './HDWalletService';
import { NETWORKS, type NetworkName } from '../config/networks';
import { CONTRACTS } from '../config/contracts';
import { TOKENS } from '../config/tokens';
import { getProvider, getWallet } from '../utils/web3';
import { sendTelegramAlert } from '../../utils/notify';
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

// Gas units reserved per operation. The node holds back gasLimit * maxFeePerGas
// up front, so these have to cover the gasLimit ethers estimates, not the gas
// actually burned (payInvoice estimates ~330k on Celo).
const GAS_APPROVE = 100_000n;
const GAS_PAY_INVOICE = 450_000n;
const GAS_TRANSFER = 120_000n;

// Sender lookup: how far back to scan, and how wide a single eth_getLogs may be
const MAX_SENDER_LOOKBACK_SECONDS = 6 * 3600;
const MAX_SENDER_LOOKBACK_BLOCKS = 120_000;
const LOG_PAGE_SIZE = 4_000;

// How long after expiry a deposit address is still watched for late arrivals.
// Bounded so expired rows eventually stop being polled forever.
const LATE_DEPOSIT_WINDOW_MS = 24 * 3600 * 1000;

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
      // `failed` is included on purpose: a deposit that ran out of sweep
      // retries still holds the payer's tokens, and once the invoice expires
      // the only correct ending for it is a refund. The retry budget is
      // enforced below instead of in the query, so giving up on sweeping is
      // never the same as giving up on the money.
      const { data: deposits, error } = await supabase
        .from('deposit_addresses')
        .select('*')
        .in('status', ['awaiting', 'partial', 'detected', 'sweeping', 'failed', 'expired']);

      if (error || !deposits || deposits.length === 0) return;

      for (const deposit of deposits as DepositAddressRecord[]) {
        try {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('status, expires_at')
            .eq('id', deposit.invoice_id)
            .single();

          // Invoice paid via wallet — anything at the HD address is extra
          if (invoice?.status === 'Paid') {
            await this.checkAndRefundOrphanedDeposit(deposit);
            continue;
          }

          // Past expiresAt the contract rejects payInvoice ("Invoice has
          // expired [PP]"), so no amount of retrying can settle this. Return
          // the funds instead of leaving them parked at a derived address.
          const expiresAt = invoice?.expires_at ? new Date(invoice.expires_at).getTime() : null;
          const isExpired = expiresAt !== null && expiresAt < Date.now();

          if (isExpired) {
            // Keep watching for a while after expiry. A payer who copied the
            // address and sent late would otherwise transfer into an address
            // nothing looks at again — the money simply disappears.
            if (Date.now() - expiresAt! <= LATE_DEPOSIT_WINDOW_MS) {
              await this.handleExpiredDeposit(deposit);
            }
            continue;
          }

          // Retries spent but still inside the window: leave it be. An operator
          // can revive it via /admin, and expiry will refund it if nobody does.
          if (deposit.sweep_retries >= MAX_RETRIES) continue;

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

  /**
   * Wind down a deposit whose invoice has expired.
   *
   * Whatever is at the address goes back to the payer — full, partial or
   * overpaid alike. Settling is no longer possible (PaymentProcessor reverts
   * once block.timestamp passes expiresAt), so holding the tokens would only
   * mean waiting for a human to notice.
   */
  private async handleExpiredDeposit(deposit: DepositAddressRecord): Promise<void> {
    const network = deposit.network as NetworkName;
    const token = new ethers.Contract(deposit.token_address, ERC20_ABI, getProvider(network));
    const balance: bigint = await token.balanceOf(deposit.address);

    if (balance === 0n) {
      if (deposit.status !== 'expired') {
        await this.updateStatus(deposit.id, 'expired', 'Invoice expired with no deposit');
      }
      return;
    }

    const amount = ethers.formatUnits(balance, deposit.token_decimals);
    console.log(
      `[SweepService] Expired holding ${amount} ${deposit.token_symbol} at ${deposit.address} — refunding`
    );
    await this.refundDeposit(deposit, balance);
  }

  private async checkDeposit(deposit: DepositAddressRecord, invoice: any): Promise<void> {
    const network = deposit.network as NetworkName;
    const provider = getProvider(network);

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

      // Still inside the window — keep waiting for the rest. Expiry is handled
      // by handleExpiredDeposit, which refunds whatever arrived.
    }
    // No deposit yet: nothing to do until it lands or the invoice expires.
  }

  private async executeSweep(deposit: DepositAddressRecord): Promise<void> {
    const network = deposit.network as NetworkName;
    const contracts = CONTRACTS[network];
    const backendKey = process.env.BACKEND_PRIVATE_KEY;

    if (!backendKey || !contracts?.DERAMP_PROXY) {
      await this.markFailed(deposit, 'Backend key or contract not configured');
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

      // Gas still owed by this sweep, so a retry only funds what's left to do
      const refundGas = overpayment > 0n ? GAS_TRANSFER : 0n;
      const pendingGas =
        (deposit.approve_tx_hash ? 0n : GAS_APPROVE) +
        (deposit.pay_invoice_tx_hash ? 0n : GAS_PAY_INVOICE + refundGas);

      // TX 1: Fund gas (tops up whatever is missing, including on retries)
      await this.ensureGas(deposit, hdWallet, hotWallet, pendingGas);

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

        // Re-check: approve burned gas and the base fee may have moved since
        await this.ensureGas(deposit, hdWallet, hotWallet, GAS_PAY_INVOICE + refundGas);

        const payTx = await proxyContract.payInvoice(
          blockchainInvoiceId,
          deposit.token_address,
          expectedAmount
        );
        await payTx.wait();

        console.log(`[SweepService] PayInvoice: ${payTx.hash}`);

        // Record settlement before anything else can throw. The steps below
        // (overpayment refund, gas return) are not part of the payment, but if
        // one of them fails and this hash is not on the row yet, the retry
        // re-runs payInvoice against an invoice the contract now considers
        // paid — it reverts five times and ends as a bogus "funds stuck" alert
        // on a sale that actually went through.
        deposit.pay_invoice_tx_hash = payTx.hash;
        await supabase
          .from('deposit_addresses')
          .update({ pay_invoice_tx_hash: payTx.hash })
          .eq('id', deposit.id);

        // Update invoice as paid — read fee from contract
        const paidAmount = parseFloat(deposit.expected_amount);
        let feePercent = 100; // default 1%
        try {
          const contracts = CONTRACTS[network];
          if (contracts?.ACCESS_MANAGER) {
            const readProvider = getProvider(network);
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

        // All token movement is done — recover the unused gas we funded
        await this.returnLeftoverGas(deposit, hdWallet, hotWallet);

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

      const retries = deposit.sweep_retries + 1;
      const exhausted = retries >= MAX_RETRIES;

      await supabase
        .from('deposit_addresses')
        .update({
          sweep_error: err.message,
          sweep_retries: retries,
          status: exhausted ? 'failed' : 'sweeping',
        })
        .eq('id', deposit.id);

      // Out of retries: pollCycle filters on sweep_retries < MAX_RETRIES, so
      // nothing will pick this up again. Tokens are sitting at the HD address.
      if (exhausted) {
        await this.alertSweepFailure({ ...deposit, sweep_retries: retries }, err.message);
      }
    }
  }

  /**
   * Return tokens from the HD address to whoever sent them.
   *
   * Reached two ways, and they mean different things to the merchant:
   *  - the invoice expired without settling → the payment never happened, so
   *    the invoice becomes `Refunded` (money came in and went back), never
   *    `Paid`;
   *  - the invoice was already settled from a wallet and extra tokens showed
   *    up at the deposit address → the payment stands, so the invoice is left
   *    exactly as it is. Overwriting a `Paid` invoice here would tell the
   *    merchant a completed sale had expired.
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
        // A balance read can run ahead of the log index — the tokens show up
        // before the event is queryable — so the first empty answer means
        // "not yet", not "never". Only give up once the attempts run out.
        const retries = deposit.sweep_retries + 1;

        if (retries < MAX_RETRIES) {
          await supabase
            .from('deposit_addresses')
            .update({
              sweep_retries: retries,
              sweep_error: `Payer not identified yet — retry ${retries}/${MAX_RETRIES}`,
            })
            .eq('id', deposit.id);

          console.warn(`[SweepService] Sender unknown for ${deposit.id}, retry ${retries}/${MAX_RETRIES}`);
          return;
        }

        await this.markFailed(
          { ...deposit, sweep_retries: retries },
          'Cannot refund: no Transfer found identifying the payer — manual refund needed'
        );
        return;
      }

      // Send gas for the refund transfer
      await this.ensureGas(deposit, hdWallet, hotWallet, GAS_TRANSFER);

      // Transfer tokens back to sender
      const refundTx = await tokenContract.transfer(senderAddress, amount);
      await refundTx.wait();

      const refundAmount = ethers.formatUnits(amount, deposit.token_decimals);
      console.log(`[SweepService] Refunded ${refundAmount} ${deposit.token_symbol} to ${senderAddress}`);

      await this.returnLeftoverGas(deposit, hdWallet, hotWallet);

      await supabase
        .from('deposit_addresses')
        .update({
          status: 'refunded',
          refund_tx_hash: refundTx.hash,
          sweep_error: `Refunded ${refundAmount} to ${senderAddress}`,
        })
        .eq('id', deposit.id);

      // Read the invoice fresh — it may have settled from a wallet while this
      // refund was in flight, and a settled sale must not be rewritten.
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', deposit.invoice_id)
        .single();

      if (invoice?.status === 'Paid') {
        console.log(
          `[SweepService] Invoice ${deposit.invoice_id} stays Paid — refund returned surplus tokens only`
        );
      } else {
        // Money arrived and went back, so the merchant sees `Refunded`, not
        // `Expired` (nothing came) and certainly not `Paid` (nothing settled).
        await supabase
          .from('invoices')
          .update({
            status: 'Refunded',
            refunded_at: new Date().toISOString(),
            // A late deposit flips an invoice the merchant already saw as
            // Expired. That earlier delivery set confirmation_url_response to
            // true, and the worker only picks up rows where it is false — so
            // without reopening it here the merchant's last word on this sale
            // stays "expired" and they never learn money arrived and went back.
            confirmation_url_response: false,
            confirmation_url_retries: 0,
          })
          .eq('id', deposit.invoice_id);

        console.log(`[SweepService] Invoice ${deposit.invoice_id} marked Refunded`);
      }

    } catch (err: any) {
      console.error(`[SweepService] Refund error for ${deposit.id}:`, err.message);
      await this.markFailed(deposit, `Refund failed: ${err.message}`);
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
          const provider = getProvider(networkName);

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
    // Cover the deposit's whole life, not a fixed guess: a refund usually runs
    // at expiry, an hour or more after the tokens actually arrived.
    const ageSeconds = deposit.created_at
      ? (Date.now() - new Date(deposit.created_at).getTime()) / 1000
      : 3600;

    return this.findSenderOnNetwork(
      deposit.address,
      deposit.token_address,
      deposit.network as NetworkName,
      Math.min(ageSeconds + 900, MAX_SENDER_LOOKBACK_SECONDS)
    );
  }

  /**
   * Find who funded a deposit address, by walking back through Transfer logs.
   *
   * Two things this must not assume. Block time differs by an order of
   * magnitude across our networks (~1s on Celo, ~0.25s on Arbitrum), so a
   * lookback expressed in blocks covers wildly different amounts of time and
   * quietly misses the transfer; it is derived from timestamps instead. And
   * public RPCs reject wide `eth_getLogs` ranges — Celo's forno starts failing
   * past ~5k blocks — so the range is paged rather than requested at once.
   */
  private async findSenderOnNetwork(
    depositAddress: string,
    tokenAddress: string,
    network: NetworkName,
    lookbackSeconds = 3600
  ): Promise<string | null> {
    const config = NETWORKS[network];
    const urls: string[] = config?.rpcUrls ?? [];

    // Ask each endpoint in turn rather than going through getProvider().
    // FallbackProvider only fails over on errors, and an endpoint whose log
    // index lags simply answers "no events" — a perfectly valid response that
    // is indistinguishable from "nothing happened". Refusing to refund someone
    // because the first node had not caught up yet is not acceptable, so a
    // negative answer is only trusted once every endpoint agrees.
    for (const url of urls) {
      try {
        const provider = new ethers.JsonRpcProvider(
          url,
          new ethers.Network(config.name, config.chainId),
          { staticNetwork: true }
        );

        const sender = await this.scanForSender(
          provider, depositAddress, tokenAddress, lookbackSeconds
        );
        if (sender) return sender;

        console.warn(`[SweepService] No Transfer to ${depositAddress} via ${url}`);
      } catch (err: any) {
        console.error(`[SweepService] Sender scan failed on ${url}:`, err.message);
      }
    }

    return null;
  }

  private async scanForSender(
    provider: ethers.JsonRpcProvider,
    depositAddress: string,
    tokenAddress: string,
    lookbackSeconds: number
  ): Promise<string | null> {
    {
      const token = new ethers.Contract(tokenAddress, [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ], provider);

      const currentBlock = await provider.getBlockNumber();
      const sample = Math.min(1000, currentBlock);
      const [head, past] = await Promise.all([
        provider.getBlock(currentBlock),
        provider.getBlock(currentBlock - sample),
      ]);

      const secondsPerBlock =
        head && past && head.timestamp > past.timestamp
          ? (head.timestamp - past.timestamp) / sample
          : 2;

      const span = Math.min(
        Math.ceil(lookbackSeconds / secondsPerBlock),
        MAX_SENDER_LOOKBACK_BLOCKS
      );
      const oldest = Math.max(0, currentBlock - span);
      const filter = token.filters.Transfer(null, depositAddress);

      for (let to = currentBlock; to >= oldest; to -= LOG_PAGE_SIZE) {
        const from = Math.max(oldest, to - LOG_PAGE_SIZE + 1);
        const events = await token.queryFilter(filter, from, to);

        if (events.length > 0) {
          // Most recent transfer in the newest page that has any
          const last = events[events.length - 1] as ethers.EventLog;
          return last.args[0] as string;
        }
        if (from === oldest) break;
      }
    }

    return null;
  }

  /**
   * If an invoice was paid via wallet but there are tokens in the HD wallet,
   * refund them to the sender.
   */
  private async checkAndRefundOrphanedDeposit(deposit: DepositAddressRecord): Promise<void> {
    const network = deposit.network as NetworkName;
    const provider = getProvider(network);

    const token = new ethers.Contract(deposit.token_address, ERC20_ABI, provider);
    const balance: bigint = await token.balanceOf(deposit.address);

    if (balance > 0n) {
      console.log(`[SweepService] Orphaned deposit: invoice paid via wallet but ${ethers.formatUnits(balance, deposit.token_decimals)} ${deposit.token_symbol} at HD address`);
      await this.refundDeposit(deposit, balance);
    } else if (deposit.pay_invoice_tx_hash) {
      // This deposit is what settled the invoice — the bookkeeping just never
      // finished (crash between marking the invoice Paid and the row `swept`).
      // Recording it as `expired` would deny a payment that demonstrably happened.
      await this.updateStatus(deposit.id, 'swept');
    } else {
      await this.updateStatus(deposit.id, 'expired', 'Invoice already paid via wallet');
    }
  }

  /**
   * Make sure the HD address holds enough native token to cover `gasUnits`.
   * Tops up the difference from the hot wallet — the amount already there
   * counts, so this is safe to call before every tx and on every retry.
   *
   * Prices at maxFeePerGas (~2 * baseFee + tip), which is what ethers puts on
   * the txs and what the node reserves. Pricing at eth_gasPrice underfunds by
   * roughly half and the tx bounces with INSUFFICIENT_FUNDS.
   */
  private async ensureGas(
    deposit: DepositAddressRecord,
    hdWallet: ethers.Wallet,
    hotWallet: ethers.Wallet,
    gasUnits: bigint
  ): Promise<void> {
    const provider = hdWallet.provider!;
    const feeData = await provider.getFeeData();
    const pricePerGas =
      feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');

    const needed =
      (gasUnits * pricePerGas * BigInt(Math.floor(GAS_BUFFER * 100))) / 100n;
    const balance = await provider.getBalance(deposit.address);
    if (balance >= needed) return;

    const topUp = needed - balance;
    const gasTx = await hotWallet.sendTransaction({
      to: deposit.address,
      value: topUp,
    });
    await gasTx.wait();

    await supabase
      .from('deposit_addresses')
      .update({ gas_tx_hash: gasTx.hash })
      .eq('id', deposit.id);
    deposit.gas_tx_hash = gasTx.hash;

    console.log(
      `[SweepService] Gas funded ${ethers.formatEther(topUp)} to ${deposit.address}: ${gasTx.hash}`
    );
  }

  private async updateStatus(id: string, status: string, error?: string): Promise<void> {
    await supabase
      .from('deposit_addresses')
      .update({ status, sweep_error: error || null })
      .eq('id', id);
  }

  /**
   * Mark a deposit as failed AND alert, so stuck funds are never silent.
   * Every path that gives up on a deposit holding (or possibly holding) tokens
   * goes through here — otherwise the only signal is the payer seeing an error
   * in the checkout, which is not a signal we ever receive.
   */
  private async markFailed(deposit: DepositAddressRecord, reason: string): Promise<void> {
    // Alert on the transition only. Expired deposits stay in the poll set so a
    // refund can be re-attempted (a null sender is usually a flaky log query),
    // and without this guard each retry would fire another alert every cycle.
    const alreadyFailed = deposit.status === 'failed';

    await this.updateStatus(deposit.id, 'failed', reason);
    if (!alreadyFailed) await this.alertSweepFailure(deposit, reason);
  }

  private async alertSweepFailure(deposit: DepositAddressRecord, reason: string): Promise<void> {
    try {
      // Null-safe on purpose: an alert that throws is an alert nobody gets,
      // which is the exact failure this whole path exists to prevent.
      const esc = (s: unknown) =>
        String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const explorer = NETWORKS[deposit.network as NetworkName]?.blockExplorer;
      const amount = deposit.detected_amount || deposit.expected_amount;
      const addressLine = explorer
        ? `<a href="${explorer}/address/${deposit.address}">${deposit.address}</a>`
        : `<code>${deposit.address}</code>`;

      const text = [
        '🚨 <b>Sweep fallido — fondos atrapados</b>',
        '',
        `<b>Invoice:</b> <code>${esc(deposit.invoice_id)}</code>`,
        `<b>Monto:</b> ${esc(amount)} ${esc(deposit.token_symbol)}`,
        `<b>Red:</b> ${esc(deposit.network)}`,
        `<b>Dirección HD:</b> ${addressLine}`,
        `<b>Índice derivación:</b> ${deposit.derivation_index}`,
        `<b>Reintentos:</b> ${deposit.sweep_retries}/${MAX_RETRIES}`,
        '',
        `<b>Error:</b> <code>${esc(reason).slice(0, 600)}</code>`,
        '',
        `Reintentar: <code>POST /admin/invoices/${esc(deposit.invoice_id)}/retry</code>`,
      ].join('\n');

      await sendTelegramAlert(`sweep_failed_${deposit.id}`, text);
    } catch (err: any) {
      // Alerting must never be what breaks the sweep
      console.error(`[SweepService] Alert failed for ${deposit.id}:`, err.message);
    }
  }

  /**
   * Send whatever native token is left at the HD address back to the hot
   * wallet. Funding is deliberately generous (buffered, priced at
   * maxFeePerGas), so most sweeps leave a usable remainder behind — without
   * this it just accumulates across every derived address, unreachable to
   * anything but a manual script.
   *
   * Best-effort by design: the invoice is already paid by the time this runs,
   * so a failure here is logged and swallowed rather than failing the sweep.
   */
  private async returnLeftoverGas(
    deposit: DepositAddressRecord,
    hdWallet: ethers.Wallet,
    hotWallet: ethers.Wallet
  ): Promise<bigint> {
    try {
      const provider = hdWallet.provider!;
      const feeData = await provider.getFeeData();
      const pricePerGas =
        feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');

      const balance = await provider.getBalance(deposit.address);
      const cost = 21_000n * pricePerGas;

      // Below this the transfer costs more than it recovers
      if (balance <= cost * 3n) return 0n;

      // Pin the price we budgeted for: letting ethers re-quote at send time
      // means a base fee tick makes the tx cost more than we left behind.
      const value = balance - cost;
      const tx = await hdWallet.sendTransaction({
        to: hotWallet.address,
        value,
        gasLimit: 21_000n,
        maxFeePerGas: pricePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      });
      await tx.wait();

      console.log(
        `[SweepService] Leftover gas returned ${ethers.formatEther(value)} from ${deposit.address}: ${tx.hash}`
      );
      return value;
    } catch (err: any) {
      console.error(`[SweepService] Leftover gas return failed for ${deposit.id}:`, err.message);
      return 0n;
    }
  }

  /**
   * Manual recovery for HD addresses still holding native token — deposits
   * swept before leftover-return existed, or ones that failed midway.
   * Exposed for the admin route; the sweep calls the private path directly.
   */
  async recoverLeftoverGas(depositId: string): Promise<{
    address: string;
    network: string;
    returned: string;
    remaining: string;
  }> {
    const { data: deposit, error } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('id', depositId)
      .single();

    if (error || !deposit) throw new Error('Deposit not found');

    const backendKey = process.env.BACKEND_PRIVATE_KEY;
    if (!backendKey) throw new Error('BACKEND_PRIVATE_KEY not configured');

    const network = deposit.network as NetworkName;
    const hdWallet = HDWalletService.deriveWallet(deposit.derivation_index, network);
    const hotWallet = getWallet(backendKey, network, false);

    const returned = await this.returnLeftoverGas(deposit as DepositAddressRecord, hdWallet, hotWallet);
    const remaining = await getProvider(network).getBalance(deposit.address);

    return {
      address: deposit.address,
      network: deposit.network,
      returned: ethers.formatEther(returned),
      remaining: ethers.formatEther(remaining),
    };
  }
}

export const sweepService = new SweepService();
