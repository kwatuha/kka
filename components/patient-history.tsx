"use client"

import { useEffect, useState } from "react"
import { Building2, FileDown, Loader2, Printer, UserRound } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  fetchPatientSummaryBundle,
  type PatientServiceEvent,
} from "@/lib/patient-care-timeline"
import {
  downloadPatientServiceCardPDF,
  downloadPatientSummaryPDF,
} from "@/lib/patient-summary-pdf"

interface PatientHistoryProps {
  patientId: string
}

export function PatientHistory({ patientId }: PatientHistoryProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<"summary" | "card" | null>(null)
  const [patient, setPatient] = useState<any>(null)
  const [events, setEvents] = useState<PatientServiceEvent[]>([])
  const [allergies, setAllergies] = useState<any[]>([])
  const [recentVitals, setRecentVitals] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!patientId) return
      try {
        setLoading(true)
        const bundle = await fetchPatientSummaryBundle(patientId)
        if (cancelled) return
        setPatient(bundle.patient)
        setEvents(bundle.events)
        setAllergies(bundle.allergies || [])
        setRecentVitals(bundle.recentVitals || [])
      } catch (err: any) {
        if (cancelled) return
        toast({
          title: "Could not load history",
          description: err.message || "Failed to load patient history",
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
  }, [patientId, toast])

  const handleSummary = async () => {
    try {
      setDownloading("summary")
      const bundle =
        patient && events.length
          ? { patient, events, allergies, recentVitals }
          : await fetchPatientSummaryBundle(patientId)
      downloadPatientSummaryPDF(bundle)
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Could not generate summary",
        variant: "destructive",
      })
    } finally {
      setDownloading(null)
    }
  }

  const handleServiceCard = async () => {
    try {
      setDownloading("card")
      const bundle =
        patient && events.length
          ? { patient, events }
          : await fetchPatientSummaryBundle(patientId)
      downloadPatientServiceCardPDF({ patient: bundle.patient, events: bundle.events })
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Could not generate service card",
        variant: "destructive",
      })
    } finally {
      setDownloading(null)
    }
  }

  const printHistory = () => {
    downloadPatientServiceCardPDF({ patient, events })
  }

  const fullName = patient
    ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
    : "Patient"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Patient Medical History</h2>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" asChild>
            <Link href={`/patients/${patientId}`}>Full patient chart</Link>
          </Button>
          <Button variant="outline" onClick={printHistory} disabled={loading || !patient}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleSummary}
            disabled={loading || downloading !== null}
          >
            {downloading === "summary" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Summary PDF
          </Button>
          <Button onClick={handleServiceCard} disabled={loading || downloading !== null}>
            {downloading === "card" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Service card PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading patient history…
        </div>
      ) : (
        <div id="patient-history-content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient information</CardTitle>
              <CardDescription>{fullName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient number</p>
                  <p className="font-medium">{patient?.patientNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sex</p>
                  <p className="font-medium">{patient?.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of birth</p>
                  <p className="font-medium">
                    {patient?.dateOfBirth
                      ? new Date(patient.dateOfBirth).toLocaleDateString("en-KE")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{patient?.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Facility</p>
                  <p className="font-medium">
                    {patient?.registeredBranchName || patient?.branchName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID number</p>
                  <p className="font-medium">{patient?.idNumber || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentVitals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent vitals</CardTitle>
                <CardDescription>
                  Latest measurements — open the{" "}
                  <Link href={`/patients/${patientId}`} className="underline underline-offset-2">
                    patient chart
                  </Link>{" "}
                  for trends and full history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Recorded</th>
                        <th className="py-2 pr-3 font-medium">BP</th>
                        <th className="py-2 pr-3 font-medium">Pulse</th>
                        <th className="py-2 pr-3 font-medium">Temp</th>
                        <th className="py-2 pr-3 font-medium">SpO₂</th>
                        <th className="py-2 pr-3 font-medium">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVitals.slice(0, 8).map((v, i) => {
                        const recorded = v.recordedAt || v.createdAt || v.date
                        const bp =
                          v.bloodPressure ||
                          (v.systolic != null && v.diastolic != null
                            ? `${v.systolic}/${v.diastolic}`
                            : "—")
                        return (
                          <tr key={v.vitalId || v.id || i} className="border-b border-border/60">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {recorded ? new Date(recorded).toLocaleString("en-KE") : "—"}
                            </td>
                            <td className="py-2 pr-3">{bp || "—"}</td>
                            <td className="py-2 pr-3">{v.pulse ?? v.heartRate ?? "—"}</td>
                            <td className="py-2 pr-3">{v.temperature ?? "—"}</td>
                            <td className="py-2 pr-3">{v.oxygenSaturation ?? v.spo2 ?? "—"}</td>
                            <td className="py-2 pr-3">{v.weight ?? "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {allergies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Allergies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {allergies.map((a, i) => (
                  <div key={a.allergyId || a.id || i} className="text-sm">
                    <span className="font-medium">{a.allergen || a.name || a.allergyName || "Allergy"}</span>
                    {a.severity ? (
                      <span className="text-muted-foreground"> — {a.severity}</span>
                    ) : null}
                    {a.reaction ? (
                      <p className="text-muted-foreground">{a.reaction}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Service history</CardTitle>
              <CardDescription>
                Recorded services with who offered them and at which facility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No visits, labs, prescriptions, or other services recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {event.dateLabel}
                          {event.timeLabel ? ` · ${event.timeLabel}` : ""}
                        </p>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <h4 className="text-sm font-semibold">{event.service}</h4>
                      {event.details ? (
                        <p className="text-sm text-muted-foreground mt-0.5">{event.details}</p>
                      ) : null}
                      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:gap-x-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/80">Offered by:</span>{" "}
                          {event.provider}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/80">Facility:</span>{" "}
                          {event.facility}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
