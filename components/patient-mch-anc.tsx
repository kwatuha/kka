"use client"

import { useEffect, useState, FormEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus } from "lucide-react"
import { mchApi } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AncVisit = {
  visitId: number
  visitDate: string
  gestationWeeks?: number | null
  weight?: number | null
  bloodPressure?: string | null
  fundalHeight?: number | null
  fetalHeartRate?: number | null
  presentation?: string | null
  findings?: string | null
  nextAppointmentDate?: string | null
  notes?: string | null
}

const emptyForm = {
  visitDate: new Date().toISOString().slice(0, 10),
  gestationWeeks: "",
  weight: "",
  bloodPressure: "",
  fundalHeight: "",
  fetalHeartRate: "",
  presentation: "",
  findings: "",
  nextAppointmentDate: "",
  notes: "",
}

export function PatientMchAnc({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<AncVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const rows = await mchApi.listAncVisits(patientId)
      setVisits(Array.isArray(rows) ? rows : [])
    } catch (err: any) {
      setError(err.message || "Failed to load ANC visits")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [patientId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await mchApi.createAncVisit(patientId, {
        visitDate: form.visitDate,
        gestationWeeks: form.gestationWeeks ? Number(form.gestationWeeks) : null,
        weight: form.weight ? Number(form.weight) : null,
        bloodPressure: form.bloodPressure || null,
        fundalHeight: form.fundalHeight ? Number(form.fundalHeight) : null,
        fetalHeartRate: form.fetalHeartRate ? Number(form.fetalHeartRate) : null,
        presentation: form.presentation || null,
        findings: form.findings || null,
        nextAppointmentDate: form.nextAppointmentDate || null,
        notes: form.notes || null,
      })
      setOpen(false)
      setForm({ ...emptyForm, visitDate: new Date().toISOString().slice(0, 10) })
      await load()
    } catch (err: any) {
      setError(err.message || "Could not save ANC visit")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>MCH — antenatal visits</CardTitle>
          <CardDescription>
            Structured ANC register for maternal care and MOH reporting.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          ANC visit
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No antenatal visits recorded yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>GA (wk)</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>FHR</TableHead>
                  <TableHead>Next appt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((v) => (
                  <TableRow key={v.visitId}>
                    <TableCell>{v.visitDate}</TableCell>
                    <TableCell>{v.gestationWeeks ?? "—"}</TableCell>
                    <TableCell>{v.weight != null ? `${v.weight} kg` : "—"}</TableCell>
                    <TableCell>{v.bloodPressure || "—"}</TableCell>
                    <TableCell>{v.fetalHeartRate ?? "—"}</TableCell>
                    <TableCell>{v.nextAppointmentDate || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record ANC visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Visit date</Label>
                <Input
                  type="date"
                  required
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Gestation (weeks)</Label>
                <Input
                  type="number"
                  min={1}
                  max={45}
                  value={form.gestationWeeks}
                  onChange={(e) => setForm({ ...form, gestationWeeks: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Blood pressure</Label>
                <Input
                  placeholder="120/80"
                  value={form.bloodPressure}
                  onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fundal height (cm)</Label>
                <Input
                  type="number"
                  value={form.fundalHeight}
                  onChange={(e) => setForm({ ...form, fundalHeight: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fetal heart rate</Label>
                <Input
                  type="number"
                  value={form.fetalHeartRate}
                  onChange={(e) => setForm({ ...form, fetalHeartRate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Presentation</Label>
              <Input
                value={form.presentation}
                onChange={(e) => setForm({ ...form, presentation: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Findings</Label>
              <Textarea
                rows={2}
                value={form.findings}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Next appointment</Label>
              <Input
                type="date"
                value={form.nextAppointmentDate}
                onChange={(e) => setForm({ ...form, nextAppointmentDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save visit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
