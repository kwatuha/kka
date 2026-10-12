"use client"

import { useEffect, useState } from "react"
import { laboratoryApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, Pill, FileText } from "lucide-react"
import { format } from "date-fns"

type Props = {
  orderId: number | string
  compact?: boolean
}

export function LabPatientClinicalContext({ orderId, compact }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    allergies: any[]
    prescriptions: any[]
    medicalHistory: any[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const ctx = await laboratoryApi.getOrderClinicalContext(String(orderId))
        if (!cancelled) {
          setData({
            allergies: ctx.allergies || [],
            prescriptions: ctx.prescriptions || [],
            medicalHistory: ctx.medicalHistory || [],
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load clinical context")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading allergies, history, and prescriptions…
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
      <Card className="border-amber-200/80 bg-amber-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            Allergies
          </CardTitle>
          <CardDescription>Review before contrast or invasive sampling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!data?.allergies?.length ? (
            <p className="text-muted-foreground">No recorded allergies</p>
          ) : (
            data.allergies.map((a) => (
              <div key={a.allergyId} className="rounded-md border bg-white/70 px-2 py-1.5">
                <div className="font-medium">{a.allergen}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {[a.allergyType, a.severity, a.status].filter(Boolean).join(" · ")}
                </div>
                {a.reaction ? <div className="text-xs mt-0.5">{a.reaction}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Pill className="h-4 w-4" />
            Recent prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-h-56 overflow-auto">
          {!data?.prescriptions?.length ? (
            <p className="text-muted-foreground">No recent prescriptions</p>
          ) : (
            data.prescriptions.map((rx) => (
              <div key={rx.prescriptionId} className="rounded-md border px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{rx.prescriptionNumber}</span>
                  <Badge variant="outline" className="text-[10px]">{rx.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {rx.prescriptionDate ? format(new Date(rx.prescriptionDate), "dd MMM yyyy") : "—"}
                  {rx.doctorFirstName ? ` · Dr ${rx.doctorFirstName} ${rx.doctorLastName || ""}` : ""}
                </div>
                {(rx.items || []).slice(0, 4).map((item: any, idx: number) => (
                  <div key={idx} className="text-xs mt-0.5">
                    {item.medicationName}
                    {item.dosage ? ` — ${item.dosage}` : ""}
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Medical history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-h-56 overflow-auto">
          {!data?.medicalHistory?.length ? (
            <p className="text-muted-foreground">No visit history on file</p>
          ) : (
            data.medicalHistory.map((h) => (
              <div key={h.recordId} className="rounded-md border px-2 py-1.5">
                <div className="text-xs text-muted-foreground">
                  {h.visitDate ? format(new Date(h.visitDate), "dd MMM yyyy") : "—"}
                  {h.visitType ? ` · ${h.visitType}` : ""}
                </div>
                {h.chiefComplaint ? (
                  <div className="text-xs mt-0.5">
                    <span className="text-muted-foreground">Complaint: </span>
                    {h.chiefComplaint}
                  </div>
                ) : null}
                {h.diagnosis ? (
                  <div className="text-xs mt-0.5">
                    <span className="text-muted-foreground">Dx: </span>
                    {h.diagnosis}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
