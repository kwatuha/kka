"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { clinicalCdsApi } from "@/lib/api"

type CdsAlert = { severity?: string; type?: string; message: string }

type Props = {
  patientId: string
  /** When set, fields are controlled by parent (e.g. triage form). */
  chiefComplaint?: string
  presentingSymptoms?: string
  onChiefComplaintChange?: (v: string) => void
  onPresentingSymptomsChange?: (v: string) => void
  compact?: boolean
}

export function TriageCdsPanel({
  patientId,
  chiefComplaint: chiefProp,
  presentingSymptoms: symptomsProp,
  onChiefComplaintChange,
  onPresentingSymptomsChange,
  compact = false,
}: Props) {
  const [chiefLocal, setChiefLocal] = useState("")
  const [symptomsLocal, setSymptomsLocal] = useState("")
  const [alerts, setAlerts] = useState<CdsAlert[]>([])
  const [loading, setLoading] = useState(false)

  const chief = chiefProp !== undefined ? chiefProp : chiefLocal
  const symptoms = symptomsProp !== undefined ? symptomsProp : symptomsLocal
  const setChief = onChiefComplaintChange ?? setChiefLocal
  const setSymptoms = onPresentingSymptomsChange ?? setSymptomsLocal

  const clinicalText = useMemo(
    () =>
      [chief, symptoms]
        .map((s) => String(s || "").trim())
        .filter(Boolean)
        .join(" | "),
    [chief, symptoms]
  )

  useEffect(() => {
    const pid = Number(patientId)
    if (!pid || clinicalText.length < 4) {
      setAlerts([])
      return
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true)
          const r = await clinicalCdsApi.evaluate({
            patientId: pid,
            clinicalText,
          })
          setAlerts(r.alerts || [])
        } catch {
          setAlerts([])
        } finally {
          setLoading(false)
        }
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [patientId, clinicalText])

  if (!patientId) return null

  return (
    <div className={`rounded-md border border-teal-200/80 bg-teal-50/40 p-3 dark:bg-teal-950/20 ${compact ? "space-y-2" : "space-y-3"}`}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-teal-950 dark:text-teal-100">
          Triage CDS (CLN-CDS-TRIAGE)
        </Label>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {!onChiefComplaintChange ? (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Chief complaint</Label>
            <Textarea
              value={chief}
              onChange={(e) => setChief(e.target.value)}
              placeholder="e.g. fever and rash for 2 days"
              rows={compact ? 2 : 3}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Presenting symptoms (optional)</Label>
            <Textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Additional symptoms for IDSR keyword checks"
              rows={compact ? 2 : 2}
              className="text-sm"
            />
          </div>
        </>
      ) : null}
      {alerts.length > 0 ? (
        <ul className="space-y-1.5">
          {alerts.map((a, i) => (
            <li
              key={`${a.type}-${i}`}
              className="flex gap-2 rounded border border-amber-200/80 bg-amber-50/80 px-2 py-1.5 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      ) : clinicalText.length >= 4 ? (
        <p className="text-xs text-muted-foreground">No CDS alerts for this text (allergy/IDSR rules).</p>
      ) : (
        <p className="text-xs text-muted-foreground">Enter chief complaint (4+ characters) for live CDS hints.</p>
      )}
    </div>
  )
}
