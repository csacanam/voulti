// src/blockchain/utils/errors.ts
export class BlockchainError extends Error {
  constructor(message: string, code: string, transactionHash: string | null = null) {
    super(message);
    this.name = "BlockchainError";
    this.code = code;
    this.transactionHash = transactionHash;
  }
  
  code: string;
  transactionHash: string | null;
}

export const ERROR_CODES = {
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVOICE_ALREADY_EXISTS: "INVOICE_ALREADY_EXISTS",
  COMMERCE_NOT_WHITELISTED: "COMMERCE_NOT_WHITELISTED",
  TOKEN_NOT_WHITELISTED: "TOKEN_NOT_WHITELISTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
};

export function handleBlockchainError(error: any): never {
  if (error.code === "INSUFFICIENT_FUNDS") {
    throw new BlockchainError(
      "Insufficient balance for transaction",
      ERROR_CODES.INSUFFICIENT_BALANCE
    );
  } else if (error.message && error.message.includes("already exists")) {
    throw new BlockchainError(
      "Invoice already exists",
      ERROR_CODES.INVOICE_ALREADY_EXISTS
    );
  } else {
    throw new BlockchainError(error.message, ERROR_CODES.TRANSACTION_FAILED);
  }
} 