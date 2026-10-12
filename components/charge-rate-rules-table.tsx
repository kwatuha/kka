"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { insuranceApi, serviceChargeApi, inpatientApi } from "@/lib/api"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

function money(v: number | null | undefined) {
  if (v == null) return "—"
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(v)
}

export function ChargeRateRulesTable() {
  const [rows, setRows] = useState<any[]>([])
  const [charges, setCharges] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [wards, setWards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [payerTypeFilter, setPayerTypeFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [chargeFilter, setChargeFilter] = useState<string>("all")
  const [wardFilter, setWardFilter] = useState<string>("all")
  const [showCurrentOnly, setShowCurrentOnly] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [formPayerType, setFormPayerType] = useState<"cash" | "insurance">("cash")
  const [formChargeId, setFormChargeId] = useState("")
  const [formProviderId, setFormProviderId] = useState("")
  const [formWardId, setFormWardId] = useState("")
  const [formWardType, setFormWardType] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formPriority, setFormPriority] = useState("100")
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [formEndDate, setFormEndDate] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const loadRows = async () => {
    try {
      setLoading(true)
      const data = await insuranceApi.getChargeRateRules({
        payerType: payerTypeFilter !== "all" ? payerTypeFilter : undefined,
        providerId: providerFilter !== "all" ? providerFilter : undefined,
        chargeId: chargeFilter !== "all" ? chargeFilter : undefined,
        wardId: wardFilter !== "all" ? wardFilter : undefined,
        asOf: showCurrentOnly ? new Date().toISOString().slice(0, 10) : undefined,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to load charge rate rules", variant: "destructive" })
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [payerTypeFilter, providerFilter, chargeFilter, wardFilter, showCurrentOnly])

  useEffect(() => {
    serviceChargeApi.getAll("Active").then((d) => setCharges(Array.isArray(d) ? d : [])).catch(() => setCharges([]))
    insuranceApi.getProviders("active").then((d) => setProviders(Array.isArray(d) ? d : [])).catch(() => setProviders([]))
    inpatientApi.getWards().then((d) => setWards(Array.isArray(d) ? d : [])).catch(() => setWards([]))
  }, [])

  const resetForm = () => {
    setFormPayerType("cash")
    setFormChargeId("")
    setFormProviderId("")
    setFormWardId("")
    setFormWardType("")
    setFormAmount("")
    setFormPriority("100")
    setFormStartDate(new Date().toISOString().slice(0, 10))
    setFormEndDate("")
    setFormNotes("")
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (row: any) => {
    setEditing(row)
    setFormPayerType(row.payerType === "insurance" ? "insurance" : "cash")
    setFormChargeId(String(row.chargeId))
    setFormProviderId(row.providerId ? String(row.providerId) : "")
    setFormWardId(row.wardId ? String(row.wardId) : "")
    setFormWardType(row.wardType || "")
    setFormAmount(String(row.amount ?? ""))
    setFormPriority(String(row.priority ?? 100))
    setFormStartDate((row.startDate || "").slice(0, 10))
    setFormEndDate(row.endDate ? String(row.endDate).slice(0, 10) : "")
    setFormNotes(row.notes || "")
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!formChargeId || !formAmount || !formStartDate) {
      toast({ title: "Validation", description: "Charge, amount and start date are required.", variant: "destructive" })
      return
    }
    if (formPayerType === "insurance" && !formProviderId) {
      toast({ title: "Validation", description: "Provider is required for insurance payer type.", variant: "destructive" })
      return
    }
    try {
      setSaving(true)
      const payload = {
        payerType: formPayerType,
        chargeId: parseInt(formChargeId, 10),
        providerId: formPayerType === "insurance" ? parseInt(formProviderId, 10) : null,
        wardId: formWardId ? parseInt(formWardId, 10) : null,
        wardType: formWardType || null,
        amount: parseFloat(formAmount),
        priority: parseInt(formPriority || "100", 10),
        startDate: formStartDate,
        endDate: formEndDate || null,
        notes: formNotes || null,
      }
      if (editing) {
        await insuranceApi.updateChargeRateRule(String(editing.ruleId), payload)
        toast({ title: "Success", description: "Charge rate rule updated." })
      } else {
        await insuranceApi.createChargeRateRule(payload)
        toast({ title: "Success", description: "Charge rate rule created." })
      }
      setFormOpen(false)
      loadRows()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to save rule", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      setDeleteLoading(true)
      await insuranceApi.deleteChargeRateRule(String(deleting.ruleId))
      toast({ title: "Success", description: "Charge rate rule deleted." })
      setDeleteOpen(false)
      setDeleting(null)
      loadRows()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Failed to delete rule", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          value={payerTypeFilter}
          onValueChange={setPayerTypeFilter}
          options={[
            { value: "all", label: "All payer types" },
            { value: "cash", label: "Cash" },
            { value: "insurance", label: "Insurance" },
          ]}
          triggerClassName="w-[160px]"
        />
        <SearchableSelect
          value={providerFilter}
          onValueChange={setProviderFilter}
          options={[{ value: "all", label: "All providers" }, ...providers.map((p: any) => ({ value: String(p.providerId), label: p.providerName }))]}
          triggerClassName="w-[200px]"
        />
        <SearchableSelect
          value={chargeFilter}
          onValueChange={setChargeFilter}
          options={[{ value: "all", label: "All charges" }, ...charges.map((c: any) => ({ value: String(c.chargeId), label: `${c.name} (${c.chargeCode || c.chargeId})` }))]}
          triggerClassName="w-[220px]"
        />
        <SearchableSelect
          value={wardFilter}
          onValueChange={setWardFilter}
          options={[{ value: "all", label: "All wards" }, ...wards.map((w: any) => ({ value: String(w.wardId), label: w.wardName }))]}
          triggerClassName="w-[170px]"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showCurrentOnly} onChange={(e) => setShowCurrentOnly(e.target.checked)} />
          Current only
        </label>
        <Button variant="outline" size="sm" onClick={loadRows}>Refresh</Button>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add rule</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payer</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Charge</TableHead>
              <TableHead>Ward Scope</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No centralized charge-rate rules found.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.ruleId}>
                <TableCell><Badge variant={r.payerType === "insurance" ? "default" : "secondary"}>{r.payerType}</Badge></TableCell>
                <TableCell>{r.providerName || "—"}</TableCell>
                <TableCell>{r.chargeName || r.chargeCode || r.chargeId}</TableCell>
                <TableCell>{r.wardName || (r.wardType ? `Type: ${r.wardType}` : "Default")}</TableCell>
                <TableCell className="text-right font-medium">{money(r.amount)}</TableCell>
                <TableCell>{r.priority ?? 0}</TableCell>
                <TableCell>{String(r.startDate || "").slice(0, 10)}</TableCell>
                <TableCell>{r.endDate ? String(r.endDate).slice(0, 10) : <Badge variant="outline">Active</Badge>}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(r); setDeleteOpen(true) }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit charge-rate rule" : "Add charge-rate rule"}</DialogTitle>
            <DialogDescription>One central rule table for insurance and cash pricing. Ward-specific rules take priority over general rules.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Payer type</Label>
                <SearchableSelect
                  value={formPayerType}
                  onValueChange={(v) => setFormPayerType(v === "insurance" ? "insurance" : "cash")}
                  options={[{ value: "cash", label: "Cash" }, { value: "insurance", label: "Insurance" }]}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Input type="number" value={formPriority} onChange={(e) => setFormPriority(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Charge</Label>
              <SearchableSelect value={formChargeId} onValueChange={setFormChargeId} options={charges.map((c: any) => ({ value: String(c.chargeId), label: `${c.name} (${c.chargeCode || c.chargeId})` }))} />
            </div>
            {formPayerType === "insurance" && (
              <div>
                <Label>Insurance provider</Label>
                <SearchableSelect value={formProviderId} onValueChange={setFormProviderId} options={providers.map((p: any) => ({ value: String(p.providerId), label: p.providerName }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Ward (optional)</Label>
                <SearchableSelect
                  value={formWardId || "none"}
                  onValueChange={(v) => setFormWardId(v === "none" ? "" : v)}
                  options={[{ value: "none", label: "Default (all wards)" }, ...wards.map((w: any) => ({ value: String(w.wardId), label: w.wardName }))]
                  }
                />
              </div>
              <div>
                <Label>Ward type (optional)</Label>
                <Input value={formWardType} onChange={(e) => setFormWardType(e.target.value)} placeholder="e.g. Private" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" min={0} step={0.01} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
              <div>
                <Label>Start date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>End date (optional)</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
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
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>This removes the selected centralized charge-rate rule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

