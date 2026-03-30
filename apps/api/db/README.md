# Database Schema Documentation - Deramp Backend

## Overview

This document describes the database schema for the Deramp backend, which manages commerces, invoices, tokens, and blockchain network configurations.

## Database Tables

### 1. `commerces` - Commerce Management

Stores information about businesses using the payment gateway.

```sql
CREATE TABLE public.commerces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  spread double precision NOT NULL DEFAULT '0.03'::double precision,
  wallet text NOT NULL,
  icon_url text,
  currency text,
  description_spanish text,
  description_english text,
  minAmount double precision,
  maxAmount double precision,
  currencySymbol text DEFAULT '$'::text,
  CONSTRAINT commerces_pkey PRIMARY KEY (id)
);
```

**Key Fields:**

- `id`: Unique identifier for the commerce
- `name`: Commerce business name
- `wallet`: Blockchain wallet address for receiving payments
- `spread`: Fee percentage (default 3%)
- `currency`: Default fiat currency (e.g., 'COP')
- `minAmount`/`maxAmount`: Payment limits

### 2. `invoices` - Payment Invoices

Tracks all payment invoices and their status.

```sql
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  amount_fiat numeric NOT NULL,
  fiat_currency text NOT NULL DEFAULT 'COP'::text,
  status USER-DEFINED NOT NULL DEFAULT 'Pending'::invoice_status,
  paid_token text,
  paid_network text,
  paid_tx_hash text,
  wallet_address text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  refunded_at timestamp with time zone,
  expired_at timestamp with time zone,
  paid_amount double precision,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
);
```

**Invoice Status Values:**

- `Pending`: Invoice created, waiting for payment
- `Paid`: Payment received and confirmed
- `Expired`: Invoice expired without payment
- `Refunded`: Payment was refunded

**Payment Fields:**

- `paid_token`: Contract address of the token used for payment
- `paid_network`: Blockchain network where payment was made
- `paid_tx_hash`: Transaction hash of the payment
- `wallet_address`: Address of the wallet that made the payment
- `paid_amount`: Amount paid in the token's smallest unit

### 3. `networks` - Blockchain Networks

Configuration for supported blockchain networks.

```sql
CREATE TABLE public.networks (
  name text NOT NULL UNIQUE,
  chain_id bigint NOT NULL,
  rpc_url text NOT NULL,
  proxy_contract text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  storage_contract text,
  accessmanager_contract text,
  invoicemanager_contract text,
  paymentprocessor_contract text
);
```

**Supported Networks:**

- `alfajores`: Celo testnet (chain_id: 44787)
- `mainnet`: Celo mainnet (chain_id: 42220)

### 4. `tokens` - Token Information

General token information and USD exchange rates.

```sql
CREATE TABLE public.tokens (
  symbol text NOT NULL,
  rate_to_usd numeric NOT NULL,
  updated_at timestamp without time zone DEFAULT now(),
  source text DEFAULT 'coingecko.com'::text,
  name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tokens_pkey PRIMARY KEY (symbol)
);
```

**Supported Tokens:**

- `cCOP`: Celo Colombian Peso
- `cUSD`: Celo Dollar
- `cEUR`: Celo Euro
- `USDC`: USD Coin

### 5. `tokens_addresses` - Token Contract Addresses

Blockchain-specific token contract addresses.

```sql
CREATE TABLE public.tokens_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_address text NOT NULL,
  decimals integer NOT NULL,
  token_symbol text NOT NULL,
  is_active boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  network text NOT NULL,
  CONSTRAINT tokens_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT tokens_addresses_network_fkey FOREIGN KEY (network) REFERENCES public.networks(name),
  CONSTRAINT tokens_token_symbol_fkey FOREIGN KEY (token_symbol) REFERENCES public.tokens(symbol)
);
```

**Celo Alfajores Token Addresses:**

- cCOP: `0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4`
- cUSD: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- cEUR: `0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F`
- USDC: `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`

### 6. `tokens_enabled` - Commerce Token Whitelisting

Maps which tokens are enabled for each commerce.

```sql
CREATE TABLE public.tokens_enabled (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  token_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tokens_enabled_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.tokens_addresses(id),
  CONSTRAINT wallets_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
);
```

### 7. `fiat_exchange_rates` - Fiat Currency Rates

USD to fiat currency exchange rates.

```sql
CREATE TABLE public.fiat_exchange_rates (
  currency_code text NOT NULL,
  usd_to_currency_rate numeric NOT NULL,
  fetched_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'OpenExchangeRates'::text,
  CONSTRAINT fiat_exchange_rates_pkey PRIMARY KEY (currency_code)
);
```

## Database Relationships

```
commerces (1) ←→ (N) invoices
commerces (N) ←→ (N) tokens_addresses (via tokens_enabled)
tokens (1) ←→ (N) tokens_addresses
networks (1) ←→ (N) tokens_addresses
```

## Common Queries

### Get Commerce with Enabled Tokens

```sql
SELECT
  c.*,
  json_agg(
    json_build_object(
      'symbol', ta.token_symbol,
      'address', ta.contract_address,
      'decimals', ta.decimals,
      'network', ta.network
    )
  ) as enabled_tokens
FROM commerces c
LEFT JOIN tokens_enabled te ON c.id = te.commerce_id
LEFT JOIN tokens_addresses ta ON te.token_id = ta.id
WHERE c.id = $1
GROUP BY c.id;
```

### Get Invoice with Commerce Details

```sql
SELECT
  i.*,
  c.name as commerce_name,
  c.wallet as commerce_wallet,
  c.icon_url as commerce_icon_url
FROM invoices i
JOIN commerces c ON i.commerce_id = c.id
WHERE i.id = $1;
```

### Get Token Rates for Commerce

```sql
SELECT
  t.symbol,
  t.rate_to_usd,
  ta.contract_address,
  ta.decimals,
  ta.network
FROM tokens t
JOIN tokens_addresses ta ON t.symbol = ta.token_symbol
JOIN tokens_enabled te ON ta.id = te.token_id
WHERE te.commerce_id = $1 AND ta.is_active = true;
```

## Data Migration

### Adding New Network

1. Insert network record in `networks` table
2. Add token addresses in `tokens_addresses` table
3. Update backend configuration files

### Adding New Token

1. Insert token record in `tokens` table
2. Add contract addresses for each network in `tokens_addresses`
3. Enable tokens for commerces in `tokens_enabled`

## Backup and Recovery

### Backup Strategy

- Daily automated backups via Supabase
- Point-in-time recovery available
- Export data for local development

### Recovery Process

1. Restore from Supabase backup
2. Verify data integrity
3. Update any cached data in backend

## Performance Considerations

### Indexes

- Primary keys are automatically indexed
- Consider indexes on frequently queried fields:
  - `invoices.commerce_id`
  - `invoices.status`
  - `invoices.created_at`
  - `tokens_enabled.commerce_id`

### Query Optimization

- Use specific column selection instead of `SELECT *`
- Implement pagination for large result sets
- Cache frequently accessed data (token rates, commerce info)

## Security

### Data Protection

- All sensitive data encrypted at rest
- Database access via secure connections only
- Regular security audits and updates

### Access Control

- Row Level Security (RLS) enabled on Supabase
- API access controlled via service role keys
- Environment-specific database credentials

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Database**: PostgreSQL (Supabase)
