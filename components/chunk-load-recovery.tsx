"use client"

import { useEffect } from "react"

const SESSION_KEY = "hmis_chunk_reload_once"

function isChunkLoadFailure(reason: unknown): boolean {
  const msg = String(
    (reason as Error)?.message || (reason as { reason?: string })?.reason || reason || ""
  )
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    msg
  )
}

/**
 * After deploy, cached HTML may reference removed JS chunks — first load throws; refresh fixes it.
 * Reload once per tab session when we detect a chunk load failure.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const maybeReload = (reason: unknown) => {
      if (!isChunkLoadFailure(reason)) return
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return
      try {
        sessionStorage.setItem(SESSION_KEY, String(Date.now()))
      } catch {
        /* ignore */
      }
      window.location.reload()
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      maybeReload(event.reason)
    }
    const onError = (event: ErrorEvent) => {
      maybeReload(event.error || event.message)
    }

    window.addEventListener("unhandledrejection", onRejection)
    window.addEventListener("error", onError)
    return () => {
      window.removeEventListener("unhandledrejection", onRejection)
      window.removeEventListener("error", onError)
    }
  }, [])

  return null
}
