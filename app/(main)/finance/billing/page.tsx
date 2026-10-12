"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function FinanceBillingRedirectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Preserve all query parameters when redirecting
    const params = new URLSearchParams()
    searchParams.forEach((value, key) => {
      params.append(key, value)
    })
    
    const queryString = params.toString()
    const redirectUrl = `/billing${queryString ? `?${queryString}` : ''}`
    
    // Use replace to avoid adding to history and redirect immediately
    router.replace(redirectUrl)
  }, [searchParams, router])

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecting to billing...</p>
      </div>
    </div>
  )
}

