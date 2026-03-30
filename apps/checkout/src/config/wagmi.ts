import { createConfig, http } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { getAllEnabledChains } from './chains';

const enabledChains = getAllEnabledChains();

export const config = createConfig({
  chains: enabledChains as any,
  connectors: [
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    }),
    coinbaseWallet({
      appName: 'Voulti',
    }),
  ],
  transports: enabledChains.reduce((acc, chain) => {
    acc[chain.id] = http();
    return acc;
  }, {} as Record<number, any>),
});
