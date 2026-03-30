import { detect } from 'detect-browser';

// Wallet configurations based on Daimo Pay
export interface WalletConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  deeplinkScheme?: string;
  downloadUrls: {
    chrome?: string;
    firefox?: string;
    brave?: string;
    edge?: string;
    safari?: string;
    android?: string;
    ios?: string;
  };
  isInstalled?: boolean;
}

// Deep link schemes for different wallets
export const WALLET_CONFIGS: { [key: string]: WalletConfig } = {
  'metaMask': {
    id: 'metaMask',
    name: 'MetaMask',
    shortName: 'MetaMask',
    icon: '🦊',
    deeplinkScheme: 'metamask://',
    downloadUrls: {
      chrome: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
      firefox: 'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/',
      brave: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
      edge: 'https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
      ios: 'https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202'
    }
  },
  'coinbaseWallet': {
    id: 'coinbaseWallet',
    name: 'Base App',
    shortName: 'Base',
    icon: '🪙',
    deeplinkScheme: 'cbwallet://',
    downloadUrls: {
      chrome: 'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad',
      android: 'https://play.google.com/store/apps/details?id=org.toshi',
      ios: 'https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455'
    }
  },
  'trustWallet': {
    id: 'trustWallet',
    name: 'Trust Wallet',
    shortName: 'Trust',
    icon: '🛡️',
    deeplinkScheme: 'trust://',
    downloadUrls: {
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
    }
  },
  'rainbow': {
    id: 'rainbow',
    name: 'Rainbow',
    shortName: 'Rainbow',
    icon: '🌈',
    deeplinkScheme: 'rainbow://',
    downloadUrls: {
      android: 'https://play.google.com/store/apps/details?id=me.rainbow',
      ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021'
    }
  },
  'phantom': {
    id: 'phantom',
    name: 'Phantom',
    shortName: 'Phantom',
    icon: '👻',
    deeplinkScheme: 'phantom://',
    downloadUrls: {
      chrome: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
      android: 'https://play.google.com/store/apps/details?id=app.phantom',
      ios: 'https://apps.apple.com/app/phantom-crypto-wallet/1598432977'
    }
  },

};

// Detect browser type
export function detectBrowser() {
  const browser = detect();
  if (!browser) return 'chrome';
  
  const name = browser.name?.toLowerCase();
  if (name?.includes('firefox')) return 'firefox';
  if (name?.includes('safari')) return 'safari';
  if (name?.includes('edge')) return 'edge';
  if (name?.includes('brave')) return 'brave';
  return 'chrome';
}

// Check if wallet is installed
export function isWalletInstalled(walletId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  switch (walletId) {
    case 'metaMask':
      return !!(window.ethereum && window.ethereum.isMetaMask);
    case 'coinbaseWallet':
      return !!(window.ethereum && window.ethereum.isCoinbaseWallet);
    case 'trustWallet':
      return !!(window.ethereum && window.ethereum.isTrust);
    case 'rainbow':
      return !!(window.ethereum && window.ethereum.isRainbow);
    case 'phantom':
      return !!(window.ethereum && window.ethereum.isPhantom);
    default:
      return false;
  }
}

// Get deep link for wallet
export function getWalletDeepLink(walletId: string, url: string): string | null {
  const wallet = WALLET_CONFIGS[walletId];
  if (!wallet?.deeplinkScheme) return null;
  
  // Use the URL as-is for development (don't force HTTPS)
  const cleanUrl = url;
  const encodedUrl = encodeURIComponent(cleanUrl);
  
  console.log(`🔗 Generating deep link for ${walletId}`);
  console.log(`🌐 Input URL:`, url);
  console.log(`🧹 Cleaned URL:`, cleanUrl);
  
  switch (walletId) {
    case 'metaMask':
      // MetaMask mobile: try different formats to trigger automatic connection
      // Format 1: Daimo's format with connection parameters
      const metamaskUrl1 = `https://metamask.app.link/dapp/${cleanUrl.replace(/^https?:\/\//, '')}?action=connect&source=deramp`;
      
      // Format 2: Alternative format that might trigger connection
      const metamaskUrl2 = `https://metamask.app.link/dapp/${cleanUrl.replace(/^https?:\/\//, '')}?connect=true`;
      
      // Format 3: Direct deep link format
      const metamaskUrl3 = `metamask://dapp?url=${encodedUrl}&action=connect`;
      
      console.log(`🦊 MetaMask deep link options:`);
      console.log(`  1. App link with params:`, metamaskUrl1);
      console.log(`  2. App link connect:`, metamaskUrl2);
      console.log(`  3. Direct deep link:`, metamaskUrl3);
      
      // Try the first format (most likely to work like Daimo)
      return metamaskUrl1;
      
    case 'coinbaseWallet':
      // Base/Coinbase mobile: use same format as Daimo Pay
      const baseUrl = `cbwallet://dapp?url=${encodedUrl}`;
      console.log(`🪙 Base deep link:`, baseUrl);
      return baseUrl;
    case 'trustWallet':
      return `trust://browser?url=${encodedUrl}`;
    case 'rainbow':
      // Rainbow mobile: use same format as Daimo Pay
      const rainbowUrl = `rainbow://dapp?url=${encodedUrl}`;
      console.log(`🌈 Rainbow deep link:`, rainbowUrl);
      return rainbowUrl;
    case 'phantom':
      return `phantom://browse/${encodedUrl}`;

    default:
      return null;
  }
}

// Get download URL for wallet based on browser/device
export function getWalletDownloadUrl(walletId: string): string | null {
  const wallet = WALLET_CONFIGS[walletId];
  if (!wallet) return null;
  
  const browser = detectBrowser();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return isIOS ? wallet.downloadUrls.ios : wallet.downloadUrls.android;
  }
  
  return wallet.downloadUrls[browser as keyof typeof wallet.downloadUrls] || wallet.downloadUrls.chrome;
}

// Get available wallets for current device
export function getAvailableWallets(): WalletConfig[] {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return Object.values(WALLET_CONFIGS)
    .map(wallet => ({
      ...wallet,
      isInstalled: isWalletInstalled(wallet.id)
    }))
    .filter(wallet => {
      // On mobile, prioritize wallets that have mobile apps
      if (isMobile) {
        return wallet.downloadUrls.android || wallet.downloadUrls.ios;
      }
      // On desktop, prioritize wallets with browser extensions
      return wallet.downloadUrls.chrome || wallet.downloadUrls.firefox;
    })
    .sort((a, b) => {
      // Sort by: installed first, then by name
      if (a.isInstalled && !b.isInstalled) return -1;
      if (!a.isInstalled && b.isInstalled) return 1;
      return a.name.localeCompare(b.name);
    });
}

// Open wallet with deep link
export async function openWallet(walletId: string, url: string): Promise<boolean> {
  const deepLink = getWalletDeepLink(walletId, url);
  if (!deepLink) return false;
  
  try {
    console.log(`🔗 Opening ${walletId} with deep link:`, deepLink);
    console.log(`🌐 Original URL:`, url);
    
    // Use URL as-is for development
    console.log(`🧹 Using URL as-is:`, url);
    
    // Open deep link
    window.location.href = deepLink;
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to open ${walletId}:`, error);
    return false;
  }
}
