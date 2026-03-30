/**
 * Hook to get Privy authentication token
 * 
 * This token is needed to authenticate with the backend API
 * Backend will validate the token and extract user's email and wallet address
 */

import { usePrivy } from "@privy-io/react-auth"
import { useState, useEffect } from "react"

export function usePrivyToken() {
  const { getAccessToken, authenticated, ready } = usePrivy()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      if (!ready) {
        setLoading(true)
        return
      }

      if (!authenticated) {
        setToken(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const accessToken = await getAccessToken()
        setToken(accessToken)
      } catch (err) {
        console.error("Failed to get Privy token:", err)
        setError(err instanceof Error ? err.message : "Failed to get token")
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    fetchToken()
  }, [ready, authenticated, getAccessToken])

  return {
    token,
    loading,
    error,
  }
}

