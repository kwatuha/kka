"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Plus, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { insuranceApi, serviceChargeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount)
}

export function InsuranceChargeRatesTable() {
  const [rates, setRates] = useState<any[]>([])
  const [charges, setCharges] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [chargeFilter, setChargeFilter] = useState<string>("all")
  const [showCurrentOnly, setShowCurrentOnly] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [formChargeId, setFormChargeId] = useState("")
  const [formProviderId, setFormProviderId] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formEndDate, setFormEndDate] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const loadRates = async () => {
    try {
      setLoading(true)
      const providerId = providerFilter && providerFilter !== "all" ? providerFilter : undefined
      const chargeId = chargeFilter && chargeFilter !== "all" ? chargeFilter : undefined
      const asOf = showCurrentOnly ? new Date().toISOString().slice(0, 10) : undefined
      const data = await insuranceApi.getChargeRateRules({
        payerType: "insurance",
        providerId,
        chargeId,
        asOf,
      })
      setRates(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to load rates", variant: "destructive" })
      setRates([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
  }, [providerFilter, chargeFilter, showCurrentOnly])

  useEffect(() => {
    serviceChargeApi.getAll("Active").then((d) => setCharges(Array.isArray(d) ? d : [])).catch(() => setCharges([]))
    insuranceApi.getProviders("active").then((d) => setProviders(Array.isArray(d) ? d : [])).catch(() => setProviders([]))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setFormChargeId("")
    setFormProviderId("")
    setFormAmount("")
    setFormStartDate(new Date().toISOString().slice(0, 10))
    setFormEndDate("")
    setFormNotes("")
    setFormOpen(true)
  }

  const openEdit = (row: any) => {
    setEditing(row)
    setFormChargeId(String(row.chargeId))
    setFormProviderId(String(row.providerId))
    setFormAmount(String(row.amount))
    setFormStartDate((row.startDate || "").slice(0, 10))
    setFormEndDate(row.endDate ? (row.endDate + "").slice(0, 10) : "")
    setFormNotes(row.notes ?? "")
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formChargeId || !formProviderId || !formAmount || !formStartDate) {
      toast({ title: "Validation", description: "Charge, provider, amount and start date are required.", variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      const payload = {
        chargeId: parseInt(formChargeId, 10),
        providerId: parseInt(formProviderId, 10),
        payerType: "insurance",
        amount: parseFloat(formAmount),
        priority: 100,
        startDate: formStartDate,
        endDate: formEndDate || null,
        notes: formNotes || null,
      }
      if (editing) {
        await insuranceApi.updateChargeRateRule(editing.ruleId.toString(), {
          amount: payload.amount,
          startDate: payload.startDate,
          endDate: payload.endDate,
          notes: payload.notes,
          providerId: payload.providerId,
        })
        toast({ title: "Success", description: "Rate updated." })
      } else {
        await insuranceApi.createChargeRateRule(payload)
        toast({ title: "Success", description: "Rate created." })
      }
      setFormOpen(false)
      loadRates()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      setDeleteLoading(true)
      await insuranceApi.deleteChargeRateRule(deleting.ruleId.toString())
      toast({ title: "Success", description: "Rate deleted." })
      setDeleteOpen(false)
      setDeleting(null)
      loadRates()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Delete failed", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          value={providerFilter}
          onValueChange={setProviderFilter}
          options={[
            { value: "all", label: "All providers" },
            ...providers.map((p) => ({ value: String(p.providerId), label: p.providerName || String(p.providerId) })),
          ]}
          placeholder="Provider"
          triggerClassName="w-[180px]"
        />
        <SearchableSelect
          value={chargeFilter}
          onValueChange={setChargeFilter}
          options={[
            { value: "all", label: "All charges" },
            ...charges.map((c) => ({ value: String(c.chargeId), label: `${c.name} (${c.chargeCode || c.chargeId})` })),
          ]}
          placeholder="Charge"
          triggerClassName="w-[200px]"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showCurrentOnly} onChange={(e) => setShowCurrentOnly(e.target.checked)} />
          Current only
        </label>
        <Button variant="outline" size="sm" onClick={loadRates}>Refresh</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add rate</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Charge</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No rates found. Add insurer-specific rates per charge (track over time with start/end dates).</TableCell>
              </TableRow>
            ) : (
              rates.map((r) => (
                <TableRow key={r.ruleId}>
                  <TableCell>{r.providerName ?? "—"}</TableCell>
                  <TableCell>{r.chargeName ?? r.chargeCode ?? r.chargeId}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                  <TableCell>{(r.startDate || "").slice(0, 10)}</TableCell>
                  <TableCell>{r.endDate ? (r.endDate + "").slice(0, 10) : <Badge variant="secondary">Active</Badge>}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(r); setDeleteOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rate" : "Add insurer rate"}</DialogTitle>
            <DialogDescription>Rate this insurer pays for the charge; use start/end dates to track changes over time.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Charge</Label>
              <SearchableSelect
                value={formChargeId}
                onValueChange={setFormChargeId}
                options={charges.map((c) => ({ value: String(c.chargeId), label: `${c.name} (${c.chargeCode || c.chargeId})` }))}
                placeholder="Select charge"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Insurance provider</Label>
              <SearchableSelect
                value={formProviderId}
                onValueChange={setFormProviderId}
                options={providers.map((p) => ({ value: String(p.providerId), label: p.providerName || String(p.providerId) }))}
                placeholder="Select provider"
                disabled={!!editing}
              />
            </div>
            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" min={0} step={0.01} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End date (optional)</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} placeholder="Active" />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="e.g. Contract 2024" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the rate record. Historical billing is not affected.
              {deleting && <div className="mt-2 p-2 bg-muted rounded text-sm">{deleting.chargeName} – {deleting.providerName}: {formatCurrency(deleting.amount)}</div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground">{deleteLoading ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
