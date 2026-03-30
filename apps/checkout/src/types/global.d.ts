interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, handler: (data: any) => void) => void;
    removeListener: (event: string, handler: (data: any) => void) => void;
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isTrust?: boolean;
    isRainbow?: boolean;
    isPhantom?: boolean;
    selectedAddress?: string;
    chainId?: string;
  };
  vConsole?: {
    show: () => void;
    hide: () => void;
  };
} 