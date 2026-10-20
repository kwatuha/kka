"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  getExperiencePackScopeRedirectPath,
  isExperiencePackPathScopedDown,
} from "@/lib/experience-pack-scope"
import { isDhaCertExperiencePack } from "@/lib/dha-cert-scope"
import { isTelemedicineExperiencePack } from "@/lib/telemedicine-scope"

/**
 * Soft-blocks direct URLs to modules scoped down for an experience pack (telemedicine, dha-cert).
 * Restore access by flipping status in the matching scope file or disabling the pack.
 */
export function TelemedicineScopeGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isTelemedicineExperiencePack() && !isDhaCertExperiencePack()) return
    if (!isExperiencePackPathScopedDown(pathname)) return
    router.replace(getExperiencePackScopeRedirectPath())
  }, [pathname, router])

  return null
}
