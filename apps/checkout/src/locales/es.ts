export const es = {
  // Status
  status: {
    pending: 'Pendiente',
    paid: 'Pagado',
    expired: 'Expirado',
    refunded: 'Reembolsado'
  },
  
  // General
  general: {
    loading: 'Cargando...',
    error: 'Error',
    connect: 'Conectar',
    disconnect: 'Desconectar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    close: 'Cerrar',
    back: 'Volver',
    copy: 'Copiar',
    copied: '¡Copiado!',
    copiedMessage: 'Link copiado al portapapeles'
  },

  // Header
  header: {
    orderNumber: 'Pedido #',
    logo: 'Voulti'
  },

  // Order Information
  order: {
    title: 'Detalles del pedido',
    orderId: 'Número de Orden',
    totalToPay: 'Importe total',
    timeRemaining: 'Tiempo restante',
    pageTitle: 'Completa tu pago',
    pageDescription: 'Selecciona tu método de pago preferido y completa la transacción.',
    blockchainTransaction: 'Transacción en blockchain',
    viewOnExplorer: 'Ver en explorador 🔗'
  },

  // Payment
  payment: {
    method: 'Método de pago',
    selectToken: 'Token',
    selectTokenPlaceholder: 'Seleccionar token',
    selectNetwork: 'Seleccionar red',
    network: 'Red',
    connectWallet: 'Conectar wallet',
    connectWalletDescription: 'Conecta tu wallet para continuar con el pago',
    makePayment: 'Pagar ahora',
    preparing: 'Preparando tu pago...',
    authorize: 'Autorizar {token}',
    authorizing: 'Autorizando {token}...',
    confirm: 'Confirmar pago',
    processing: 'Procesando pago...',
    completed: '¡Pago completado!',
    completedDescription: 'Este pedido ha sido pagado exitosamente.',
    expired: 'Pedido expirado',
    expiredDescription: 'Este pedido ha expirado y ya no puede ser pagado.',
    refunded: 'Pago reembolsado',
    refundedDescription: 'Este pedido ha sido reembolsado exitosamente.',
    amountToPay: 'Importe a pagar',
    price: 'Precio de {symbol}',
    lastUpdated: 'Última actualización: {time}',
    noTokensAvailable: 'No hay tokens disponibles para la red actual',
    paymentFailed: 'El pago falló',
    networkConfigError: 'Error de configuración de red',
    unableToPrepare: 'No se pudo preparar el pago',
    unableToCreateBlockchain: 'No se pudo crear la factura en blockchain',
    unableToVerifyStatus: 'No se pudo verificar el estado',
    tokenAuthFailed: 'Falló la autorización del token',
    tokenNotSupported: 'Token no soportado',
    networkNotSupported: 'Red no soportada',
    walletNotFound: 'Wallet no encontrada',
    paymentOptionNotFound: 'Opción de pago no encontrada',
    tokenAuthRequired: 'Autorización de token requerida',
    transactionFailed: 'Transacción fallida',
    insufficientBalance: 'Saldo insuficiente',
    networkIssue: 'Problema de red',
    connectionIssue: 'Problema de conexión',
    gasError: 'Error de configuración de gas. Por favor intenta de nuevo.',
    nonceError: 'Error de nonce de transacción. Por favor intenta de nuevo.',
    networkCongestion: 'La red está congestionada. Por favor intenta de nuevo en unos minutos.',
    tokenNotWhitelisted: 'El comercio no está recibiendo {symbol} en este momento. Elige otro token.',
    selectTokenTitle: 'Seleccionar Token',
    selectTokenDescription: 'Elige tu token de pago preferido',
    searchTokens: 'Buscar tokens...',
    noTokensFound: 'No se encontraron tokens',
    tokenPrice: 'Precio: ${price}',
    tokenAmount: 'Cantidad: {amount} {symbol}',
    networkMismatchTitle: 'Red incorrecta detectada',
    networkMismatchDescription: 'Esta orden fue creada en {expected}, pero estás conectado a otra red.',
    switchToCorrectNetwork: 'Cambiar a red correcta',
    switchingNetwork: 'Cambiando red...',
    refreshPage: 'Recargar página',
    title: 'Método de Pago',
    connectWalletToContinue: 'Conecta tu wallet para continuar',
    close: 'Cerrar'
  },

  // Balance
  balance: {
    label: 'Balance:',
    insufficient: 'Saldo insuficiente',
    insufficientDescription: 'Necesitas {required} {symbol} pero solo tienes {current} {symbol}',
    noFunds: '(Sin fondos)',
    notAvailable: 'Balance no disponible',
    loading: 'Cargando balance...',
    error: 'Error al cargar balance'
  },

  // Network
  network: {
    unsupported: 'Red no soportada',
    switching: 'Cambiando red...',
    switchError: 'Error al cambiar red',
    changeTokenNetwork: 'Cambiar token/red arriba',
    status: 'Estado de la Red',
    refresh: 'Actualizar',
    refreshing: 'Actualizando...',
    refreshNetwork: 'Actualizar Red',
    lastRefresh: 'Última actualización',
    switchTo: 'Cambiar a',
    connected: 'Conectado a la red correcta',
    wrongNetwork: 'Red incorrecta detectada',
    networkSwitchError: 'Error al cambiar red',
    networkSwitchSuccess: 'Red cambiada exitosamente',
    detecting: 'Detectando red...'
  },

  // Countdown
  countdown: {
    timeRemaining: 'Tiempo restante:',
    expired: 'Pedido expirado',
    hours: 'h',
    minutes: 'm',
    seconds: 's'
  },

  // Tokens
  tokens: {
    buy: 'Comprar {symbol}',
    buyingSoon: 'Función para comprar {symbol} próximamente'
  },

  // Networks
  networks: {
    network: 'red',
    networks: 'redes'
  },

  // Footer
  footer: {
    builtWithLove: 'Hecho con ❤️ por'
  },

  // Features
  features: {
    noSetupFees: 'Sin costos de configuración',
    instantSettlement: 'Liquidación instantánea',
    globalReach: '5 redes soportadas'
  },

  // Commerce
  commerce: {
    title: 'Paga con cripto en {name}',
    subtitle: 'Realiza tu pago de forma segura usando {name} con Voulti.',
    amountLabel: 'Ingresa el valor a pagar',
    amountPlaceholder: '0',
    generateButton: 'Continuar',
    generating: 'Generando...',
    amountRequired: 'Por favor ingresa un monto válido',
    amountMin: 'El monto debe ser al menos {min} {currency}',
    amountMax: 'El monto no puede exceder {max} {currency}',
    createInvoiceError: 'Error al crear el cobro',
    networkError: 'Error de red. Por favor verifica tu conexión e intenta de nuevo.',
    minimum: 'Mínimo',
    maximum: 'Máximo',
    supportedTokens: 'Tokens soportados'
  },

  // Home
  home: {
    heroTitle: 'Acepta stablecoins.\nLiquida al instante.',
    heroSubtitle: 'USDC, USDT y stablecoins en 5 redes. Dos formas de pagar: conectar wallet o enviar a una dirección. Auto-custodia, 1% de comisión.',
    ctaButton: 'Crear Cuenta Gratis',
    ctaSecondary: 'Ver Cómo Funciona',
    subcopy: 'Celo · Arbitrum · Polygon · Base · BSC',
    howItWorksTitle: 'Cómo funciona',
    step1Title: 'Crea tu cuenta',
    step1Description: 'Conecta tu wallet, nombra tu negocio y empieza a recibir pagos en minutos.',
    step2Title: 'Comparte tu link de pago',
    step2Description: 'Genera un link o código QR. Ponlo en tu tienda, compártelo online o intégralo por API.',
    step3Title: 'Recibe stablecoins',
    step3Description: 'Tus clientes pagan con USDC o USDT. Los fondos van directo a tu wallet. Retira cuando quieras.',
    tagline: 'La forma más simple de aceptar pagos con crypto.',
    whyChooseTitle: 'Hecho para negocios reales',
    whyChoose: {
      instantPayments: {
        title: 'Liquidación instantánea',
        description: 'Sin tiempos de espera. Los fondos llegan a tu wallet en el momento que tu cliente paga.'
      },
      lowFees: {
        title: '1% de comisión fija',
        description: 'Sin costos de setup, sin mensualidades, sin cargos ocultos. Solo 1% por transacción.'
      },
      realWorld: {
        title: '5 redes, 1 dashboard',
        description: 'Acepta pagos en Celo, Arbitrum, Polygon, Base y BSC. Administra todo desde un solo lugar.'
      }
    }
  },

  // Demo
  demo: {
    title: 'Descubre todas las formas de usar Voulti',
    subtitle: 'Entiende cómo Voulti habilita pagos con cripto en tiendas físicas, en línea y sistemas personalizados.',
    inStore: {
      title: 'Recibe pagos en cripto en tu tienda física',
      description: 'Muestra este código QR en tu caja y recibe pagos al instante en criptomonedas.',
      cta: 'Probar este',
      demoTitle: 'Demo de Código QR',
      demoDescription: 'Imagina este QR en la caja de un comercio.',
      demoCta: 'Escanear QR y continuar',
      downloadCta: 'Descargar Código QR'
    },
    online: {
      title: 'Recibe pagos en cripto en línea',
      description: 'Comparte un link de pago con tus clientes por redes sociales o correo para recibir pagos al instante en criptomonedas.',
      cta: 'Probar este',
      demoTitle: 'Link de Pago Online',
      demoDescription: 'Los comercios pueden compartir este link directamente con sus clientes en línea.',
      demoCta: 'Abrir Link de Pago'
    },
    api: {
      title: 'Integra pagos en cripto en tus sistemas',
      description: 'Usa la API de Voulti para aceptar pagos en cripto directamente en tu sitio web, app o sistema de punto de venta.',
      cta: 'Ver documentación API',
      demoTitle: 'Integración API',
      demoDescription: 'Ejemplo de llamada API para crear una factura:',
      demoCta: 'Ver documentación API (Próximamente)',
      step1Title: 'Paso 1: Haz una solicitud para un cobro',
      step1Description: 'Envía una solicitud POST a la API de Voulti para crear un nuevo cobro.',
      step2Title: 'Paso 2: Obtén el ID del cobro desde la respuesta',
      step2Description: 'La API devolverá un id para el cobro creado.',
      step3Title: 'Paso 3: Redirige a tu cliente a la página de checkout',
      step3Description: 'Envía a tu cliente al link de checkout devuelto en la respuesta de la API para completar el pago.',
      step3Example: '🌐 Ejemplo:',
      note: '📢 Si configuraste las URLs de confirmación y respuesta, Voulti notificará a la URL de confirmación cuando se complete el pago y redirigirá al usuario a la URL de respuesta.'
    }
  },

  // Errors
  errors: {
    invoiceNotFound: 'Este cobro no existe o ha sido eliminado.',
    commerceNotFound: 'Este comercio no existe o ha sido eliminado.',
    networkError: 'Error de red. Por favor verifica tu conexión e intenta de nuevo.',
    serverError: 'Error del servidor. Por favor intenta más tarde.',
    unknownError: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
    configError: 'Error de configuración del backend'
  },

  // QR Code
  qrCode: {
    header: 'Paga con Cripto',
    subtitle: 'en Trutix'
  },

  // Powered by
  poweredBy: '⚡ Desarrollado por',

  // Wallet
  wallet: {
    connectFirst: 'Conecta tu wallet primero',
    connectDescription: 'Elige cómo conectar tu wallet',
    wrongNetwork: 'Red incompatible detectada',
    switchNetworkDescription: 'Necesitas cambiar a una red compatible para continuar',
    readyToPay: 'Todo listo para pagar',
    connectedToCorrectNetwork: 'Wallet conectada a una red compatible',
    connectedTitle: 'Wallet conectada',
    changeNetwork: 'Cambiar',
    selectNetwork: 'Seleccionar Red',
    currentNetwork: 'Red Actual',
    compatibleNetworks: 'Redes Compatibles',
    youAreOn: 'Estás en',
    needToChange: 'Necesitas cambiar a una red compatible para continuar',
    connectedAddress: 'Dirección',
    disconnect: 'Desconectar',
    selectWallet: 'Elige la wallet en la que vas a continuar la transacción',
    selectWalletDescription: 'Elige tu wallet para continuar',
    connectWallet: 'Conectar Wallet',
    connectWalletFirst: 'Conecta tu wallet primero',
    switchNetwork: 'Cambiar Red',
    connectionIssue: 'Problema de conexión',
    metamaskPendingError: 'Cierra MetaMask completamente y vuelve a intentar. El error indica que hay una solicitud pendiente.',
    metamaskPendingErrorShort: 'Cierra MetaMask y vuelve a intentar',
  },

  // Payment Method Selector
  paymentMethod: {
    title: '¿Cómo deseas pagar?',
    connectWallet: 'Conectar Wallet',
    connectWalletDesc: 'MetaMask, WalletConnect, Coinbase...',
    payByAddress: 'Pagar por Dirección',
    payByAddressDesc: 'Envía desde cualquier wallet o exchange',
  },

  // Pay by Address
  payByAddress: {
    back: 'Volver a métodos de pago',
    selectNetwork: 'Selecciona la Red',
    selectToken: 'Selecciona el Token',
    noTokens: 'No hay tokens disponibles en esta red para esta factura.',
    youWillSend: 'Enviarás',
    onNetwork: 'en',
    beforeContinue: 'Antes de continuar',
    sendOnly: 'Envía solo',
    notAnotherToken: 'y no otro token',
    sendOnNetwork: 'Envía en la red',
    sendExactAmount: 'Envía el monto exacto — enviar menos no completará el pago',
    overpaymentRefund: 'Si envías de más, el excedente se devuelve automáticamente',
    understand: 'Entiendo, generar dirección',
    generating: 'Generando dirección...',
    scanToPayMobile: 'Copia la dirección y pégala en tu app de wallet',
    sendExactly: 'Envía exactamente',
    depositAddress: 'Dirección de depósito',
    tapToCopy: 'Toca para copiar',
    copied: '¡Copiado!',
    amountCopied: '¡Monto copiado!',
    doubleCheck: 'Verifica antes de enviar',
    checkToken: 'Estás enviando',
    checkNotAnother: '(no otro token)',
    checkNetwork: 'Estás en la red',
    checkAmount: 'El monto es exactamente',
    waiting: 'Esperando tu depósito...',
    partialTitle: 'Depósito parcial recibido',
    partialDesc: 'Recibido {detected} de {expected} {symbol}. Envía los {remaining} {symbol} restantes.',
    depositReceived: '¡Depósito recibido!',
    processing: 'Procesando tu pago...',
    paymentComplete: '¡Pago completado!',
    paymentConfirmed: 'Tu pago ha sido confirmado.',
    invoiceExpired: 'Factura expirada',
    depositRefunded: 'Tu depósito ha sido devuelto automáticamente.',
    somethingWrong: 'Algo salió mal',
    contactSupport: 'Contacta a soporte para asistencia.',
  },
};