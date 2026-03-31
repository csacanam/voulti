export const en = {
  // Status
  status: {
    pending: 'Pending',
    paid: 'Paid',
    expired: 'Expired',
    refunded: 'Refunded'
  },
  
  // General
  general: {
    loading: 'Loading...',
    error: 'Error',
    connect: 'Connect',
    disconnect: 'Disconnect',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    copy: 'Copy',
    copied: 'Copied!',
    copiedMessage: 'Link copied to clipboard'
  },

  // Header
  header: {
    orderNumber: 'Order #',
    logo: 'Voulti'
  },

  // Order Information
  order: {
    title: 'Order details',
    orderId: 'Order ID',
    totalToPay: 'Total amount',
    timeRemaining: 'Time left',
    pageTitle: 'Complete your payment',
    pageDescription: 'Select your preferred payment method and complete the transaction.',
    blockchainTransaction: 'Blockchain Transaction',
    viewOnExplorer: 'View on explorer 🔗'
  },

  // Payment
  payment: {
    method: 'Payment method',
    selectToken: 'Token',
    selectTokenPlaceholder: 'Select token',
    selectNetwork: 'Select network',
    network: 'Network',
    connectWallet: 'Connect wallet',
    connectWalletDescription: 'Connect your wallet to continue with payment',
    makePayment: 'Pay now',
    preparing: 'Preparing your payment...',
    authorize: 'Authorize {token}',
    authorizing: 'Authorizing {token}...',
    confirm: 'Confirm payment',
    processing: 'Processing payment...',
    completed: 'Payment completed!',
    completedDescription: 'This order has been paid successfully.',
    expired: 'Order expired',
    expiredDescription: 'This order has expired and can no longer be paid.',
    refunded: 'Payment refunded',
    refundedDescription: 'This order has been refunded successfully.',
    amountToPay: 'Amount to pay',
    price: 'Price of {symbol}',
    lastUpdated: 'Last updated: {time}',
    noTokensAvailable: 'No tokens available for current network',
    paymentFailed: 'Payment failed',
    networkConfigError: 'Network configuration error',
    unableToPrepare: 'Unable to prepare payment',
    unableToCreateBlockchain: 'Unable to create blockchain invoice',
    unableToVerifyStatus: 'Unable to verify status',
    tokenAuthFailed: 'Token authorization failed',
    tokenNotSupported: 'Token not supported',
    networkNotSupported: 'Network not supported',
    walletNotFound: 'Wallet not found',
    paymentOptionNotFound: 'Payment option not found',
    tokenAuthRequired: 'Token authorization required',
    transactionFailed: 'Transaction failed',
    insufficientBalance: 'Insufficient balance',
    networkIssue: 'Network issue',
    connectionIssue: 'Connection issue',
    gasError: 'Gas configuration error. Please try again.',
    nonceError: 'Transaction nonce error. Please try again.',
    networkCongestion: 'Network is congested. Please try again in a few minutes.',
    tokenNotWhitelisted: 'The commerce is not accepting {symbol} at the moment. Choose another token.',
    selectTokenTitle: 'Select Token',
    selectTokenDescription: 'Choose your preferred payment token',
    searchTokens: 'Search tokens...',
    noTokensFound: 'No tokens found',
    tokenPrice: 'Price: ${price}',
    tokenAmount: 'Amount: {amount} {symbol}',
    networkMismatchTitle: 'Wrong network detected',
    networkMismatchDescription: 'This order was created on {expected}, but you are connected to another network.',
    switchToCorrectNetwork: 'Switch to correct network',
    switchingNetwork: 'Switching network...',
    refreshPage: 'Refresh page',
    title: 'Payment Method',
    connectWalletToContinue: 'Connect your wallet to continue',
    close: 'Close'
  },

  // Balance
  balance: {
    label: 'Balance:',
    insufficient: 'Insufficient Balance',
    insufficientDescription: 'You need {required} {symbol} but only have {current} {symbol}',
    noFunds: '(No funds)',
    notAvailable: 'Balance not available',
    loading: 'Loading balance...',
    error: 'Error loading balance'
  },

  // Network
  network: {
    unsupported: 'Unsupported Network',
    switching: 'Switching network...',
    switchError: 'Error switching network',
    changeTokenNetwork: 'Change token/network above',
    status: 'Network Status',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    refreshNetwork: 'Refresh Network',
    lastRefresh: 'Last refresh',
    switchTo: 'Switch to',
    connected: 'Connected to correct network',
    wrongNetwork: 'Wrong network detected',
    networkSwitchError: 'Error switching network',
    networkSwitchSuccess: 'Network switched successfully',
    detecting: 'Detecting network...'
  },

  // Countdown
  countdown: {
    timeRemaining: 'Time left:',
    expired: 'Order Expired',
    hours: 'h',
    minutes: 'm',
    seconds: 's'
  },

  // Tokens
  tokens: {
    buy: 'Buy {symbol}',
    buyingSoon: 'Function to buy {symbol} coming soon'
  },

  // Networks
  networks: {
    network: 'network',
    networks: 'networks'
  },

  // Footer
  footer: {
    builtWithLove: 'Built with ❤️ by'
  },

  // Features
  features: {
    noSetupFees: 'No setup fees',
    instantSettlement: 'Instant settlement',
    globalReach: '5 networks supported'
  },

  // Commerce
  commerce: {
    title: 'Pay with crypto at {name}',
    subtitle: 'Make your payment securely at {name} using crypto with Voulti.',
    amountLabel: 'Enter the amount to pay',
    amountPlaceholder: '0',
    generateButton: 'Continue',
    generating: 'Generating...',
    amountRequired: 'Please enter a valid amount',
    amountMin: 'Amount must be at least {min} {currency}',
    amountMax: 'Amount cannot exceed {max} {currency}',
    createInvoiceError: 'Failed to create invoice',
    networkError: 'Network error. Please check your connection and try again.',
    minimum: 'Minimum',
    maximum: 'Maximum',
    supportedTokens: 'Supported tokens'
  },

  // Home
  home: {
    heroTitle: 'Accept stablecoins.\nSettle instantly.',
    heroSubtitle: 'USDC, USDT and stablecoins on 5 networks. Two ways to pay: connect wallet or send to an address. Self-custody, 1% fee.',
    ctaButton: 'Create Free Account',
    ctaSecondary: 'See How It Works',
    subcopy: 'Celo · Arbitrum · Polygon · Base · BSC',
    howItWorksTitle: 'How it works',
    step1Title: 'Create your account',
    step1Description: 'Connect your wallet, name your business, and start accepting payments in minutes.',
    step2Title: 'Share your payment link',
    step2Description: 'Generate a link or QR code. Display it at your store, share it online, or integrate via API.',
    step3Title: 'Get paid in stablecoins',
    step3Description: 'Customers pay with USDC or USDT. Funds go directly to your wallet. Withdraw anytime.',
    tagline: 'The simplest way to accept crypto payments.',
    whyChooseTitle: 'Built for real businesses',
    whyChoose: {
      instantPayments: {
        title: 'Instant settlement',
        description: 'No waiting periods. Funds arrive in your wallet the moment your customer pays.'
      },
      lowFees: {
        title: '1% flat fee',
        description: 'No setup costs, no monthly fees, no hidden charges. Just 1% per transaction.'
      },
      realWorld: {
        title: '5 networks, 1 dashboard',
        description: 'Accept payments on Celo, Arbitrum, Polygon, Base and BSC. Manage everything from one place.'
      }
    }
  },

  // Demo
  demo: {
    title: 'Discover all the ways to use Voulti',
    subtitle: 'Understand how Voulti enables crypto payments in physical stores, online, and custom systems.',
    inStore: {
      title: 'Receive crypto payments at your physical store',
      description: 'Display this QR code at checkout to receive instant payments in cryptocurrencies.',
      cta: 'Try this',
      demoTitle: 'QR Code Demo',
      demoDescription: 'Imagine this QR displayed at a physical store\'s checkout.',
      demoCta: 'Scan QR and continue',
      downloadCta: 'Download QR Code'
    },
    online: {
      title: 'Receive crypto payments online',
      description: 'Share a payment link with your customers via social media or email to receive instant payments in cryptocurrencies.',
      cta: 'Try this',
      demoTitle: 'Online Payment Link',
      demoDescription: 'Merchants can share this payment link directly with customers online.',
      demoCta: 'Open Payment Link'
    },
    api: {
      title: 'Integrate crypto payments into your systems',
      description: 'Use Voulti\'s API to accept crypto payments directly in your website, app, or point-of-sale system.',
      cta: 'View API Docs',
      demoTitle: 'API Integration',
      demoDescription: 'Example API call to create an invoice:',
      demoCta: 'View API Docs (Coming Soon)',
      step1Title: 'Step 1: Make a request for an invoice',
      step1Description: 'Send a POST request to Voulti\'s API to create a new invoice.',
      step2Title: 'Step 2: Get the invoice ID from the response',
      step2Description: 'The API will return an id for the created invoice.',
      step3Title: 'Step 3: Redirect your client to the checkout page',
      step3Description: 'Send your customer to the checkout link returned in the API response to complete the payment.',
      step3Example: '🌐 Example:',
      note: '📢 If you\'ve set up confirmation and response URLs, Voulti will notify your confirmation URL when the payment is completed and redirect the user to your response URL.'
    }
  },

  // Errors
  errors: {
    invoiceNotFound: 'This order does not exist or has been deleted.',
    commerceNotFound: 'This commerce does not exist or has been deleted.',
    networkError: 'Network error. Please check your connection and try again.',
    serverError: 'Server error. Please try again later.',
    unknownError: 'An unexpected error occurred. Please try again.',
    configError: 'Backend configuration error'
  },

  // QR Code
  qrCode: {
    header: 'Pay with Crypto',
    subtitle: 'at Trutix'
  },

  // Powered by
  poweredBy: '⚡ Powered by',

  // Wallet
  wallet: {
    connectFirst: 'Connect your wallet first',
    connectDescription: 'Choose how to connect your wallet',
    wrongNetwork: 'Incompatible network detected',
    switchNetworkDescription: 'You need to switch to a compatible network to continue',
    readyToPay: 'All ready to pay',
    connectedToCorrectNetwork: 'Wallet connected to a compatible network',
    connectedTitle: 'Wallet connected',
    changeNetwork: 'Change',
    selectNetwork: 'Select Network',
    currentNetwork: 'Current Network',
    compatibleNetworks: 'Compatible Networks',
    youAreOn: 'You are on',
    needToChange: 'You need to switch to a compatible network to continue',
    connectedAddress: 'Address',
    disconnect: 'Disconnect',
    selectWallet: 'Choose the wallet where you will continue the transaction',
    selectWalletDescription: 'Choose your wallet to continue',
    connectWallet: 'Connect Wallet',
    connectWalletFirst: 'Connect your wallet first',
    switchNetwork: 'Switch Network',
    connectionIssue: 'Connection issue',
    metamaskPendingError: 'Close MetaMask completely and try again. The error indicates there is a pending request.',
    metamaskPendingErrorShort: 'Close MetaMask and try again',
  },

  // Payment Method Selector
  paymentMethod: {
    title: 'How would you like to pay?',
    connectWallet: 'Connect Wallet',
    connectWalletDesc: 'MetaMask, WalletConnect, Coinbase...',
    payByAddress: 'Pay by Address',
    payByAddressDesc: 'Send from any wallet or exchange',
  },

  // Pay by Address
  payByAddress: {
    back: 'Back to payment methods',
    selectNetwork: 'Select Network',
    selectToken: 'Select Token',
    noTokens: 'No tokens available on this network for this invoice.',
    youWillSend: 'You will send',
    onNetwork: 'on',
    beforeContinue: 'Before you continue',
    sendOnly: 'Send',
    notAnotherToken: 'only, not another token',
    sendOnNetwork: 'Send on the',
    sendOnNetworkEnd: 'network',
    sendExactAmount: 'Send the exact amount — sending less will not complete the payment',
    overpaymentRefund: 'If you send more, the excess will be automatically refunded',
    understand: 'I understand, generate address',
    generating: 'Generating address...',
    scanToPayMobile: 'Copy the address below and paste it in your wallet app',
    sendExactly: 'Send exactly',
    depositAddress: 'Deposit address',
    tapToCopy: 'Tap to copy',
    copied: 'Copied!',
    amountCopied: 'Amount copied!',
    doubleCheck: 'Double check before sending',
    checkToken: 'Sending',
    checkNotAnother: '(not another token)',
    checkNetwork: 'On the',
    checkNetworkEnd: 'network',
    checkAmount: 'Amount is exactly',
    waiting: 'Waiting for your deposit...',
    partialTitle: 'Partial deposit received',
    partialDesc: 'Received {detected} of {expected} {symbol}. Please send the remaining {remaining} {symbol}.',
    depositReceived: 'Deposit received!',
    processing: 'Processing your payment...',
    paymentComplete: 'Payment complete!',
    paymentConfirmed: 'Your payment has been confirmed.',
    invoiceExpired: 'Invoice expired',
    depositRefunded: 'Your deposit has been automatically refunded.',
    somethingWrong: 'Something went wrong',
    contactSupport: 'Please contact support for assistance.',
  },
};