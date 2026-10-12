"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { radiologyApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "@/components/ui/use-toast"

export type QueueEntryLite = {
  queueId: number
  patientId: string | number
  patientName: string
  notes?: string
}

function parseRadiologyOrderNumber(notes?: string) {
  const m = notes?.match(/Radiology Order:\s*([A-Z0-9-]+)/i)
  return m?.[1] ?? null
}

export function RadiologyQueueReportDialog({
  queueEntry,
  onClose,
  onSuccess,
}: {
  queueEntry: QueueEntryLite | null
  onClose: () => void
  onSuccess?: () => void
}) {
  const open = !!queueEntry
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const { user } = useAuth()
  const [radiologyOrder, setRadiologyOrder] = useState<any>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [radFindings, setRadFindings] = useState("")
  const [radImpression, setRadImpression] = useState("")
  const [radRecommendations, setRadRecommendations] = useState("")
  const [radSaving, setRadSaving] = useState(false)

  useEffect(() => {
    if (!queueEntry) {
      setRadiologyOrder(null)
      setRadFindings("")
      setRadImpression("")
      setRadRecommendations("")
      return
    }

    const pid = String(queueEntry.patientId)
    setRadFindings("")
    setRadImpression("")
    setRadRecommendations("")
    setRadiologyOrder(null)
    setOrderLoading(true)

    ;(async () => {
      try {
        const ordNum = parseRadiologyOrderNumber(queueEntry.notes)
        const list = await radiologyApi.getOrders(pid, undefined, 1, 100)
        let order = ordNum ? list.find((o: any) => o.orderNumber === ordNum) : null
        if (!order) {
          order = list.find((o: any) =>
            ["pending", "scheduled", "in_progress", "awaiting_payment"].includes(o.status)
          )
        }
        if (!order) {
          toast({
            title: "No radiology order found",
            description: "Could not match an order for this patient. Use Radiology → Examination Requests.",
            variant: "destructive",
          })
          onCloseRef.current()
          return
        }
        if (order.status === "awaiting_payment") {
          toast({
            title: "Awaiting payment",
            description: "This order is not paid yet. Patient must pay at cashier before imaging/report.",
            variant: "destructive",
          })
          onCloseRef.current()
          return
        }
        setRadiologyOrder(order)
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Failed to load order", variant: "destructive" })
        onCloseRef.current()
      } finally {
        setOrderLoading(false)
      }
    })()
  }, [queueEntry])

  const submit = async () => {
    if (!radiologyOrder || !queueEntry) return
    if (!radFindings.trim() && !radImpression.trim() && !radRecommendations.trim()) {
      toast({
        title: "Enter report content",
        description: "Add at least findings, impression, or recommendations.",
        variant: "destructive",
      })
      return
    }
    const uid = user?.id ? parseInt(String(user.id), 10) : NaN
    if (!user?.id || Number.isNaN(uid)) {
      toast({ title: "Sign in required", description: "Could not determine user for report signature.", variant: "destructive" })
      return
    }
    setRadSaving(true)
    try {
      await radiologyApi.completeOrderReport(radiologyOrder.orderId.toString(), {
        findings: radFindings || undefined,
        impression: radImpression || undefined,
        recommendations: radRecommendations || undefined,
        reportedBy: uid,
        queueId: queueEntry.queueId,
      })
      toast({ title: "Report saved", description: "Radiology report stored and order marked completed." })
      onClose()
      onSuccess?.()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save report", variant: "destructive" })
    } finally {
      setRadSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Radiology report</DialogTitle>
          <DialogDescription>
            {queueEntry?.patientName} — stored report completes the imaging order.
          </DialogDescription>
        </DialogHeader>
        {orderLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order…
          </div>
        ) : radiologyOrder ? (
          <div className="space-y-3">
            <div className="text-sm rounded-md border p-3 bg-muted/40">
              <div className="font-mono font-semibold">{radiologyOrder.orderNumber}</div>
              <div className="text-muted-foreground">
                {radiologyOrder.examName || "Exam"} {radiologyOrder.examCode ? `(${radiologyOrder.examCode})` : ""}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Findings</Label>
              <Textarea
                value={radFindings}
                onChange={(e) => setRadFindings(e.target.value)}
                className="min-h-[72px] text-sm"
                placeholder="Examination findings…"
              />
            </div>
            <div className="space-y-1">
              <Label>Impression</Label>
              <Textarea
                value={radImpression}
                onChange={(e) => setRadImpression(e.target.value)}
                className="min-h-[64px] text-sm"
                placeholder="Radiologist impression…"
              />
            </div>
            <div className="space-y-1">
              <Label>Recommendations</Label>
              <Textarea
                value={radRecommendations}
                onChange={(e) => setRadRecommendations(e.target.value)}
                className="min-h-[56px] text-sm"
                placeholder="Optional follow-up…"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={radSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={submit} disabled={radSaving}>
                {radSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save report & complete"}
              </Button>
            </DialogFooter>
          </div>
        ) : queueEntry ? (
          <p className="text-sm text-muted-foreground">No order loaded.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
