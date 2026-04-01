-- Voulti Database Schema (Supabase / PostgreSQL)
-- Run this on a fresh Supabase project to set up all tables.
-- IMPORTANT: Use the service_role key in the backend (not anon) since RLS is enabled.

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE invoice_status AS ENUM ('Pending', 'Paid', 'Expired', 'Refunded');
CREATE TYPE payout_status AS ENUM ('Created', 'Funded', 'Claimed', 'Failed');

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE public.commerces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  spread double precision NOT NULL DEFAULT 0.03,
  wallet text NOT NULL,
  icon_url text,
  currency text,
  description_spanish text,
  description_english text,
  minAmount double precision,
  maxAmount double precision,
  currencySymbol text DEFAULT '$',
  confirmation_url text,
  confirmation_email text,
  CONSTRAINT commerces_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tokens (
  symbol text NOT NULL,
  rate_to_usd numeric NOT NULL,
  updated_at timestamp without time zone DEFAULT now(),
  source text DEFAULT 'coingecko.com',
  name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  logo text,
  CONSTRAINT tokens_pkey PRIMARY KEY (symbol)
);

CREATE TABLE public.networks (
  name text NOT NULL UNIQUE,
  chain_id bigint NOT NULL UNIQUE,
  rpc_url text NOT NULL,
  proxy_contract text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  storage_contract text,
  accessmanager_contract text,
  invoicemanager_contract text,
  paymentprocessor_contract text,
  CONSTRAINT networks_pkey PRIMARY KEY (chain_id)
);

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
  CONSTRAINT tokens_token_symbol_fkey FOREIGN KEY (token_symbol) REFERENCES public.tokens(symbol),
  CONSTRAINT tokens_addresses_network_fkey FOREIGN KEY (network) REFERENCES public.networks(name)
);

CREATE TABLE public.tokens_enabled (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  token_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tokens_enabled_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id),
  CONSTRAINT wallets_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.tokens_addresses(id)
);

CREATE TABLE public.fiat_exchange_rates (
  currency_code text NOT NULL,
  usd_to_currency_rate numeric NOT NULL,
  fetched_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'OpenExchangeRates',
  CONSTRAINT fiat_exchange_rates_pkey PRIMARY KEY (currency_code)
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  amount_fiat numeric NOT NULL,
  fiat_currency text NOT NULL DEFAULT 'COP',
  status invoice_status NOT NULL DEFAULT 'Pending',
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
  selected_network integer,
  blockchain_invoice_id text,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  confirmation_url_available boolean DEFAULT false,
  confirmation_url_response boolean DEFAULT false,
  confirmation_url_retries smallint DEFAULT 0,
  confirmation_email_available boolean NOT NULL DEFAULT false,
  payment_method text,
  fee_amount decimal DEFAULT 0,
  fee_percent decimal DEFAULT 100,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
);

CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  to_address text,
  to_name text NOT NULL,
  to_email text,
  to_amount numeric NOT NULL,
  to_currency text NOT NULL,
  status payout_status NOT NULL DEFAULT 'Created',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
);

-- Pay by Address: deposit address tracking
CREATE TABLE public.deposit_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  network text NOT NULL,
  chain_id integer NOT NULL,
  address text NOT NULL,
  derivation_index integer NOT NULL,
  token_address text NOT NULL,
  token_symbol text NOT NULL,
  token_decimals integer NOT NULL,
  expected_amount text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting',
  detected_amount text,
  detected_at timestamp with time zone,
  gas_tx_hash text,
  approve_tx_hash text,
  pay_invoice_tx_hash text,
  refund_tx_hash text,
  wrong_network_detected text,
  sweep_error text,
  sweep_retries smallint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT deposit_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT deposit_addresses_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT deposit_addresses_unique UNIQUE (invoice_id, network)
);

-- Pay by Address: atomic HD wallet index counter
CREATE TABLE public.hd_wallet_counter (
  id integer PRIMARY KEY DEFAULT 1,
  next_index integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- Backend uses service_role key which bypasses RLS.
-- This blocks direct access via the anon key.
-- ============================================

ALTER TABLE commerces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_enabled ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiat_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd_wallet_counter ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED DATA (insert after tables are created)
-- ============================================

INSERT INTO hd_wallet_counter (id, next_index) VALUES (1, 0) ON CONFLICT DO NOTHING;
