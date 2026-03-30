import React from "react";

// MetaMask Logo - Exact copy from Daimo Pay
export const MetaMaskLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 142 137"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#FF5C16"
      d="m132.24 131.751-30.481-9.076-22.986 13.741-16.038-.007-23-13.734-30.467 9.076L0 100.465l9.268-34.723L0 36.385 9.268 0l47.607 28.443h27.757L132.24 0l9.268 36.385-9.268 29.357 9.268 34.723-9.268 31.286Z"
    />
    <path
      fill="#FF5C16"
      d="m9.274 0 47.608 28.463-1.893 19.534L9.274 0Zm30.468 100.478 20.947 15.957-20.947 6.24v-22.197Zm19.273-26.381L54.989 48.01l-25.77 17.74-.014-.007v.013l.08 18.26 10.45-9.918h19.28ZM132.24 0 84.632 28.463l1.887 19.534L132.24 0Zm-30.467 100.478-20.948 15.957 20.948 6.24v-22.197Zm10.529-34.723h.007-.007v-.013l-.006.007-25.77-17.739L82.5 74.097h19.272l10.457 9.917.073-18.259Z"
    />
    <path
      fill="#E34807"
      d="m39.735 122.675-30.467 9.076L0 100.478h39.735v22.197ZM59.008 74.09l5.82 37.714-8.066-20.97-27.49-6.82 10.456-9.923h19.28Zm42.764 48.585 30.468 9.076 9.268-31.273h-39.736v22.197ZM82.5 74.09l-5.82 37.714 8.065-20.97 27.491-6.82-10.463-9.923H82.5Z"
    />
    <path
      fill="#FF8D5D"
      d="m0 100.465 9.268-34.723h19.93l.073 18.266 27.492 6.82 8.065 20.969-4.146 4.618-20.947-15.957H0v.007Zm141.508 0-9.268-34.723h-19.931l-.073 18.266-27.49 6.82-8.066 20.969 4.145 4.618 20.948-15.957h39.735v.007ZM84.632 28.443H56.875L54.99 47.977l9.839 63.8H76.68l9.845-63.8-1.893-19.534Z"
    />
    <path
      fill="#661800"
      d="M9.268 0 0 36.385l9.268 29.357h19.93l25.784-17.745L9.268 0Zm43.98 81.665h-9.029l-4.916 4.819 17.466 4.33-3.521-9.155v.006ZM132.24 0l9.268 36.385-9.268 29.357h-19.931L86.526 47.997 132.24 0ZM88.273 81.665h9.042l4.916 4.825-17.486 4.338 3.528-9.17v.007Zm-9.507 42.305 2.06-7.542-4.146-4.618H64.82l-4.145 4.618 2.059 7.542"
    />
    <path fill="#C0C4CD" d="M78.766 123.969v12.453H62.735v-12.453h16.03Z" />
    <path
      fill="#E7EBF6"
      d="m39.742 122.662 23.006 13.754v-12.453l-2.06-7.541-20.946 6.24Zm62.031 0-23.007 13.754v-12.453l2.06-7.541 20.947 6.24Z"
    />
  </svg>
);

// Base (Coinbase Wallet) Logo - Exact copy from Daimo Pay
export const BaseLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_1249_2063)">
      <path
        fill="#fff"
        d="M25.778 32H6.222A6.22 6.22 0 0 1 0 25.778V6.222A6.22 6.22 0 0 1 6.222 0h19.556A6.22 6.22 0 0 1 32 6.222v19.556A6.22 6.22 0 0 1 25.778 32"
      ></path>
      <rect width="20" height="20" x="6" y="6" fill="#00F" rx="1"></rect>
    </g>
    <defs>
      <clipPath id="clip0_1249_2063">
        <path fill="#fff" d="M0 0h32v32H0z"></path>
      </clipPath>
    </defs>
  </svg>
);

// Trust Wallet Logo - Exact copy from Daimo Pay using base64
export const TrustWalletLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => {
  const trust_white = "data:image/png;base64,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";
  
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundSize: "100% 100%",
        backgroundImage: `url("${trust_white}")`,
        borderRadius: "22.5%",
      }}
    >
      <></>
    </svg>
  );
};

// Rainbow Wallet Logo - Exact copy from Daimo Pay using base64
export const RainbowLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => {
  const withBackground = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzhIMjZDNTYuOTI3OSAzOCA4MiA2My4wNzIxIDgyIDk0VjEwMEg5NEM5Ny4zMTM3IDEwMCAxMDAgOTcuMzEzNyAxMDAgOTRDMTAwIDUzLjEzMDkgNjYuODY5MSAyMCAyNiAyMEMyMi42ODYzIDIwIDIwIDIyLjY4NjMgMjAgMjZWMzhaIiBmaWxsPSJ1cmwoI3BhaW50MV9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNODQgOTRIMTAwQzEwMCA5Ny4zMTM3IDk3LjMxMzcgMTAwIDk0IDEwMEg4NFY5NFoiIGZpbGw9InVybCgjcGFpbnQyX2xpbmVhcl82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiAyMEwyNiAzNkgyMEwyMCAyNkMyMCAyMi42ODYzIDIyLjY4NjMgMjAgMjYgMjBaIiBmaWxsPSJ1cmwoI3BhaW50M19saW5lYXJfNjJfMzI5KSIvPgo8cGF0aCBkPSJNMjAgMzZIMjJDNTguMDMyNSAzNiA4NCA2MS45Njc1IDg0IDk0VjEwMEg2NlY5NEM2NiA3MS45MDg2IDQ4LjA5MTQgNTQgMjYgNTRIMjBWMzZaIiBmaWxsPSJ1cmwoI3BhaW50NF9yYWRpYWxfNjJfMzI5KSIvPgo8cGF0aCBkPSJNNjggOTRIODRWMTAwSDY4Vjk0WiIgZmlsbD0idXJsKCNwYWludDVfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDUyTDIwIDM2TDI2IDM2TDI2IDUySDIwWiIgZmlsbD0idXJsKCNwYWludDZfbGluZWFyXzYyXzMyOSkiLz4KPHBhdGggZD0iTTIwIDYyQzIwIDY1LjMxMzcgMjIuNjg2MyA2OCAyNiA2OEM0MC4zNTk0IDY4IDUyIDc5LjY0MDYgNTIgOTRDNTIgOTcuMzEzNyA1NC42ODYzIDEwMCA1OCAxMDBINjhWOTRDNjggNzAuODA0IDQ5LjE5NiA1MiAyNiA1MkgyMFY2MloiIGZpbGw9InVybCgjcGFpbnQ3X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik01MiA5NEg2OFYxMDBINThDNTQuNjg2MyAxMDAgNTIgOTcuMzEzNyA1MiA5NFoiIGZpbGw9InVybCgjcGFpbnQ4X3JhZGlhbF82Ml8zMjkpIi8+CjxwYXRoIGQ9Ik0yNiA2OEMyMi42ODYzIDY4IDIwIDY1LjMxMzcgMjAgNjJMMjAgNTJMMjYgNTJMMjYgNjhaIiBmaWxsPSJ1cmwoI3BhaW50OV9yYWRpYWxfNjJfMzI5KSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzYyXzMyOSIgeDE9IjYwIiB5MT0iMCIgeDI9IjYwIiB5Mj0iMTIwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxNzQyOTkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDAxRTU5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQxX3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjYgOTQpIHJvdGF0ZSgtOTApIHNjYWxlKDc0KSI+CjxzdG9wIG9mZnNldD0iMC43NzAyNzciIHN0b3AtY29sb3I9IiNGRjQwMDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODc1NEM5Ii8+CjwvcmFkaWFsR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQyX2xpbmVhcl82Ml8zMjkiIHgxPSI4MyIgeTE9Ijk3IiB4Mj0iMTAwIiB5Mj0iOTciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGNDAwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDNfbGluZWFyXzYyXzMyOSIgeDE9IjIzIiB5MT0iMjAiIHgyPSIyMyIgeTI9IjM3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM4NzU0QzkiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY0MDAwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ0X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgyNiA5NCkgcm90YXRlKC05MCkgc2NhbGUoNTgpIj4KPHN0b3Agb2Zmc2V0PSIwLjcyMzkyOSIgc3RvcC1jb2xvcj0iI0ZGRjcwMCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjk5MDEiLz4KPC9yYWRpYWxHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDVfbGluZWFyXzYyXzMyOSIgeDE9IjY4IiB5MT0iOTciIHgyPSI4NCIgeTI9Ijk3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNGRkY3MDAiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRkY5OTAxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQ2X2xpbmVhcl82Ml8zMjkiIHgxPSIyMyIgeTE9IjUyIiB4Mj0iMjMiIHkyPSIzNiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjRkZGNzAwIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI0ZGOTkwMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50N19yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDI2IDk0KSByb3RhdGUoLTkwKSBzY2FsZSg0MikiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDBBQUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAxREE0MCIvPgo8L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50OF9yYWRpYWxfNjJfMzI5IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDUxIDk3KSBzY2FsZSgxNyA0NS4zMzMzKSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMEFBRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDFEQTQwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0icGFpbnQ5X3JhZGlhbF82Ml8zMjkiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgyMyA2OSkgcm90YXRlKC05MCkgc2NhbGUoMTcgMzIyLjM3KSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMEFBRkYiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDFEQTQwIi8+CjwvcmFkaWFsR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==";
  
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundSize: "100% 100%",
        backgroundImage: `url("${withBackground}")`,
      }}
    >
      <></>
    </svg>
  );
};

// Phantom Wallet Logo - Exact copy from Daimo Pay
export const PhantomLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 88 88"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ background: "#AB9FF2" }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M37.7425 57.0705C34.1942 62.3362 28.2483 69 20.3366 69C16.5965 69 13.0001 67.5093 13 61.0322C12.9997 44.5362 36.2555 19.0003 57.8334 19C70.1084 18.9998 75 27.2474 75 36.6136C75 48.6357 66.9442 62.3824 58.9368 62.3824C56.3955 62.3824 55.1487 61.031 55.1487 58.888C55.1487 58.3288 55.2442 57.7228 55.4365 57.0705C52.7029 61.5902 47.4285 65.7849 42.4896 65.7849C38.8933 65.7849 37.0713 63.5944 37.0713 60.5187C37.0713 59.4003 37.311 58.2357 37.7425 57.0705ZM53.7586 31.6834C51.8054 31.6868 50.4738 33.2938 50.478 35.5864C50.4822 37.879 51.8198 39.5273 53.7729 39.5241C55.6789 39.5208 57.0099 37.8679 57.0058 35.5752C57.0016 33.2827 55.6646 31.6802 53.7586 31.6834ZM64.1193 31.6725C62.1661 31.6759 60.8345 33.2829 60.8387 35.5755C60.8429 37.868 62.1798 39.5164 64.1336 39.5131C66.0396 39.5099 67.3706 37.8569 67.3664 35.5643C67.3622 33.2718 66.0253 31.6693 64.1193 31.6725Z"
      fill={"#ffffff"}
    />
  </svg>
);

// WalletConnect Logo - Blue with connection dots
export const WalletConnectLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="32" rx="16" fill="#3B99FC"/>
    <circle cx="12" cy="16" r="2" fill="white"/>
    <circle cx="20" cy="16" r="2" fill="white"/>
    <path
      d="M14 16L18 16"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Generic Wallet Icon - Gray with wallet symbol
export const GenericWalletIcon = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="32" height="32" rx="16" fill="#6B7280"/>
    <rect x="8" y="12" width="16" height="8" rx="2" fill="white"/>
    <rect x="20" y="14" width="4" height="4" rx="2" fill="#6B7280"/>
  </svg>
);

// Farcaster Logo - Exact copy from Daimo Pay
export const FarcasterLogo = ({ size = 32, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    viewBox="0 0 1000 1000"
  >
    <path fill="#855DCD" d="M0 0h1000v1000H0z"></path>
    <path
      fill="#fff"
      d="M257.778 155.556h484.444v688.888h-71.111V528.889h-.697c-7.86-87.212-81.156-155.556-170.414-155.556s-162.554 68.344-170.414 155.556h-.697v315.555h-71.111z"
    ></path>
    <path
      fill="#fff"
      d="m128.889 253.333 28.889 97.778h24.444v395.556c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.223 9.949-22.223 22.222v26.666h248.889v-26.666c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.95-22.222-22.223-22.222h-26.666V253.333zM675.555 746.667c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.222 9.949-22.222 22.222v26.666h248.888v-26.666c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.949-22.222-22.222-22.222V351.111h24.444L880 253.333H702.222v493.334z"
    ></path>
  </svg>
);

// Get logo by wallet ID
export const getWalletLogo = (walletId: string, size: number = 32) => {
  switch (walletId.toLowerCase()) {
    case 'metamask':
    case 'metaMask':
      return <MetaMaskLogo size={size} />;
    case 'coinbasewallet':
    case 'coinbase':
    case 'base':
      return <BaseLogo size={size} />;
    case 'trustwallet':
    case 'trust':
      return <TrustWalletLogo size={size} />;
    case 'rainbow':
      return <RainbowLogo size={size} />;
    case 'phantom':
      return <PhantomLogo size={size} />;

    case 'walletconnect':
      return <WalletConnectLogo size={size} />;
    default:
      return <GenericWalletIcon size={size} />;
  }
};

