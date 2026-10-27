export type FhirPublishPayload = {
  skipped?: boolean
  reason?: string
  mode?: string
  count?: number
  status?: number | string
  logId?: number
  error?: string
  warning?: string
}

/** Surface auto SHR/FHIR publish result after encounter save (clinical staff feedback). */
type ToastLike = (props: {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}) => void

export function notifyFhirPublish(toast: ToastLike, fhirPublish?: FhirPublishPayload | null) {
  if (!fhirPublish) return

  if (fhirPublish.skipped) {
    const reason = fhirPublish.reason || "Publish skipped"
    if (reason.includes("consent") || reason.includes("NUPI")) {
      toast({
        title: "National SHR not published",
        description: `${reason}. Complete SHR consent at the top of the chart, then save again.`,
        variant: "default",
      })
    } else {
      toast({
        title: "FHIR publish skipped",
        description: reason,
      })
    }
    return
  }

  if (fhirPublish.error) {
    toast({
      title: "SHR publish failed",
      description: String(fhirPublish.error).slice(0, 200),
      variant: "destructive",
    })
    return
  }

  const mode = fhirPublish.mode || "live"
  const logId = fhirPublish.logId ?? (fhirPublish as { exportIds?: number[] }).exportIds?.[0]
  const warn = fhirPublish.warning ? ` ${fhirPublish.warning}` : ""
  toast({
    title: "Shared Health Record updated",
    description: `Visit bundle sent (${mode})${logId ? ` · log #${logId}` : ""}.${warn}`,
  })
}
