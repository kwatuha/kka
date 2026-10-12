"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2, Plus, Archive, Pencil } from "lucide-react"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import { getPayrollExportPayload } from "@/lib/payroll-export"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { payrollApi } from "@/lib/api"
import type { PayeBand } from "@/lib/kenya-statutory-payroll"

type RateSetRow = {
  rateSetId: number
  code: string
  label: string
  effectiveFrom: string
  effectiveTo?: string | null
  personalReliefMonthly: number
  nssfRate: number
  nssfTier1Ceiling: number
  nssfTier2Ceiling: number
  shifRate: number
  housingLevyRate: number
  payeBands?: PayeBand[]
  payeBandsJson?: PayeBand[]
  kraReferenceUrl?: string
  notes?: string
  isArchived?: number | boolean
}

function bandsFromRow(row: RateSetRow): PayeBand[] {
  const b = row.payeBands || row.payeBandsJson
  if (Array.isArray(b)) return b.map((x) => ({ upTo: x.upTo == null ? null : Number(x.upTo), rate: Number(x.rate) }))
  return [{ upTo: 24000, rate: 0.1 }, { upTo: null, rate: 0.3 }]
}

function fmtDate(d: string | undefined | null) {
  if (!d) return "—"
  return String(d).slice(0, 10)
}

function isActiveForToday(row: RateSetRow) {
  const today = new Date().toISOString().slice(0, 10)
  if (row.isArchived) return false
  const from = fmtDate(row.effectiveFrom)
  const to = row.effectiveTo ? fmtDate(row.effectiveTo) : null
  return from <= today && (!to || to >= today)
}

const emptyForm = (): Partial<RateSetRow> & { payeBands: PayeBand[] } => ({
  code: "",
  label: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: null,
  personalReliefMonthly: 2400,
  nssfRate: 0.06,
  nssfTier1Ceiling: 7000,
  nssfTier2Ceiling: 36000,
  shifRate: 0.0275,
  housingLevyRate: 0.015,
  kraReferenceUrl: "https://ecitizen.kra.go.ke/calculators/tax-calculators",
  notes: "",
  payeBands: [
    { upTo: 24000, rate: 0.1 },
    { upTo: 8333, rate: 0.25 },
    { upTo: 467667, rate: 0.3 },
    { upTo: 300000, rate: 0.325 },
    { upTo: null, rate: 0.35 },
  ],
})

export function PayrollStatutoryRatesPanel() {
  const [loading, setLoading] = useState(true)
  const [rateSets, setRateSets] = useState<RateSetRow[]>([])
  const [activeLabel, setActiveLabel] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, active] = await Promise.all([
        payrollApi.listStatutoryRates(true),
        payrollApi.getActiveStatutoryRate(),
      ])
      setRateSets(list.rateSets || [])
      setActiveLabel(active.rateSet?.label || active.rateSet?.rateSetLabel || "Built-in fallback")
    } catch (e: any) {
      toast({ title: "Failed to load tax tables", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (row: RateSetRow) => {
    setEditingId(row.rateSetId)
    setForm({
      ...row,
      effectiveFrom: fmtDate(row.effectiveFrom),
      effectiveTo: row.effectiveTo ? fmtDate(row.effectiveTo) : null,
      payeBands: bandsFromRow(row),
    })
    setDialogOpen(true)
  }

  const duplicate = (row: RateSetRow) => {
    setEditingId(null)
    const bands = bandsFromRow(row)
    setForm({
      ...row,
      rateSetId: undefined,
      code: `${row.code}-copy`,
      label: `${row.label} (copy)`,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: null,
      payeBands: bands,
    })
    setDialogOpen(true)
  }

  const updateBand = (index: number, field: keyof PayeBand, value: string) => {
    setForm((prev) => {
      const bands = [...(prev.payeBands || [])]
      const band = { ...bands[index] }
      if (field === "upTo") {
        band.upTo = value.trim() === "" ? null : Number(value)
      } else {
        band.rate = Number(value)
      }
      bands[index] = band
      return { ...prev, payeBands: bands }
    })
  }

  const addBand = () => {
    setForm((prev) => ({
      ...prev,
      payeBands: [...(prev.payeBands || []), { upTo: null, rate: 0.1 }],
    }))
  }

  const removeBand = (index: number) => {
    setForm((prev) => ({
      ...prev,
      payeBands: (prev.payeBands || []).filter((_, i) => i !== index),
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        code: form.code,
        label: form.label,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
        personalReliefMonthly: form.personalReliefMonthly,
        nssfRate: form.nssfRate,
        nssfTier1Ceiling: form.nssfTier1Ceiling,
        nssfTier2Ceiling: form.nssfTier2Ceiling,
        shifRate: form.shifRate,
        housingLevyRate: form.housingLevyRate,
        payeBands: form.payeBands,
        kraReferenceUrl: form.kraReferenceUrl,
        notes: form.notes,
      }
      if (editingId) {
        await payrollApi.updateStatutoryRate(String(editingId), body)
        toast({ title: "Tax table updated" })
      } else {
        await payrollApi.createStatutoryRate(body)
        toast({ title: "Tax table created" })
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const archive = async (row: RateSetRow) => {
    if (!confirm(`Archive rate set "${row.label}"? Past payroll is unchanged; future runs use the next effective set.`)) return
    try {
      await payrollApi.archiveStatutoryRate(String(row.rateSetId))
      toast({ title: "Rate set archived" })
      load()
    } catch (e: any) {
      toast({ title: "Archive failed", description: e.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Statutory tax tables</CardTitle>
            <CardDescription>
              PAYE bands, personal relief, NSSF, SHA (SHIF), and housing levy. The active set for today is{" "}
              <strong>{activeLabel}</strong>. Batch payroll uses the set effective on the{" "}
              <strong>pay period end date</strong>. Verify against{" "}
              <a
                href="https://ecitizen.kra.go.ke/calculators/tax-calculators"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-1"
              >
                KRA calculators
                <ExternalLink className="h-3 w-3" />
              </a>
              .
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <FinanceExportMenu
              disabled={loading || rateSets.length === 0}
              getPayload={() =>
                getPayrollExportPayload("tax-tables", {
                  periodLabel: new Date().toISOString().slice(0, 7),
                  periodStart: "",
                  periodEnd: "",
                  statusFilter: "all",
                  summary: null,
                  activeRateLabel: activeLabel,
                  transactions: [],
                  runs: [],
                  preview: null,
                  rateSets,
                })
              }
            />
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New rate set
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rateSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rate sets in the database yet. Run migration 141 or create a new set. Calculations use a built-in
              fallback until a set exists.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>PAYE bands</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateSets.map((row) => (
                  <TableRow key={row.rateSetId} className={row.isArchived ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-muted-foreground">{row.code}</TableCell>
                    <TableCell>
                      {fmtDate(row.effectiveFrom)}
                      {row.effectiveTo ? ` → ${fmtDate(row.effectiveTo)}` : " → open"}
                    </TableCell>
                    <TableCell>{bandsFromRow(row).length}</TableCell>
                    <TableCell>
                      {row.isArchived ? (
                        <Badge variant="secondary">Archived</Badge>
                      ) : isActiveForToday(row) ? (
                        <Badge>Active today</Badge>
                      ) : (
                        <Badge variant="outline">Scheduled / past</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => duplicate(row)}>
                        Duplicate
                      </Button>
                      {!row.isArchived && (
                        <Button variant="ghost" size="sm" onClick={() => archive(row)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit tax table" : "New tax table"}</DialogTitle>
            <DialogDescription>
              Use a new row when KRA updates bands (Finance Act). Set effective dates so month-end picks the correct
              table automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code (unique)</Label>
                <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <Label>Display label</Label>
                <Input value={form.label || ""} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom || ""}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Effective to (optional)</Label>
                <Input
                  type="date"
                  value={form.effectiveTo || ""}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value || null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <Label>Personal relief / month (KES)</Label>
                <Input
                  type="number"
                  value={form.personalReliefMonthly ?? 2400}
                  onChange={(e) => setForm({ ...form, personalReliefMonthly: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>NSSF rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.nssfRate ?? 0.06}
                  onChange={(e) => setForm({ ...form, nssfRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>SHA (SHIF) rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.shifRate ?? 0.0275}
                  onChange={(e) => setForm({ ...form, shifRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>NSSF tier 1 ceiling</Label>
                <Input
                  type="number"
                  value={form.nssfTier1Ceiling ?? 7000}
                  onChange={(e) => setForm({ ...form, nssfTier1Ceiling: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>NSSF tier 2 ceiling</Label>
                <Input
                  type="number"
                  value={form.nssfTier2Ceiling ?? 36000}
                  onChange={(e) => setForm({ ...form, nssfTier2Ceiling: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Housing levy rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.housingLevyRate ?? 0.015}
                  onChange={(e) => setForm({ ...form, housingLevyRate: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Monthly PAYE bands (progressive)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBand}>
                  Add band
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Each row: max KES in band at this rate. Leave “up to” empty on the last row for the top marginal rate.
              </p>
              <div className="space-y-2">
                {(form.payeBands || []).map((band, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Up to KES (empty = remainder)"
                      value={band.upTo == null ? "" : band.upTo}
                      onChange={(e) => updateBand(i, "upTo", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      className="w-28"
                      placeholder="Rate"
                      value={band.rate}
                      onChange={(e) => updateBand(i, "rate", e.target.value)}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeBand(i)} disabled={(form.payeBands?.length || 0) <= 1}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
