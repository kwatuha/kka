"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { queueApi, proceduresApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import type { QueueEntryLite } from "@/components/queue-radiology-report-dialog"

function parsePatientProcedureIdFromNotes(notes?: string) {
  const m = notes?.match(/PatientProcedure\s+(\d+)/i)
  return m?.[1] ? parseInt(m[1], 10) : null
}

export function ProcedureQueueCompleteDialog({
  queueEntry,
  onClose,
  onSuccess,
}: {
  queueEntry: QueueEntryLite | null
  onClose: () => void
  onSuccess?: () => void
}) {
  const open = !!queueEntry
  const [manualPpId, setManualPpId] = useState("")
  const [procOutcome, setProcOutcome] = useState("")
  const [procComplications, setProcComplications] = useState("")
  const [procSaving, setProcSaving] = useState(false)

  useEffect(() => {
    if (!queueEntry) {
      setManualPpId("")
      setProcOutcome("")
      setProcComplications("")
      return
    }
    const ppId = parsePatientProcedureIdFromNotes(queueEntry.notes)
    setManualPpId(ppId ? String(ppId) : "")
    setProcOutcome("")
    setProcComplications("")
  }, [queueEntry])

  const effectivePpId = (() => {
    const t = manualPpId.trim()
    if (!t) return null
    const n = parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  const submit = async () => {
    if (!effectivePpId) {
      toast({
        title: "Patient procedure required",
        description: "Enter the Patient procedure ID (from queue notes or patient chart).",
        variant: "destructive",
      })
      return
    }
    if (!procOutcome.trim()) {
      toast({ title: "Outcome required", description: "Enter the procedure outcome.", variant: "destructive" })
      return
    }
    if (!queueEntry) return
    setProcSaving(true)
    try {
      await proceduresApi.updatePatientProcedure(String(effectivePpId), {
        procedureOutcome: procOutcome,
        complications: procComplications || undefined,
      })
      await queueApi.updateStatus(queueEntry.queueId.toString(), "completed")
      toast({ title: "Saved", description: "Procedure outcome recorded; queue completed." })
      onClose()
      onSuccess?.()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" })
    } finally {
      setProcSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete & outcome</DialogTitle>
          <DialogDescription>
            {queueEntry?.patientName} — save procedure outcome and mark this queue entry completed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Patient procedure ID</Label>
            <Input
              value={manualPpId}
              onChange={(e) => setManualPpId(e.target.value)}
              placeholder="e.g. 42 (from billing queue notes: PatientProcedure 42)"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Pre-filled when notes contain <code className="text-xs">PatientProcedure</code>. You can edit if needed.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Outcome *</Label>
            <Textarea
              value={procOutcome}
              onChange={(e) => setProcOutcome(e.target.value)}
              className="min-h-[100px] text-sm"
              placeholder="Summary of procedure result, patient status, key observations…"
            />
          </div>
          <div className="space-y-1">
            <Label>Complications (optional)</Label>
            <Textarea
              value={procComplications}
              onChange={(e) => setProcComplications(e.target.value)}
              className="min-h-[56px] text-sm"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={procSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={procSaving || !effectivePpId}>
              {procSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & complete queue"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
