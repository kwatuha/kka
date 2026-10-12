"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type ServicePoint, type QueueStatus, getServicePointName, getQueueStatusColor } from "@/lib/data/queue-data"
import { Badge } from "@/components/ui/badge"

interface ManageQueueStatusProps {
  patientId: string
  patientName: string
  currentServicePoint?: ServicePoint
  currentStatus?: QueueStatus
  onStatusChange?: (newStatus: QueueStatus) => void
  onServicePointChange?: (newServicePoint: ServicePoint) => void
}

export function ManageQueueStatus({
  patientId,
  patientName,
  currentServicePoint = "triage",
  currentStatus = "waiting",
  onStatusChange,
  onServicePointChange,
}: ManageQueueStatusProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<QueueStatus>(currentStatus)
  const [servicePoint, setServicePoint] = useState<ServicePoint>(currentServicePoint)
  const [notes, setNotes] = useState("")

  const handleSubmit = () => {
    if (onStatusChange && status !== currentStatus) {
      onStatusChange(status)
    }

    if (onServicePointChange && servicePoint !== currentServicePoint) {
      onServicePointChange(servicePoint)
    }

    setOpen(false)
  }

  const servicePoints: ServicePoint[] = [
    "registration",
    "triage",
    "consultation",
    "laboratory",
    "radiology",
    "pharmacy",
    "billing",
  ]

  const queueStatuses: QueueStatus[] = ["waiting", "in-service", "completed", "no-show", "rescheduled"]

  const statusLabels = {
    waiting: "Waiting",
    "in-service": "In Service",
    completed: "Completed",
    "no-show": "No Show",
    rescheduled: "Rescheduled",
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Queue Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Queue Status</DialogTitle>
          <DialogDescription>Update the queue status for {patientName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Patient:</span>
            <span className="col-span-3">{patientName}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Current Status:</span>
            <div className="col-span-3">
              <Badge className={getQueueStatusColor(currentStatus)}>{statusLabels[currentStatus]}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">Service Point:</span>
            <div className="col-span-3">
              <Select value={servicePoint} onValueChange={(value) => setServicePoint(value as ServicePoint)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service point" />
                </SelectTrigger>
                <SelectContent>
                  {servicePoints.map((point) => (
                    <SelectItem key={point} value={point}>
                      {getServicePointName(point)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-sm font-medium">New Status:</span>
            <div className="col-span-3">
              <Select value={status} onValueChange={(value) => setStatus(value as QueueStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {queueStatuses.map((qStatus) => (
                    <SelectItem key={qStatus} value={qStatus}>
                      {statusLabels[qStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <span className="text-sm font-medium">Notes:</span>
            <Textarea
              className="col-span-3"
              placeholder="Add notes about this status change"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit}>
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
