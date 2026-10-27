"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Loader2 } from "lucide-react"
import { FacilityLogoMark } from "@/components/facility-logo-mark"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const redirectingRef = useRef(false)

  useEffect(() => {
    // Only redirect if not loading, not authenticated, not already on login page, and not already redirecting
    if (!isLoading && !isAuthenticated && pathname !== "/login" && !redirectingRef.current) {
      redirectingRef.current = true
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router, pathname])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
        <FacilityLogoMark className="max-h-12 w-auto max-w-[min(100%,14rem)]" />
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#0f4c75]" />
          <p className="text-sm text-muted-foreground">Loading your session…</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (will redirect via useEffect)
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
} 