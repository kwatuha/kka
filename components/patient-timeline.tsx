"use client"

import { useEffect, useState } from "react"
import { Building2, Download, Loader2, UserRound, Stethoscope } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  fetchPatientServiceEvents,
  type PatientServiceEvent,
} from "@/lib/patient-care-timeline"
import { downloadPatientServiceCardPDF } from "@/lib/patient-summary-pdf"

const TYPE_STYLES: Record<string, string> = {
  Visit: "bg-emerald-100 text-emerald-900 border-emerald-200",
  Laboratory: "bg-sky-100 text-sky-900 border-sky-200",
  Pharmacy: "bg-violet-100 text-violet-900 border-violet-200",
  Radiology: "bg-amber-100 text-amber-900 border-amber-200",
  Procedure: "bg-orange-100 text-orange-900 border-orange-200",
  Appointment: "bg-teal-100 text-teal-900 border-teal-200",
  Admission: "bg-rose-100 text-rose-900 border-rose-200",
  Billing: "bg-slate-100 text-slate-900 border-slate-200",
  Queue: "bg-lime-100 text-lime-900 border-lime-200",
}

type Props = {
  patientId: string
  patient?: any
}

export function PatientTimeline({ patientId, patient }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [events, setEvents] = useState<PatientServiceEvent[]>([])
  const [profile, setProfile] = useState<any>(patient || null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!patientId) return
      try {
        setLoading(true)
        const { patient: p, events: list } = await fetchPatientServiceEvents(patientId, patient)
        if (cancelled) return
        setProfile(p)
        setEvents(list)
      } catch (err: any) {
        if (cancelled) return
        console.error(err)
        toast({
          title: "Could not load services",
          description: err.message || "Failed to load patient service history",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [patientId, patient, toast])

  const handleDownloadCard = async () => {
    try {
      setDownloading(true)
      const { patient: p, events: list } =
        events.length && profile
          ? { patient: profile, events }
          : await fetchPatientServiceEvents(patientId, patient)
      downloadPatientServiceCardPDF({ patient: p, events: list })
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Could not generate service card",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-800" />
            Patient service card
          </CardTitle>
          <CardDescription>
            Every recorded service, who offered it, and at which facility
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadCard} disabled={downloading || loading}>
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download service card
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading services…
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No visits, labs, prescriptions, or other services recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            {events.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                  </div>
                  {index < events.length - 1 && (
                    <div className="absolute top-8 bottom-0 w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-6 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {event.dateLabel}
                      {event.timeLabel ? ` · ${event.timeLabel}` : ""}
                    </p>
                    <Badge
                      variant="outline"
                      className={TYPE_STYLES[event.type] || "text-xs"}
                    >
                      {event.type}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-semibold leading-snug">{event.service}</h4>
                  {event.details ? (
                    <p className="text-sm text-muted-foreground mt-0.5">{event.details}</p>
                  ) : null}
                  <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground/80">Offered by:</span> {event.provider}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground/80">Facility:</span> {event.facility}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
