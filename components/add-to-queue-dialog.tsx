"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Stethoscope, Video } from "lucide-react"

/** Service points supported by this dialog (queue API). */
export type QueueServicePointChoice = "triage" | "telemedicine"

const QUEUE_LABELS: Record<QueueServicePointChoice, string> = {
  triage: "Triage",
  telemedicine: "Telemedicine",
}

type AddToQueueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName: string
  patientNumber?: string
  /** Called with selected queue; parent performs API call. */
  onConfirm: (servicePoint: QueueServicePointChoice) => Promise<void>
  loading?: boolean
}

export function AddToQueueDialog({
  open,
  onOpenChange,
  patientName,
  patientNumber,
  onConfirm,
  loading = false,
}: AddToQueueDialogProps) {
  const [servicePoint, setServicePoint] = useState<QueueServicePointChoice>("triage")

  useEffect(() => {
    if (open) {
      setServicePoint("triage")
    }
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to queue</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Choose where to queue{" "}
              <span className="font-medium text-foreground">{patientName}</span>
              {patientNumber ? (
                <span className="text-foreground"> ({patientNumber})</span>
              ) : null}
              .
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label className="text-sm text-muted-foreground">Queue type</Label>
          <RadioGroup
            value={servicePoint}
            onValueChange={(v) => setServicePoint(v as QueueServicePointChoice)}
            className="grid gap-3"
            disabled={loading}
          >
            <label
              htmlFor="queue-triage"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <RadioGroupItem value="triage" id="queue-triage" className="mt-0.5" />
              <div className="flex flex-1 gap-2">
                <Stethoscope className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{QUEUE_LABELS.triage}</div>
                  <p className="text-xs text-muted-foreground">
                    In-person triage queue (default).
                  </p>
                </div>
              </div>
            </label>
            <label
              htmlFor="queue-telemedicine"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <RadioGroupItem value="telemedicine" id="queue-telemedicine" className="mt-0.5" />
              <div className="flex flex-1 gap-2">
                <Video className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{QUEUE_LABELS.telemedicine}</div>
                  <p className="text-xs text-muted-foreground">
                    Remote consultation / telemedicine queue.
                  </p>
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={async () => {
              await onConfirm(servicePoint)
            }}
          >
            {loading ? "Adding…" : `Add to ${QUEUE_LABELS[servicePoint]} queue`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function queueTypeLabel(servicePoint: QueueServicePointChoice): string {
  return QUEUE_LABELS[servicePoint] ?? servicePoint
}
