"use client"

import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TelemedicineHelpLink } from "@/components/telemedicine-help-link"
import { AlertCircle } from "lucide-react"

type Props = {
  loading: boolean
  hasDefaults: boolean
  /** e.g. "Start telemedicine" — used in copy */
  startActionLabel?: string
}

/**
 * Shown when the user cannot start new visits until My Zoom defaults are saved.
 */
export function TelemedicineZoomDefaultsRequiredBanner({
  loading,
  hasDefaults,
  startActionLabel = "Start telemedicine",
}: Props) {
  if (loading || hasDefaults) return null

  return (
    <Alert className="border-amber-500/40 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50 dark:border-amber-600/50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Meeting defaults required to start a new visit</AlertTitle>
      <AlertDescription className="text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          Save a join URL under{" "}
          <Link href="/telemedicine/settings" className="underline font-medium">
            My Zoom defaults
          </Link>{" "}
          before <strong>{startActionLabel}</strong>.
        </span>
        <TelemedicineHelpLink />
      </AlertDescription>
    </Alert>
  )
}
