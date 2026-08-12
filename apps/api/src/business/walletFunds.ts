// src/business/walletFunds.ts
//
// What a commerce holds in its own wallet, as opposed to what Voulti collected
// for it.
//
// These are two different pots and only one of them is Voulti's. Money that
// arrived through a checkout is credited inside the settlement contract and
// leaves via withdrawal. Money sent straight to the wallet — a donor who copied
// the address off a page, a transfer from an exchange — is already where it was
// going, and Voulti neither sees it nor can move it.
//
// It still has to be shown and spendable, because Voulti creates that wallet:
// signing up with email mints a Privy embedded wallet, and a merchant who never
// chose to have one has nowhere else to use it. A dashboard that displays only
// the contract balance leaves them holding funds they cannot see, in a wallet
// they cannot spend from — which is a trap, not an omission.

import { ethers } from 'ethers';
import { NETWORKS, type NetworkName } from '../blockchain/config/networks';
import { TOKENS } from '../blockchain/config/tokens';
import { getProvider, getWallet } from '../blockchain/utils/web3';
import { GAS_TRANSFER, GAS_BUFFER } from '../blockchain/config/gas';
import { getNetworkGasHealth } from './networkGasHealth';

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

export interface WalletTokenBalance {
  network: string;
  chainId: number;
  symbol: string;
  address: string;
  decimals: number;
  balance: string;
  /** Whether the wallet can pay for a transfer of it right now. */
  hasGas: boolean;
}

/**
 * Everything the wallet holds directly, across every production network.
 *
 * Zero balances are dropped: a merchant looking for their money wants the two
 * lines that matter, not forty rows of nothing.
 */
export async function getWalletBalances(wallet: string): Promise<WalletTokenBalance[]> {
  const names = Object.keys(NETWORKS).filter(n => n !== 'hardhat');

  const perNetwork = await Promise.all(
    names.map(async (network) => {
      const tokens = Object.values(TOKENS[network] || {});
      if (tokens.length === 0) return [];

      try {
        const provider = getProvider(network);
        const config = NETWORKS[network as NetworkName];

        const [native, feeData, ...balances] = await Promise.all([
          provider.getBalance(wallet),
          provider.getFeeData(),
          ...tokens.map(t =>
            new ethers.Contract(t.address, ERC20_ABI, provider).balanceOf(wallet).catch(() => 0n)
          ),
        ]);

        const pricePerGas =
          feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
        const hasGas = native >= gasNeededForTransfer(pricePerGas);

        return tokens
          .map((token, i) => ({
            network,
            chainId: config.chainId,
            symbol: token.symbol,
            address: token.address,
            decimals: token.decimals,
            balance: ethers.formatUnits(balances[i] as bigint, token.decimals),
            hasGas,
          }))
          .filter(b => Number(b.balance) > 0);
      } catch {
        // One unreachable RPC must not blank out the other four networks.
        return [];
      }
    })
  );

  return perNetwork.flat();
}

/** Native token a single ERC20 transfer needs, priced the way ensureGas prices it. */
function gasNeededForTransfer(pricePerGas: bigint): bigint {
  return (GAS_TRANSFER * pricePerGas * BigInt(Math.floor(GAS_BUFFER * 100))) / 100n;
}

export type FundGasOutcome =
  | { funded: true; txHash: string; amount: string }
  | { funded: false; reason: 'already-funded' | 'nothing-to-move' | 'network-low' | 'not-configured' };

/**
 * Send the wallet just enough native token to sign one transfer.
 *
 * The merchant signs the transfer themselves — Voulti never holds their keys —
 * so the only thing standing between them and their own money is a gas balance
 * they have no way to obtain. Especially on Base or Arbitrum, where getting a
 * few cents of ETH is a harder errand than the transfer itself.
 *
 * Two guards keep this from being a faucet. It funds only a wallet that
 * actually holds a token worth moving, and only up to what one transfer costs,
 * so repeat calls top up a few cents at most and stop the moment the wallet can
 * afford to send. It also defers to the same gas health check the deposit gate
 * uses: paying for a merchant's convenience must never be what leaves a sweep
 * unable to rescue somebody's payment.
 */
export async function fundWalletGas(wallet: string, network: string): Promise<FundGasOutcome> {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey || !NETWORKS[network as NetworkName]) return { funded: false, reason: 'not-configured' };

  const provider = getProvider(network);
  const tokens = Object.values(TOKENS[network] || {});

  const balances = await Promise.all(
    tokens.map(t =>
      new ethers.Contract(t.address, ERC20_ABI, provider).balanceOf(wallet).catch(() => 0n)
    )
  );
  if (!balances.some((b: bigint) => b > 0n)) return { funded: false, reason: 'nothing-to-move' };

  const [native, feeData] = await Promise.all([provider.getBalance(wallet), provider.getFeeData()]);
  const pricePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
  const needed = gasNeededForTransfer(pricePerGas);

  if (native >= needed) return { funded: false, reason: 'already-funded' };

  // Sweeps come first. A merchant waiting a minute for gas is an inconvenience;
  // a deposit that cannot be swept is someone else's money stuck at an address.
  const health = await getNetworkGasHealth(network);
  if (!health.depositEnabled) return { funded: false, reason: 'network-low' };

  const hot = getWallet(backendKey, network, false);
  const tx = await hot.sendTransaction({ to: wallet, value: needed - native });
  await tx.wait();

  return { funded: true, txHash: tx.hash, amount: ethers.formatEther(needed - native) };
}
