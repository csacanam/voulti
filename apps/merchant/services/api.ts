/**
 * API Client
 * Base HTTP client with common request/response handling
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

interface RequestOptions extends RequestInit {
  timeout?: number
}

/**
 * Base fetch wrapper with error handling and timeouts
 */
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

/**
 * Main API client functions
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        ...API_CONFIG.HEADERS,
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ApiError(
        response.status,
        response.statusText,
        errorData?.message || "Request failed",
        errorData
      )
    }

    return response.json()
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ApiError(
        response.status,
        response.statusText,
        errorData?.message || "Request failed",
        errorData
      )
    }

    return response.json()
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`

    const response = await fetchWithTimeout(url, {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ApiError(
        response.status,
        response.statusText,
        errorData?.message || "Request failed",
        errorData
      )
    }

    return response.json()
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`

    const response = await fetchWithTimeout(url, {
      method: "DELETE",
      headers: {
        ...API_CONFIG.HEADERS,
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ApiError(
        response.status,
        response.statusText,
        errorData?.message || "Request failed",
        errorData
      )
    }

    return response.json()
  },
}

