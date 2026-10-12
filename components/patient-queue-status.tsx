"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users } from "lucide-react"
import {
  getPatientQueueStatus,
  getServicePointName,
  calculateWaitTime,
  getPriorityColor,
  type QueueStatus,
  type ServicePoint,
} from "@/lib/data/queue-data"
import { ManageQueueStatus } from "@/components/manage-queue-status"

interface PatientQueueStatusProps {
  patientId: string
}

export function PatientQueueStatus({ patientId }: PatientQueueStatusProps) {
  const queueEntry = getPatientQueueStatus(patientId)

  const handleStatusChange = (newStatus: QueueStatus) => {
    // In a real application, this would update the queue status
    console.log(`Updating status for ${patientId} to ${newStatus}`)
  }

  const handleServicePointChange = (newServicePoint: ServicePoint) => {
    // In a real application, this would transfer the patient to a new service point
    console.log(`Transferring ${patientId} to ${newServicePoint}`)
  }

  if (!queueEntry) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Queue Status</CardTitle>
          <CardDescription>Patient is not currently in any queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-center text-muted-foreground">This patient is not currently in any queue.</p>
            <Button variant="outline" size="sm" className="mt-4">
              Add to Queue
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Queue Status</CardTitle>
        <CardDescription>Current position in hospital queue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{getServicePointName(queueEntry.servicePoint)}</p>
              <div className="flex items-center mt-1">
                <Badge variant={queueEntry.status === "waiting" ? "secondary" : "default"} className="mr-2">
                  {queueEntry.status === "waiting" ? "Waiting" : "In Service"}
                </Badge>
                <Badge variant="outline" className={`${getPriorityColor(queueEntry.priority)}`}>
                  {queueEntry.priority}
                </Badge>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">#{queueEntry.queueNumber}</div>
              <p className="text-xs text-muted-foreground">Queue Position</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-sm">Wait Time</span>
            </div>
            <div className="text-sm font-medium">
              {calculateWaitTime(queueEntry)} minutes
              {queueEntry.estimatedWaitTime && queueEntry.status === "waiting" && (
                <span className="text-xs text-muted-foreground ml-1">(Est. {queueEntry.estimatedWaitTime} min)</span>
              )}
            </div>
          </div>

          {queueEntry.assignedTo && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Assigned To</p>
              <p className="text-sm font-medium">{queueEntry.assignedTo}</p>
            </div>
          )}

          {queueEntry.notes && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{queueEntry.notes}</p>
            </div>
          )}

          <ManageQueueStatus
            patientId={patientId}
            patientName={queueEntry.patientName}
            currentServicePoint={queueEntry.servicePoint}
            currentStatus={queueEntry.status}
            onStatusChange={handleStatusChange}
            onServicePointChange={handleServicePointChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
