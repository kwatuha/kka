"use client"

import { useCallback, useEffect, useState } from "react"
import { telemedicineApi } from "@/lib/api"

/**
 * Whether the logged-in user has saved a join URL under Telemedicine → My Zoom defaults.
 * Required to start a **new** telemedicine session (API enforced); joining an existing visit does not require this.
 */
export function useTelemedicineZoomDefaults() {
  const [loading, setLoading] = useState(true)
  const [hasDefaults, setHasDefaults] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const d = await telemedicineApi.getMyDefaults()
      setHasDefaults(!!(d?.defaultZoomJoinUrl?.trim()))
    } catch {
      setHasDefaults(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const d = await telemedicineApi.getMyDefaults()
        if (cancelled) return
        setHasDefaults(!!(d?.defaultZoomJoinUrl?.trim()))
      } catch {
        if (!cancelled) setHasDefaults(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-check when user returns from another tab (e.g. after saving defaults)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [refresh])

  return { loading, hasDefaults, refresh }
}
