const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, opts: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...init } = opts
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error || "Request failed")
  return data
}

export interface Commerce {
  commerce_id: string
  name: string
  wallet: string
  currency: string
  confirmation_email?: string | null
  icon_url?: string | null
}

export const api = {
  getCommerceByWallet: (wallet: string, token: string) =>
    request<{ data: Commerce }>(`/commerces/by-wallet/${wallet}`, { token }).then(r => r.data),

  registerCommerce: (body: { wallet: string; name: string; currency: string; confirmation_email?: string }, token: string) =>
    request<{ data: Commerce }>(`/commerces`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }).then(r => r.data),

  createInvoice: (body: { commerce_id: string; amount_fiat: number; currency: string; expires_at?: string }) =>
    request<{ data: any }>(`/invoices`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then(r => r.data),

  listInvoices: (commerceId: string, token: string) =>
    request<{ data: any[] }>(`/invoices/by-commerce/${commerceId}`, { token }).then(r => r.data),

  getBalances: (commerceId: string, token: string) =>
    request<{ data: any[] }>(`/commerces/${commerceId}/balances`, { token }).then(r => r.data),

  getWithdrawFee: (tokenSymbol: string) =>
    request<{ data: { fee_token: number; fee_usd: number } }>(`/commerces/withdraw-fee/${tokenSymbol}`).then(r => r.data),

  withdrawFor: (commerceId: string, body: { token_address: string; amount: string; network: string; to: string }, token: string) =>
    request<{ data: any }>(`/commerces/${commerceId}/withdraw-for`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }).then(r => r.data),
}
