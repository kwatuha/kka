"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, ClipboardList, ExternalLink, Loader2, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { patientApi, integrationsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

type Problem = {
  problemId: number
  problemText: string
  icd10Code?: string | null
  snomedCode?: string | null
  snomedDisplay?: string | null
  medicalRecordId?: number | null
  status: string
  onsetDate?: string | null
  resolvedDate?: string | null
  notes?: string | null
  carePlanNotes?: string | null
}

export function PatientProblems({
  patientId,
  medicalRecordId,
}: {
  patientId: string
  /** When adding from an encounter, links problem to medical_records.recordId */
  medicalRecordId?: number | null
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [includeResolved, setIncludeResolved] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Problem | null>(null)
  const [saving, setSaving] = useState(false)
  const [fhirLoading, setFhirLoading] = useState(false)
  const [form, setForm] = useState({
    problemText: "",
    icd10Code: "",
    snomedCode: "",
    snomedDisplay: "",
    status: "active",
    onsetDate: "",
    notes: "",
    carePlanNotes: "",
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const rows = await patientApi.getProblems(patientId, includeResolved)
      setProblems(rows || [])
    } catch (err: any) {
      setError(err.message || "Failed to load problem list")
    } finally {
      setLoading(false)
    }
  }, [patientId, includeResolved])

  useEffect(() => {
    void load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({
      problemText: "",
      icd10Code: "",
      snomedCode: "",
      snomedDisplay: "",
      status: "active",
      onsetDate: "",
      notes: "",
      carePlanNotes: "",
    })
    setFormOpen(true)
  }

  const suggestSnomed = async (icd10: string) => {
    const code = icd10.trim()
    if (!code) return
    try {
      const m = await patientApi.lookupProblemSnomed(patientId, code)
      if (m?.snomed) {
        setForm((f) => ({
          ...f,
          snomedCode: m.snomed || "",
          snomedDisplay: m.display || "",
        }))
      }
    } catch {
      /* optional lookup */
    }
  }

  const openEdit = (p: Problem) => {
    setEditing(p)
    setForm({
      problemText: p.problemText,
      icd10Code: p.icd10Code || "",
      snomedCode: p.snomedCode || "",
      snomedDisplay: p.snomedDisplay || "",
      status: p.status,
      onsetDate: p.onsetDate ? String(p.onsetDate).slice(0, 10) : "",
      notes: p.notes || "",
      carePlanNotes: p.carePlanNotes || "",
    })
    setFormOpen(true)
  }

  const save = async () => {
    if (!form.problemText.trim()) {
      toast({ title: "Problem description is required", variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        problemText: form.problemText.trim(),
        icd10Code: form.icd10Code.trim() || null,
        snomedCode: form.snomedCode.trim() || null,
        snomedDisplay: form.snomedDisplay.trim() || null,
        status: form.status,
        onsetDate: form.onsetDate || null,
        notes: form.notes.trim() || null,
        carePlanNotes: form.carePlanNotes.trim() || null,
      }
      if (!editing && medicalRecordId) body.medicalRecordId = medicalRecordId
      if (editing) {
        await patientApi.updateProblem(patientId, String(editing.problemId), body)
        toast({ title: "Problem updated" })
      } else {
        await patientApi.createProblem(patientId, body)
        toast({ title: "Problem added" })
      }
      setFormOpen(false)
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const previewFhirSummary = async () => {
    try {
      setFhirLoading(true)
      const bundle = await integrationsApi.getFhirComposition(patientId)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast({ title: "FHIR clinical summary opened", description: "Composition bundle (JSON preview)" })
    } catch (err: any) {
      toast({ title: "FHIR preview failed", description: err.message, variant: "destructive" })
    } finally {
      setFhirLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge>Active</Badge>
    if (status === "resolved") return <Badge variant="secondary">Resolved</Badge>
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Problem list
          </CardTitle>
          <CardDescription>
            Structured problems (ICD-10 + optional SNOMED) for the clinical summary and problem list
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void previewFhirSummary()} disabled={fhirLoading}>
            {fhirLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            FHIR summary
          </Button>
          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add problem
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch id="show-resolved" checked={includeResolved} onCheckedChange={setIncludeResolved} />
          <Label htmlFor="show-resolved" className="text-sm font-normal">
            Show resolved / inactive
          </Label>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : problems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems recorded. Add diagnoses as structured problems for CDS and HIE summary.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>ICD-10</TableHead>
                  <TableHead>SNOMED</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Encounter</TableHead>
                  <TableHead>Onset</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.map((p) => (
                  <TableRow key={p.problemId}>
                    <TableCell className="font-medium">{p.problemText}</TableCell>
                    <TableCell className="text-muted-foreground">{p.icd10Code || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.snomedCode ? (
                        <span title={p.snomedDisplay || undefined}>{p.snomedCode}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.medicalRecordId ? `#${p.medicalRecordId}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.onsetDate ? String(p.onsetDate).slice(0, 10) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Update problem" : "Add problem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Problem description *</Label>
              <Input
                value={form.problemText}
                onChange={(e) => setForm({ ...form, problemText: e.target.value })}
                placeholder="e.g. Type 2 diabetes mellitus"
              />
            </div>
            <div className="space-y-1">
              <Label>ICD-10 code</Label>
              <Input
                value={form.icd10Code}
                onChange={(e) => setForm({ ...form, icd10Code: e.target.value })}
                onBlur={() => void suggestSnomed(form.icd10Code)}
                placeholder="e.g. E11.9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>SNOMED CT code</Label>
                <Input
                  value={form.snomedCode}
                  onChange={(e) => setForm({ ...form, snomedCode: e.target.value })}
                  placeholder="Auto from ICD map"
                />
              </div>
              <div className="space-y-1">
                <Label>SNOMED display</Label>
                <Input
                  value={form.snomedDisplay}
                  onChange={(e) => setForm({ ...form, snomedDisplay: e.target.value })}
                  placeholder="Preferred term"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Onset date</Label>
              <Input
                type="date"
                value={form.onsetDate}
                onChange={(e) => setForm({ ...form, onsetDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Care plan</Label>
              <Textarea
                value={form.carePlanNotes}
                onChange={(e) => setForm({ ...form, carePlanNotes: e.target.value })}
                rows={3}
                placeholder="Goals, follow-up, referrals — included in FHIR clinical summary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
