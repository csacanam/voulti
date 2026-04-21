# Voulti Mini App

Mobile-first mini app para MiniPay. Los comercios crean links de pago desde su wallet inyectada y los comparten. El payer abre el link en `voulti.com/checkout/{id}` y paga con cualquier wallet/red/token.

## Stack

- Next.js 16 (App Router)
- Privy (login solo con wallet vía SIWE)
- viem / wagmi (Celo)
- Tailwind v4
- Comparte el API backend (`apps/api`) y contratos con `apps/merchant`

## Development

```bash
pnpm install
cp .env.example .env.local
# Llenar NEXT_PUBLIC_PRIVY_APP_ID con el mismo del merchant
pnpm dev
```

Corre en puerto 3002.

## Scope v1

### 1. Onboarding (primera vez)
- Auto-login con la wallet inyectada por MiniPay (firma SIWE)
- Si la wallet no tiene commerce registrado → modal: nombre del negocio + moneda base (USD/COP/ARS/etc.)
- Se crea el commerce en backend y queda listo

### 2. Home
- Total recibido en la moneda del commerce (ej: `$ 50,000 COP`)
- Botón "Crear link de pago"
- Lista de links recientes con status (pending/paid)

### 3. Crear payment link
- Solo input de **monto** (la moneda ya está fijada en el commerce)
- Genera link `voulti.com/checkout/{id}` + QR
- Botón compartir WhatsApp

### 4. Withdraw
- Balances agregados por token, detalle por red al expandir
- Selector de red/token específico
- Si tiene gas → retiro directo
- Si no → gasless con fee $1 USD

## Auth flow

1. Usuario abre la mini app dentro de MiniPay → MiniPay inyecta wallet Celo
2. `privy.login()` dispara SIWE → usuario firma en MiniPay (un tap)
3. Privy emite JWT → mismo middleware que `apps/merchant`
4. La wallet **es** la identidad (mismo commerce si entra desde app.voulti.com u otra sesión)

## Deployment

- Dominio target: `pay.voulti.com`
- Submit al directorio de MiniPay: https://docs.minipay.xyz/get-listed
