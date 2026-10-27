"use client"

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { FacilityLogoMark } from "@/components/facility-logo-mark"
import { getBrandingMisTitle } from "@/lib/branding"

const AUTH_KEYS = ["auth_token", "token", "jwt_token", "current_branch_id"] as const

function clearAuthStorage() {
  try {
    for (const key of AUTH_KEYS) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore storage errors
  }
}

function loginHref() {
  // Static export uses basePath `/hmis`; hard navigate avoids soft-router races with AuthProvider.
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/hmis").replace(/\/$/, "")
  return `${basePath}/login`
}

export default function LogoutPage() {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    clearAuthStorage()
    // Immediate hard redirect — do not wait on AuthProvider verify / soft router.push
    window.location.replace(loginHref())
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <FacilityLogoMark className="max-h-14 w-auto max-w-[min(100%,16rem)]" />
        <p className="text-xs font-medium text-slate-500">{getBrandingMisTitle()}</p>
      </div>
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0f4c75]" />
        <p className="text-sm text-slate-600">Signing you out securely…</p>
      </div>
    </div>
  )
}
