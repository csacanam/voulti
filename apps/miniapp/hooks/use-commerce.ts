"use client"

import { useState, useEffect, useCallback } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { api, ApiError, type Commerce } from "@/lib/api"

type State =
  | { status: "loading" }
  | { status: "needs-onboarding"; wallet: string }
  | { status: "ready"; commerce: Commerce }
  | { status: "error"; message: string }

export function useCommerce() {
  const { ready, authenticated, user, getAccessToken } = usePrivy()
  const [state, setState] = useState<State>({ status: "loading" })

  const fetchCommerce = useCallback(async () => {
    if (!user?.wallet?.address) return
    const wallet = user.wallet.address

    try {
      const token = await getAccessToken()
      if (!token) {
        setState({ status: "error", message: "No auth token" })
        return
      }
      const commerce = await api.getCommerceByWallet(wallet, token)
      setState({ status: "ready", commerce })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ status: "needs-onboarding", wallet })
      } else {
        setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" })
      }
    }
  }, [user?.wallet?.address, getAccessToken])

  useEffect(() => {
    if (!ready || !authenticated || !user?.wallet?.address) return
    fetchCommerce()
  }, [ready, authenticated, user?.wallet?.address, fetchCommerce])

  const register = async (data: { name: string; currency: string; email?: string }) => {
    if (!user?.wallet?.address) throw new Error("No wallet")
    const token = await getAccessToken()
    if (!token) throw new Error("No auth token")
    try {
      const commerce = await api.registerCommerce(
        {
          wallet: user.wallet.address,
          name: data.name,
          currency: data.currency,
          confirmation_email: data.email,
        },
        token
      )
      setState({ status: "ready", commerce })
    } catch (err) {
      // 409 = already exists (race condition) — just refetch
      if (err instanceof ApiError && err.status === 409) {
        await fetchCommerce()
        return
      }
      throw err
    }
  }

  return { state, register, refetch: fetchCommerce }
}
