/**
 * API Client
 * Base HTTP client with auth token injection
 */

import { API_CONFIG } from "./config"

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Global token store — set by AuthTokenProvider
let _authToken: string | null = null

export function setAuthToken(token: string | null) {
  _authToken = token
}

export function getAuthToken(): string | null {
  return _authToken
}

interface RequestOptions extends RequestInit {
  timeout?: number
  skipAuth?: boolean
}

/**
 * `hasBody` decides whether we announce a JSON body, because Fastify rejects a
 * request that claims one and does not have it: Content-Type: application/json
 * with nothing after the headers is a 400 FST_ERR_CTP_EMPTY_JSON_BODY, thrown
 * before any route handler runs.
 *
 * That is not hypothetical — it is what "Bad Request" in the webhook verifier
 * was. Both endpoints that take no arguments (webhook-verify, resend-webhook)
 * were unreachable from this client, and the failure looks like a server
 * problem rather than a header we sent, so it went unnoticed on two buttons at
 * once.
 */
function getHeaders(options?: RequestOptions, hasBody = true): Record<string, string> {
  const headers: Record<string, string> = {
    ...(hasBody ? API_CONFIG.HEADERS : {}),
    ...(options?.headers as Record<string, string>),
  }

  if (!options?.skipAuth && _authToken) {
    headers["Authorization"] = `Bearer ${_authToken}`
  }

  return headers
}

async function fetchWithTimeout(url: string, options: RequestOptions = {}): Promise<Response> {
  const { timeout = API_CONFIG.TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request Timeout", "Request timed out")
    }
    throw error
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      response.statusText,
      errorData?.error || errorData?.message || "Request failed",
      errorData
    )
  }
  return response.json()
}

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: getHeaders(options, false),
      ...options,
    })
    return handleResponse<T>(response)
  },

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: getHeaders(options, data !== undefined),
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    })
    return handleResponse<T>(response)
  },

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const response = await fetchWithTimeout(url, {
      method: "PUT",
      headers: getHeaders(options, data !== undefined),
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    })
    return handleResponse<T>(response)
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    const response = await fetchWithTimeout(url, {
      method: "DELETE",
      headers: getHeaders(options, false),
      ...options,
    })
    return handleResponse<T>(response)
  },
}
