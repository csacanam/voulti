export interface Payout {
  id: string
  recipientName: string
  email: string
  walletAddress: string
  currency: string
  amount: number
  amountUSD: number
  date: string
  status: "completed" | "pending" | "failed"
  statusOriginal?: string // Original status from backend (Funded, Claimed, etc.)
  txHash: string
}

export interface CSVRow {
  name: string
  email: string
  walletAddress: string
  currency: string
  amount: number
}

export type TransactionType = "payment" | "payout" | "deposit"
export type TransactionStatus = "completed" | "pending" | "failed"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  amountUSD: number
  currency: string
  date: string
  status: TransactionStatus
  recipientName?: string // For payouts
  senderName?: string // For payments/deposits
  txHash?: string
}

export type PaymentLinkStatus = "active" | "paid" | "expired" | "refunded"
// Every currency the API accepts on POST /invoices; the price currency is
// chosen per link, so this must not lag behind fiat_exchange_rates.
export type PaymentLinkCurrency = "USD" | "EUR" | "COP" | "ARS" | "BRL" | "MXN"

export interface PaymentLink {
  webhook?: "none" | "delivered" | "failing"
  webhookAttempts?: number
  id: string
  title: string
  currency: PaymentLinkCurrency
  amount: number
  status: PaymentLinkStatus
  created: string
  expires?: string
  uses: number
  url: string
  /** The merchant's own identifier for the buyer, set when the invoice was created. */
  reference?: string
  /** What the payer was told they are buying — the only field of the two that
      they actually see. */
  description?: string
  /** Where the money came from. Crypto carries no name; this is the closest
      thing to a customer identity it offers. */
  payerAddress?: string
  txHash?: string
  network?: string
  paidToken?: string
  paidAmount?: number
}
