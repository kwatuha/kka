"use client"

import { HospitalLogoImage } from "@/components/hospital-logo-image"
import { cn } from "@/lib/utils"

interface FacilityLogoMarkProps {
  className?: string
  compact?: boolean
  /** Dark hero panels (login) — full wordmark on brand background */
  onDark?: boolean
}

/** Branded logo — sidebar PNG on dark panels; main / print assets on light surfaces. */
export function FacilityLogoMark({ className, compact, onDark }: FacilityLogoMarkProps) {
  if (onDark) {
    return (
      <HospitalLogoImage
        className={cn("max-w-[min(100%,18rem)]", className)}
        variant="sidebar"
      />
    )
  }
  return (
    <HospitalLogoImage
      className={className}
      variant={compact ? "compact" : "default"}
    />
  )
}
