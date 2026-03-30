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

export type PaymentLinkStatus = "active" | "expired" | "disabled"
export type PaymentLinkCurrency = "USD" | "COP" | "MXN" | "BRL"

export interface PaymentLink {
  id: string
  title: string
  currency: PaymentLinkCurrency
  amount: number
  status: PaymentLinkStatus
  created: string
  expires?: string
  uses: number
  url: string
}
