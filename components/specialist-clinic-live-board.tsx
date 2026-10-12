"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { CalendarDays, Loader2, Plus } from "lucide-react"
import { appointmentsApi } from "@/lib/api"
import { AddAppointmentForm } from "@/components/add-appointment-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

function formatTime(value: string | null | undefined) {
  if (!value) return "—"
  const s = String(value)
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5)
  return s
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—"
  const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  try {
    return format(parseISO(raw), "d MMM yyyy")
  } catch {
    return raw
  }
}

function statusVariant(status: string | undefined): "default" | "secondary" | "outline" | "destructive" {
  const s = String(status || "").toLowerCase()
  if (s === "confirmed" || s === "in_progress") return "default"
  if (s === "cancelled" || s === "no_show") return "destructive"
  if (s === "completed") return "secondary"
  return "outline"
}

export function SpecialistClinicLiveBoard({
  clinicLabel,
  refreshKey = 0,
}: {
  clinicLabel: string
  refreshKey?: number
}) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bookOpen, setBookOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await appointmentsApi.getAll(
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        200,
        undefined,
        { department: clinicLabel }
      )
      setRows(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Could not load clinic appointments",
        description: error?.message || "Failed to load from the database.",
        variant: "destructive",
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [clinicLabel])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const upcoming = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = String(a.appointmentDate || "").slice(0, 10)
      const db = String(b.appointmentDate || "").slice(0, 10)
      if (da !== db) return da.localeCompare(db)
      return String(a.appointmentTime || "").localeCompare(String(b.appointmentTime || ""))
    })
  }, [rows])

  const patients = useMemo(() => {
    const map = new Map<number, { patientId: number; name: string; patientNumber: string }>()
    for (const row of rows) {
      const id = Number(row.patientId)
      if (!id || map.has(id)) continue
      const name = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ") || "Patient"
      map.set(id, { patientId: id, name, patientNumber: row.patientNumber || "" })
    }
    return Array.from(map.values())
  }, [rows])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              {clinicLabel} appointments
            </CardTitle>
            <CardDescription>
              Live HMIS bookings for this clinic. Schedule visits for existing patients here.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setBookOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule appointment
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading from the database…
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No database appointments for {clinicLabel} yet. Use Schedule appointment to book a
                        registered patient.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((row) => {
                      const name = [row.patientFirstName, row.patientLastName].filter(Boolean).join(" ")
                      const doctor = [row.doctorFirstName, row.doctorLastName].filter(Boolean).join(" ")
                      return (
                        <TableRow key={row.appointmentId}>
                          <TableCell>
                            <div className="font-medium">{formatTime(row.appointmentTime)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(row.appointmentDate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.patientId ? (
                              <Link className="font-medium underline" href={`/patients/${row.patientId}`}>
                                {name || "Patient"}
                              </Link>
                            ) : (
                              name || "—"
                            )}
                            {row.patientNumber ? (
                              <div className="text-xs text-muted-foreground">{row.patientNumber}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>{doctor || "Not assigned"}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{row.reason || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(row.status)}>{row.status || "scheduled"}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patients booked in this clinic</CardTitle>
          <CardDescription>
            Taken from appointment records. Open a file to continue care, then schedule the next visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No patients booked for {clinicLabel} yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {patients.map((p) => (
                <li key={p.patientId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    <Link className="font-medium underline" href={`/patients/${p.patientId}`}>
                      {p.name}
                    </Link>
                    {p.patientNumber ? (
                      <span className="ml-2 text-muted-foreground">{p.patientNumber}</span>
                    ) : null}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setBookOpen(true)}>
                    Book next visit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddAppointmentForm
        open={bookOpen}
        onOpenChange={setBookOpen}
        defaultDepartment={clinicLabel}
        lockDepartment
        onSuccess={() => void load()}
      />
    </div>
  )
}
