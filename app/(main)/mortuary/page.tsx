"use client"

import { useCallback, useEffect, useState } from "react"
import { Cross, Loader2, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { mortuaryApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function MortuaryPage() {
  const [loading, setLoading] = useState(true)
  const [cases, setCases] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    patientId: "",
    sourceType: "opd",
    deathAt: "",
    placeOfDeath: "",
    causeOfDeath: "",
    storageBay: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    policeCaseNumber: "",
    postmortemRequired: false,
    notes: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await mortuaryApi.listCases({
        status: statusFilter,
        search: search || undefined,
        limit: 100,
      })
      setCases(Array.isArray(rows) ? rows : [])
    } catch (err: any) {
      toast({
        title: "Could not load mortuary cases",
        description: err?.message || "Run migration 103 if tables are missing",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) {
      toast({ title: "Patient ID required", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await mortuaryApi.createCase({
        ...form,
        patientId: Number(form.patientId),
        deathAt: form.deathAt || undefined,
      })
      toast({ title: "Mortuary case opened" })
      setOpen(false)
      setForm({
        patientId: "",
        sourceType: "opd",
        deathAt: "",
        placeOfDeath: "",
        causeOfDeath: "",
        storageBay: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
        policeCaseNumber: "",
        postmortemRequired: false,
        notes: "",
      })
      await load()
    } catch (err: any) {
      toast({
        title: "Could not create case",
        description: err?.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function markReleased(caseId: number) {
    try {
      await mortuaryApi.updateCase(caseId, {
        status: "released",
        releasedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      })
      toast({ title: "Case marked released" })
      load()
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message, variant: "destructive" })
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced segments={[{ title: "Mortuary", href: "/mortuary" }]} className="mb-2" />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Cross className="h-7 w-7" />
            Mortuary
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Record body intake after death as a care outcome (OPD, IPD, emergency) or brought-in-dead.
            Track storage, next of kin, police/postmortem, and release.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New case
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cases</CardTitle>
          <CardDescription>Filter by status or search case / patient details.</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Input
              placeholder="Search…"
              className="max-w-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="in_storage">In storage</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="buried">Buried</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No mortuary cases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Deceased</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Bay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.caseId}>
                    <TableCell className="font-medium text-sm">
                      {c.caseNumber}
                      <div className="text-xs text-muted-foreground">
                        {c.deathAt ? String(c.deathAt).slice(0, 16) : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.firstName} {c.lastName}
                      <div className="text-xs text-muted-foreground">{c.patientNumber}</div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{String(c.sourceType).replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{c.storageBay || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {String(c.status).replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status !== "released" && c.status !== "buried" && (
                        <Button size="sm" variant="outline" onClick={() => markReleased(c.caseId)}>
                          Release
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Open mortuary case</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>Patient ID *</Label>
              <Input
                required
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                placeholder="Numeric patientId from chart"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select
                  value={form.sourceType}
                  onValueChange={(v) => setForm({ ...form, sourceType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opd">OPD / consultation</SelectItem>
                    <SelectItem value="ipd">Inpatient</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="brought_in_dead">Brought in dead</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Death date/time</Label>
                <Input
                  type="datetime-local"
                  value={form.deathAt}
                  onChange={(e) => setForm({ ...form, deathAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Place of death</Label>
              <Input
                value={form.placeOfDeath}
                onChange={(e) => setForm({ ...form, placeOfDeath: e.target.value })}
              />
            </div>
            <div>
              <Label>Cause of death</Label>
              <Textarea
                value={form.causeOfDeath}
                onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Storage bay</Label>
                <Input
                  value={form.storageBay}
                  onChange={(e) => setForm({ ...form, storageBay: e.target.value })}
                />
              </div>
              <div>
                <Label>Police case #</Label>
                <Input
                  value={form.policeCaseNumber}
                  onChange={(e) => setForm({ ...form, policeCaseNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Next of kin</Label>
                <Input
                  value={form.nextOfKinName}
                  onChange={(e) => setForm({ ...form, nextOfKinName: e.target.value })}
                />
              </div>
              <div>
                <Label>Kin phone</Label>
                <Input
                  value={form.nextOfKinPhone}
                  onChange={(e) => setForm({ ...form, nextOfKinPhone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create case
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
