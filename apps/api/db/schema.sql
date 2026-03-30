-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bridge_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_fiat USER-DEFINED NOT NULL,
  to_fiat USER-DEFINED NOT NULL,
  from_chain integer NOT NULL,
  from_chain_name text NOT NULL,
  from_token_symbol text NOT NULL,
  from_token_address text NOT NULL,
  from_token_decimals integer NOT NULL,
  to_chain integer NOT NULL,
  to_chain_name text NOT NULL,
  to_token_symbol text NOT NULL,
  to_token_address text NOT NULL,
  to_token_decimals integer NOT NULL,
  provider character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bridge_routes_pkey PRIMARY KEY (id)
);
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
  confirmation_url text,
  confirmation_email text,
  CONSTRAINT commerces_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fiat_exchange_rates (
  currency_code text NOT NULL,
  usd_to_currency_rate numeric NOT NULL,
  fetched_at timestamp with time zone DEFAULT now(),
  source text DEFAULT 'OpenExchangeRates'::text,
  CONSTRAINT fiat_exchange_rates_pkey PRIMARY KEY (currency_code)
);
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
  selected_network integer,
  blockchain_invoice_id text,
  confirmation_email_sent boolean NOT NULL DEFAULT false,
  confirmation_url_available boolean DEFAULT false,
  confirmation_url_response boolean DEFAULT false,
  confirmation_url_retries smallint DEFAULT '0'::smallint,
  confirmation_email_available boolean NOT NULL DEFAULT false,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
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
CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  commerce_id uuid NOT NULL,
  from_address character varying NOT NULL,
  from_chain integer NOT NULL,
  from_token_symbol character varying NOT NULL,
  from_amount numeric NOT NULL,
  to_chain integer NOT NULL,
  to_address character varying,
  to_token_symbol character varying NOT NULL,
  provider character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  from_currency USER-DEFINED NOT NULL,
  to_currency USER-DEFINED NOT NULL,
  from_token_address character varying NOT NULL,
  from_token_decimals integer NOT NULL,
  from_chain_name character varying NOT NULL,
  to_chain_name character varying NOT NULL,
  to_token_address character varying NOT NULL,
  to_token_decimals integer NOT NULL,
  to_amount numeric NOT NULL,
  to_name text NOT NULL,
  to_email text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Created'::payout_status,
  funded_at timestamp with time zone,
  claimed_at timestamp with time zone,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_commerce_id_fkey FOREIGN KEY (commerce_id) REFERENCES public.commerces(id)
);
CREATE TABLE public.tokens (
  symbol text NOT NULL,
  rate_to_usd numeric NOT NULL,
  updated_at timestamp without time zone DEFAULT now(),
  source text DEFAULT 'coingecko.com'::text,
  name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  logo text,
  CONSTRAINT tokens_pkey PRIMARY KEY (symbol)
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
  status text NOT NULL DEFAULT 'awaiting', -- awaiting|partial|detected|sweeping|swept|refunded|failed|expired
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