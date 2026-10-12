"use client"

import { useEffect, useState } from "react"
import { laboratoryApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

type Mode = "reschedule" | "refer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  order: {
    orderId: number
    orderNumber?: string
    labId?: number | null
    sampleCollectionDate?: string | null
    expectedCompletionDate?: string | null
  } | null
  onDone?: () => void
}

function toInputDateTime(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LabOrderActionDialog({ open, onOpenChange, mode, order, onDone }: Props) {
  const [labs, setLabs] = useState<any[]>([])
  const [labId, setLabId] = useState<string>("")
  const [sampleCollectionDate, setSampleCollectionDate] = useState("")
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !order) return
    setReason("")
    setSampleCollectionDate(toInputDateTime(order.sampleCollectionDate))
    setExpectedCompletionDate(toInputDateTime(order.expectedCompletionDate))
    setLabId(order.labId ? String(order.labId) : "")
    if (mode === "refer") {
      laboratoryApi
        .getLaboratories(undefined, undefined, "true")
        .then((rows) => setLabs(rows || []))
        .catch(() => setLabs([]))
    }
  }, [open, order, mode])

  const handleSave = async () => {
    if (!order) return
    try {
      setSaving(true)
      if (mode === "reschedule") {
        if (!sampleCollectionDate && !expectedCompletionDate) {
          toast({
            title: "Date required",
            description: "Set a sample collection or expected completion date.",
            variant: "destructive",
          })
          return
        }
        await laboratoryApi.rescheduleOrder(String(order.orderId), {
          sampleCollectionDate: sampleCollectionDate || undefined,
          expectedCompletionDate: expectedCompletionDate || undefined,
          reason: reason || undefined,
        })
        toast({ title: "Test rescheduled", description: order.orderNumber })
      } else {
        if (!labId) {
          toast({ title: "Select a laboratory", variant: "destructive" })
          return
        }
        if (order.labId && String(order.labId) === labId) {
          toast({
            title: "Same laboratory",
            description: "Choose a different lab to refer this order.",
            variant: "destructive",
          })
          return
        }
        await laboratoryApi.referOrder(String(order.orderId), {
          labId: Number(labId),
          reason: reason || undefined,
        })
        toast({ title: "Order referred", description: order.orderNumber })
      }
      onOpenChange(false)
      onDone?.()
    } catch (err: any) {
      toast({
        title: mode === "reschedule" ? "Reschedule failed" : "Referral failed",
        description: err?.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "reschedule" ? "Reschedule lab test" : "Refer to another lab"}</DialogTitle>
          <DialogDescription>
            Order {order?.orderNumber || ""}. Changes are logged on the order notes for audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "reschedule" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="sample-date">Sample collection</Label>
                <Input
                  id="sample-date"
                  type="datetime-local"
                  value={sampleCollectionDate}
                  onChange={(e) => setSampleCollectionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-date">Expected completion</Label>
                <Input
                  id="expected-date"
                  type="datetime-local"
                  value={expectedCompletionDate}
                  onChange={(e) => setExpectedCompletionDate(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Destination laboratory</Label>
              <Select value={labId} onValueChange={setLabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lab" />
                </SelectTrigger>
                <SelectContent>
                  {labs.map((lab) => (
                    <SelectItem key={lab.labId} value={String(lab.labId)}>
                      {lab.labName}
                      {lab.branchName ? ` (${lab.branchName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lab-action-reason">Reason (optional)</Label>
            <Textarea
              id="lab-action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === "reschedule" ? "e.g. Patient deferred, reagent delay…" : "e.g. Analyzer down, specialty panel…"}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "reschedule" ? "Save schedule" : "Refer order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
