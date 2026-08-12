// src/blockchain/config/gas.ts
//
// Gas units reserved per operation, shared by the code that spends the gas
// (SweepService) and the code that decides whether there is enough of it
// (networkGasHealth). They live here rather than next to the sweeper because
// the two must never disagree: a gate that reserves less than the sweeper
// spends reports a network as healthy right up to the moment a deposit gets
// stuck, which is the exact failure the gate exists to prevent.
//
// The node holds back gasLimit * maxFeePerGas up front, so these have to cover
// the gasLimit ethers estimates, not the gas actually burned (payInvoice
// estimates ~330k on Celo).

export const GAS_APPROVE = 100_000n;
export const GAS_PAY_INVOICE = 450_000n;
export const GAS_TRANSFER = 120_000n;

/** Multiplier applied on top of a priced estimate before funding an address. */
export const GAS_BUFFER = 1.5;

// Paid by the hot wallet directly rather than by the derived address: the
// on-chain invoice, when the sweep is the first to need one, and the transfer
// that funds the derived address. Measured on Celo mainnet over 15 production
// transactions — createInvoice burns 271k median, 288k worst — then rounded up
// to leave room for a payment option list longer than the ones seen so far.
export const GAS_CREATE_INVOICE = 300_000n;
export const GAS_FUND_TX = 21_000n;

/**
 * Native token the hot wallet must be able to put up to carry one deposit all
 * the way to a paid invoice, priced at `pricePerGas`.
 *
 * Most of it comes back — the derived address returns what it did not burn via
 * returnLeftoverGas — but it has to be there before the sweep starts, so this
 * is what a balance has to clear per deposit in flight, not what a deposit
 * ultimately costs. Budgeting against the cost instead would leave the hot
 * wallet unable to start sweeps it can easily afford to finish.
 */
export function reservePerSweep(pricePerGas: bigint): bigint {
  const paidDirectly = (GAS_CREATE_INVOICE + GAS_FUND_TX) * pricePerGas;

  // Funded into the derived address, buffered the same way ensureGas does it
  const fundedIntoAddress =
    ((GAS_APPROVE + GAS_PAY_INVOICE + GAS_TRANSFER) *
      pricePerGas *
      BigInt(Math.floor(GAS_BUFFER * 100))) /
    100n;

  return paidDirectly + fundedIntoAddress;
}
