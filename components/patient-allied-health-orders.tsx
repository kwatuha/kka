"use client"

import { useEffect, useState, FormEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Loader2, Plus } from "lucide-react"
import { alliedHealthOrdersApi } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ORDER_TYPES = [
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "nutrition", label: "Nutrition" },
  { value: "social_work", label: "Social work" },
  { value: "counselling", label: "Counselling" },
] as const

type OrderRow = {
  orderId: number
  orderType: string
  status: string
  orderDate: string
  priority: string
  clinicalIndication?: string | null
  notes?: string | null
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default"
  if (status === "cancelled") return "destructive"
  if (status === "in_progress") return "secondary"
  return "outline"
}

export function PatientAlliedHealthOrders({
  patientId,
  embedded = false,
}: {
  patientId: string
  embedded?: boolean
}) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    orderType: "physiotherapy",
    orderDate: new Date().toISOString().slice(0, 10),
    priority: "routine",
    clinicalIndication: "",
    notes: "",
  })

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const rows = await alliedHealthOrdersApi.list(patientId)
      setOrders(Array.isArray(rows) ? rows : [])
    } catch (err: any) {
      setError(err.message || "Failed to load allied health orders")
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
      await alliedHealthOrdersApi.create({
        patientId: Number(patientId),
        orderType: form.orderType,
        orderDate: form.orderDate,
        priority: form.priority,
        clinicalIndication: form.clinicalIndication || null,
        notes: form.notes || null,
      })
      setOpen(false)
      await load()
    } catch (err: any) {
      setError(err.message || "Could not place order")
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (orderId: number, status: string) => {
    try {
      await alliedHealthOrdersApi.update(orderId, { status })
      await load()
    } catch (err: any) {
      setError(err.message || "Update failed")
    }
  }

  const header = (
    <div className="flex flex-row items-start justify-between gap-2">
      <div>
        {embedded ? (
          <p className="text-sm font-medium">Allied health orders (CPOE)</p>
        ) : (
          <>
            <CardTitle>Allied health orders (CPOE)</CardTitle>
            <CardDescription>
              Physiotherapy, nutrition, social work, and counselling — structured orders for the patient chart.
            </CardDescription>
          </>
        )}
        {embedded ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            Physiotherapy, nutrition, social work, and counselling
          </p>
        ) : null}
      </div>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New order
      </Button>
    </div>
  )

  const body = (
    <>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allied health orders yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Indication</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.orderId}>
                    <TableCell>{o.orderDate}</TableCell>
                    <TableCell className="capitalize">{o.orderType.replace(/_/g, " ")}</TableCell>
                    <TableCell>{o.priority}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status)}>{o.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {o.clinicalIndication || "—"}
                    </TableCell>
                    <TableCell>
                      {o.status === "ordered" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mr-1"
                          onClick={() => void setStatus(o.orderId, "in_progress")}
                        >
                          Start
                        </Button>
                      ) : null}
                      {o.status === "in_progress" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void setStatus(o.orderId, "completed")}
                        >
                          Complete
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
    </>
  )

  return (
    <>
      {embedded ? (
        <div className="space-y-3">
          {header}
          {body}
        </div>
      ) : (
        <Card>
          <CardHeader>{header}</CardHeader>
          <CardContent>{body}</CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allied health order</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Service type</Label>
              <Select
                value={form.orderType}
                onValueChange={(v) => setForm({ ...form, orderType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Order date</Label>
                <Input
                  type="date"
                  required
                  value={form.orderDate}
                  onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Clinical indication</Label>
              <Textarea
                rows={2}
                value={form.clinicalIndication}
                onChange={(e) => setForm({ ...form, clinicalIndication: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Place order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
