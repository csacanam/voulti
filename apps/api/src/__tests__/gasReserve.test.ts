import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import {
  reservePerSweep,
  GAS_APPROVE,
  GAS_PAY_INVOICE,
  GAS_TRANSFER,
  GAS_CREATE_INVOICE,
  GAS_FUND_TX,
  GAS_BUFFER,
} from '../blockchain/config/gas';

const gwei = (n: string) => ethers.parseUnits(n, 'gwei');

describe('reservePerSweep', () => {
  it('covers every transaction the hot wallet pays for on one deposit', () => {
    const price = gwei('100');

    // Nothing the sweep does may fall outside the reserve, or the gate reports
    // headroom the sweeper cannot actually use.
    const everythingUnbuffered =
      (GAS_CREATE_INVOICE + GAS_FUND_TX + GAS_APPROVE + GAS_PAY_INVOICE + GAS_TRANSFER) * price;

    expect(reservePerSweep(price)).toBeGreaterThan(everythingUnbuffered);
  });

  it('buffers the funded portion the same way ensureGas does', () => {
    const price = gwei('100');

    const expected =
      (GAS_CREATE_INVOICE + GAS_FUND_TX) * price +
      ((GAS_APPROVE + GAS_PAY_INVOICE + GAS_TRANSFER) *
        price *
        BigInt(Math.floor(GAS_BUFFER * 100))) /
        100n;

    expect(reservePerSweep(price)).toBe(expected);
  });

  it('scales linearly with gas price', () => {
    expect(reservePerSweep(gwei('200'))).toBe(reservePerSweep(gwei('100')) * 2n);
  });

  it('reserves more than a Celo sweep has ever actually burned', () => {
    // Measured on Celo mainnet: createInvoice 288k worst case, payInvoice 310k
    // worst case, plus a 55k approve and two 21k transfers. The reserve is
    // priced at maxFeePerGas, so at the same price it must clear the real burn
    // with room to spare — that headroom is what survives a base fee tick
    // between funding and sending.
    const price = gwei('402.5');
    const worstObservedBurn = (288_351n + 310_226n + 55_000n + 21_000n + 21_000n) * price;

    expect(reservePerSweep(price)).toBeGreaterThan(worstObservedBurn);
  });

  it('stays within a sane fraction of a small donation', () => {
    // Celo at its current 402.5 gwei maxFee. A reserve that quietly grew past
    // a few cents would mean the gate disables networks that are fine.
    const reserveCelo = Number(ethers.formatEther(reservePerSweep(gwei('402.5')))) * 0.062421;
    expect(reserveCelo).toBeLessThan(0.05);
  });
});
