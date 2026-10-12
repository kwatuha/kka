"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { PatientCombobox } from "@/components/patient-combobox"
import { queueApi, doctorsApi, triageApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useServicePoints } from "@/lib/hooks/use-service-points"

interface AddToQueueFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  queueEntry?: any
}

export function AddToQueueForm({ open, onOpenChange, onSuccess, queueEntry }: AddToQueueFormProps) {
  const [patientId, setPatientId] = useState<string>("")
  const [patientName, setPatientName] = useState<string>("")
  const [servicePoint, setServicePoint] = useState("consultation")
  const [priority, setPriority] = useState("normal")
  const [doctorId, setDoctorId] = useState<string>("")
  const [consultationRoomId, setConsultationRoomId] = useState<string>("")
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!queueEntry
  const { servicePoints: consultationRooms, loading: loadingRooms } = useServicePoints(
    servicePoint === "consultation" ? "consultation" : undefined
  )

  // Load doctors when form opens
  useEffect(() => {
    if (open) {
      loadDoctors()
    }
  }, [open])

  // Load latest triage record for patient when patient is selected and service point is consultation
  useEffect(() => {
    if (open && patientId && servicePoint === "consultation" && !isEditing) {
      loadLatestTriageRecord()
    }
  }, [open, patientId, servicePoint, isEditing])

  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true)
      const doctorsData = await doctorsApi.getAll()
      setDoctors(doctorsData)
    } catch (err) {
      console.error("Error loading doctors:", err)
    } finally {
      setLoadingDoctors(false)
    }
  }

  const loadLatestTriageRecord = async () => {
    if (!patientId) return
    
    try {
      // Fetch all triage records and filter for this patient's latest record
      const triageRecords = await triageApi.getAll()
      const patientTriageRecords = triageRecords
        .filter((triage: any) => triage.patientId?.toString() === patientId.toString())
        .sort((a: any, b: any) => {
          const dateA = new Date(a.triageDate || a.createdAt).getTime()
          const dateB = new Date(b.triageDate || b.createdAt).getTime()
          return dateB - dateA // Sort descending to get latest first
        })

      if (patientTriageRecords.length > 0) {
        const latestTriage = patientTriageRecords[0]
        // If the latest triage record has an assigned doctor, pre-populate it
        if (latestTriage.assignedToDoctorId && !doctorId) {
          setDoctorId(latestTriage.assignedToDoctorId.toString())
        }
        if (latestTriage.consultationServicePointId && !consultationRoomId) {
          setConsultationRoomId(String(latestTriage.consultationServicePointId))
        }
      }
    } catch (err) {
      // Silently fail - this is optional functionality
      console.error("Error loading triage record:", err)
    }
  }

  // Set form values when editing
  useEffect(() => {
    if (queueEntry && open) {
      setPatientId(queueEntry.patientId?.toString() || "")
      setPatientName(
        queueEntry.patientFirstName && queueEntry.patientLastName
          ? `${queueEntry.patientFirstName} ${queueEntry.patientLastName}`
          : ""
      )
      setServicePoint(queueEntry.servicePoint || "consultation")
      setPriority(queueEntry.priority || "normal")
      setDoctorId(queueEntry.doctorId?.toString() || "")
      setConsultationRoomId(queueEntry.servicePointId?.toString() || "")
      setEstimatedWaitTime(queueEntry.estimatedWaitTime?.toString() || "")
      setNotes(queueEntry.notes || "")
    } else if (!queueEntry && open) {
      // Reset form for new entry
      setPatientId("")
      setPatientName("")
      setServicePoint("consultation")
      setPriority("normal")
      setDoctorId("")
      setConsultationRoomId("")
      setEstimatedWaitTime("")
      setNotes("")
      setError(null)
    }
  }, [queueEntry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!patientId) {
      setError("Please select a patient")
      setLoading(false)
      return
    }

    try {
      const payload: any = {
        patientId: parseInt(patientId),
        servicePoint,
        priority,
        notes: notes && notes.trim() !== "" ? notes.trim() : null,
      }

      if (doctorId && doctorId.trim() !== "") {
        payload.doctorId = parseInt(doctorId)
      }

      if (servicePoint === "consultation" && consultationRoomId) {
        payload.servicePointId = parseInt(consultationRoomId, 10)
      }

      if (estimatedWaitTime && estimatedWaitTime.trim() !== "") {
        payload.estimatedWaitTime = parseInt(estimatedWaitTime)
      } else {
        payload.estimatedWaitTime = null
      }

      if (isEditing) {
        if (servicePoint === "consultation" && consultationRoomId) {
          payload.servicePointId = parseInt(consultationRoomId, 10)
        }
        await queueApi.update(queueEntry.queueId.toString(), payload)
        toast({
          title: "Queue entry updated",
          description: "Queue entry has been updated successfully.",
        })
      } else {
        await queueApi.create(payload)
        toast({
          title: "Patient added to queue",
          description: "Patient has been added to the queue successfully.",
        })
      }

      setLoading(false)
      onOpenChange?.(false)
      onSuccess?.()

      // Reset form
      setPatientId("")
      setPatientName("")
      setServicePoint("consultation")
      setPriority("normal")
      setDoctorId("")
      setConsultationRoomId("")
      setEstimatedWaitTime("")
      setNotes("")
    } catch (err: any) {
      console.error("Error saving queue entry:", err)
      setError(err.message || "Failed to save queue entry")
      setLoading(false)
      toast({
        title: "Error",
        description: err.message || "Failed to save queue entry",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Queue Entry" : "Add Patient to Queue"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the queue entry details."
              : "Assign this patient to a service queue and set priority level."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="patient">Patient {isEditing && "(Read-only)"}</Label>
              {isEditing ? (
                <Input id="patient" value={patientName || ""} readOnly className="bg-muted" />
              ) : (
                <PatientCombobox
                  value={patientId}
                  onValueChange={(value, patient) => {
                    setPatientId(value)
                    if (patient) {
                      setPatientName(`${patient.firstName || ""} ${patient.lastName || ""}`.trim())
                    } else {
                      setPatientName("")
                    }
                  }}
                  placeholder="Search for a patient..."
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servicePoint">Service Point</Label>
              <Select value={servicePoint} onValueChange={setServicePoint} required>
                <SelectTrigger id="servicePoint">
                  <SelectValue placeholder="Select service point" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triage">Triage</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                  <SelectItem value="radiology">Radiology</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="telemedicine">Telemedicine</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority} required>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {servicePoint === "consultation" && (
              <div className="grid gap-2">
                <Label htmlFor="consultationRoomId">Consultation room</Label>
                <Select
                  value={consultationRoomId || undefined}
                  onValueChange={setConsultationRoomId}
                  disabled={loadingRooms || consultationRooms.length === 0}
                >
                  <SelectTrigger id="consultationRoomId">
                    <SelectValue
                      placeholder={
                        loadingRooms
                          ? "Loading rooms..."
                          : consultationRooms.length === 0
                            ? "No rooms configured"
                            : "Select room (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {consultationRooms.map((room) => (
                      <SelectItem key={room.servicePointId} value={String(room.servicePointId)}>
                        {room.pointName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="doctorId">Doctor (Optional)</Label>
              <Select 
                value={doctorId || undefined} 
                onValueChange={(value) => setDoctorId(value || "")} 
                disabled={loadingDoctors}
              >
                <SelectTrigger id="doctorId">
                  <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Select doctor (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    doctor.userId && (
                      <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                        Dr. {doctor.firstName} {doctor.lastName}{doctor.department ? ` - ${doctor.department}` : ""}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedWaitTime">Estimated Wait Time (minutes, optional)</Label>
              <Input
                id="estimatedWaitTime"
                type="number"
                min="0"
                placeholder="e.g., 15"
                value={estimatedWaitTime}
                onChange={(e) => setEstimatedWaitTime(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions or notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !patientId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Update Queue Entry"
              ) : (
                "Add to Queue"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
