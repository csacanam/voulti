"use client"

import { useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { setAuthToken } from "@/services/api"

/**
 * Syncs Privy access token to the API client automatically.
 * Must be inside PrivyProvider.
 */
export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, authenticated, ready } = usePrivy()

  useEffect(() => {
    if (!ready) return

    if (!authenticated) {
      setAuthToken(null)
      return
    }

    const syncToken = async () => {
      try {
        const token = await getAccessToken()
        setAuthToken(token)
      } catch {
        setAuthToken(null)
      }
    }

    syncToken()

    // Refresh token every 4 minutes (Privy tokens expire in 5 min)
    const interval = setInterval(syncToken, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [ready, authenticated, getAccessToken])

  return <>{children}</>
}
