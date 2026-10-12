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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Delivery = { deliveryId: number; deliveryDate: string; deliveryType?: string }
type PncVisit = {
  visitId: number
  deliveryId: number
  visitDate: string
  visitType: string
  maternalCondition?: string | null
  babyCondition?: string | null
  breastfeedingStatus?: string | null
  findings?: string | null
  nextAppointmentDate?: string | null
  notes?: string | null
}

const emptyForm = {
  deliveryId: "",
  visitDate: new Date().toISOString().slice(0, 10),
  visitType: "other",
  maternalCondition: "",
  babyCondition: "",
  breastfeedingStatus: "",
  findings: "",
  nextAppointmentDate: "",
  notes: "",
}

export function PatientMchPnc({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<PncVisit[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [pncRows, delRows] = await Promise.all([
        mchApi.listPncVisits(patientId),
        mchApi.listDeliveries(patientId),
      ])
      setVisits(Array.isArray(pncRows) ? pncRows : [])
      setDeliveries(Array.isArray(delRows) ? delRows : [])
    } catch (err: any) {
      setError(err.message || "Failed to load postnatal visits")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [patientId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.deliveryId) return
    setSaving(true)
    try {
      await mchApi.createPncVisit(patientId, {
        deliveryId: Number(form.deliveryId),
        visitDate: form.visitDate,
        visitType: form.visitType,
        maternalCondition: form.maternalCondition || null,
        babyCondition: form.babyCondition || null,
        breastfeedingStatus: form.breastfeedingStatus || null,
        findings: form.findings || null,
        nextAppointmentDate: form.nextAppointmentDate || null,
        notes: form.notes || null,
      })
      setOpen(false)
      setForm(emptyForm)
      await load()
    } catch (err: any) {
      setError(err.message || "Failed to save postnatal visit")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Postnatal care (PNC)</CardTitle>
          <CardDescription>
            Linked to maternity deliveries — feeds MOH 708 postnatal counts (partial MCH module).
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          disabled={deliveries.length === 0}
          title={deliveries.length === 0 ? "Register a delivery in Maternity first" : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add PNC visit
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deliveries found for this patient. Record a delivery under{" "}
            <strong>Maternity</strong> before adding postnatal visits.
          </p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No postnatal visits recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Maternal</TableHead>
                <TableHead>Baby / BF</TableHead>
                <TableHead>Next appt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.map((v) => (
                <TableRow key={v.visitId}>
                  <TableCell>{v.visitDate}</TableCell>
                  <TableCell>{v.visitType}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{v.maternalCondition || "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">
                    {[v.babyCondition, v.breastfeedingStatus].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>{v.nextAppointmentDate || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record postnatal visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Delivery *</Label>
              <Select
                value={form.deliveryId}
                onValueChange={(v) => setForm((f) => ({ ...f, deliveryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery" />
                </SelectTrigger>
                <SelectContent>
                  {deliveries.map((d) => (
                    <SelectItem key={d.deliveryId} value={String(d.deliveryId)}>
                      #{d.deliveryId} — {d.deliveryDate}
                      {d.deliveryType ? ` (${d.deliveryType})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Visit date *</Label>
                <Input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Visit type</Label>
                <Select
                  value={form.visitType}
                  onValueChange={(v) => setForm((f) => ({ ...f, visitType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["day1", "day3", "day7", "week6", "other"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Maternal condition</Label>
              <Textarea
                value={form.maternalCondition}
                onChange={(e) => setForm((f) => ({ ...f, maternalCondition: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Baby condition</Label>
              <Textarea
                value={form.babyCondition}
                onChange={(e) => setForm((f) => ({ ...f, babyCondition: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Breastfeeding status</Label>
              <Input
                value={form.breastfeedingStatus}
                onChange={(e) => setForm((f) => ({ ...f, breastfeedingStatus: e.target.value }))}
              />
            </div>
            <div>
              <Label>Findings</Label>
              <Textarea
                value={form.findings}
                onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Next appointment</Label>
              <Input
                type="date"
                value={form.nextAppointmentDate}
                onChange={(e) => setForm((f) => ({ ...f, nextAppointmentDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.deliveryId}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
