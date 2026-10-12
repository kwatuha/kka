"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { hasPermission } from "@/lib/auth/permissions"
import { AlertTriangle, FileText, User, Stethoscope } from "lucide-react"
import { patientApi, insuranceApi, queueApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { AddToQueueDialog, type QueueServicePointChoice, queueTypeLabel } from "@/components/add-to-queue-dialog"

interface PatientProfileDialogProps {
  patientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PatientProfileDialog({ patientId, open, onOpenChange }: PatientProfileDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [insuranceCompanyName, setInsuranceCompanyName] = useState<string | null>(null)
  const [loadingPatient, setLoadingPatient] = useState(false)
  const [addingToTriage, setAddingToTriage] = useState(false)
  const [confirmTriageOpen, setConfirmTriageOpen] = useState(false)

  useEffect(() => {
    if (open && patientId) {
      loadPatient()
    }
  }, [open, patientId])

  const loadPatient = async () => {
    try {
      setLoadingPatient(true)
      const data = await patientApi.getById(patientId)
      setPatient(data)

      // Fetch insurance company name if insuranceCompanyId exists
      if (data.insuranceCompanyId) {
        try {
          const provider = await insuranceApi.getProviderById(data.insuranceCompanyId.toString())
          setInsuranceCompanyName(provider.providerName || null)
        } catch (err) {
          console.error('Error loading insurance provider:', err)
          setInsuranceCompanyName(null)
        }
      } else {
        setInsuranceCompanyName(null)
      }
    } catch (err: any) {
      console.error('Error loading patient:', err)
      setPatient(null)
    } finally {
      setLoadingPatient(false)
    }
  }

  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase()
  }

  const handleFullProfileRequest = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      alert("Your request to view the full patient profile has been sent to the supervisor.")
    }, 1000)
  }

  const executeAddToQueue = async (servicePoint: QueueServicePointChoice) => {
    if (!patient || !patient.patientId) return

    try {
      setAddingToTriage(true)

      const queues = await queueApi.getAll(servicePoint, undefined, 1, 100, false)
      const existingEntry = queues.find(
        (entry: any) =>
          entry.patientId?.toString() === patient.patientId.toString() &&
          entry.status !== "completed" &&
          entry.status !== "cancelled",
      )

      const label = queueTypeLabel(servicePoint)

      if (existingEntry) {
        toast({
          title: `Patient Already in ${label} Queue`,
          description: `${patient.firstName} ${patient.lastName} is already in the ${label.toLowerCase()} queue (Ticket: ${existingEntry.ticketNumber || "N/A"}).`,
          variant: "default",
        })
        return
      }

      const payload = {
        patientId: parseInt(patient.patientId.toString(), 10),
        servicePoint,
        priority: "normal",
        status: "waiting",
        notes: `Returning patient - added to ${servicePoint} queue`,
      }

      await queueApi.create(payload)

      toast({
        title: `✅ Patient Added to ${label} Queue`,
        description: `${patient.firstName} ${patient.lastName} has been successfully added to the ${label.toLowerCase()} queue.`,
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error adding patient to queue:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add patient to queue. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingToTriage(false)
    }
  }

  const handleConfirmAddToQueue = async (servicePoint: QueueServicePointChoice) => {
    await executeAddToQueue(servicePoint)
    setConfirmTriageOpen(false)
  }

  if (loadingPatient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Information</DialogTitle>
            <DialogDescription>Loading patient data...</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!patient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Information</DialogTitle>
            <DialogDescription>Patient not found</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-red-500">Failed to load patient data</div>
        </DialogContent>
      </Dialog>
    )
  }

  const patientDisplay = {
    id: patient.patientNumber,
    name: `${patient.firstName} ${patient.lastName}`,
    age: calculateAge(patient.dateOfBirth),
    gender: patient.gender,
    dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A',
    bloodType: patient.bloodGroup || 'N/A',
    contact: patient.phone || 'N/A',
    email: patient.email || 'N/A',
    address: patient.address || 'N/A',
    emergencyContact: patient.nextOfKinName
      ? `${patient.nextOfKinName} (${patient.nextOfKinRelationship || 'N/A'}) - ${patient.nextOfKinPhone || 'N/A'}`
      : 'N/A',
    occupation: 'N/A',
    maritalStatus: 'N/A',
    nationalId: patient.idNumber || 'N/A',
    patientType: patient.patientType || 'paying',
    insuranceProvider: insuranceCompanyName || 'N/A',
    insuranceNumber: patient.insuranceNumber || 'N/A',
    registrationDate: patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A',
    status: patient.voided === 0 ? "Active" : "Inactive",
    avatar: "/thoughtful-portrait.png",
    initials: getInitials(patient.firstName, patient.lastName),
  }

  return (
    <>
      <AddToQueueDialog
        open={confirmTriageOpen}
        onOpenChange={setConfirmTriageOpen}
        patientName={patient ? `${patient.firstName} ${patient.lastName}` : ""}
        patientNumber={patient?.patientNumber}
        onConfirm={handleConfirmAddToQueue}
        loading={addingToTriage}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Information</DialogTitle>
          <DialogDescription>
            {hasPermission("view_patient_full")
              ? "View complete patient information"
              : "Limited patient information based on your access level"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Patient Basic Info Card */}
          <div className="flex flex-col items-center space-y-3 pb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={patientDisplay.avatar || "/placeholder.svg"} alt={patientDisplay.name} />
              <AvatarFallback>{patientDisplay.initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-semibold">{patientDisplay.name}</h3>
              <p className="text-sm text-muted-foreground">
                #{patientDisplay.id} • {patientDisplay.age !== null ? `${patientDisplay.age} years` : 'Age N/A'} • {patientDisplay.gender}
              </p>
              <Badge variant={patientDisplay.status === "Active" ? "default" : "outline"}>{patientDisplay.status}</Badge>
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                <User className="h-4 w-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="medical"
                disabled={!hasPermission("view_patient_medical")}
                title={
                  !hasPermission("view_patient_medical") ? "You don't have permission to view medical information" : ""
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                Medical
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                disabled={!hasPermission("view_patient_medical")}
                title={!hasPermission("view_patient_medical") ? "You don't have permission to view alerts" : ""}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alerts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{patientDisplay.dob}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">National ID</p>
                  <p className="text-sm font-medium">{patientDisplay.nationalId}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="text-sm font-medium">{patientDisplay.contact}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{patientDisplay.email}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">{patientDisplay.address}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Patient Type</p>
                <p className="text-sm font-medium capitalize">{patientDisplay.patientType}</p>
              </div>

              {patientDisplay.patientType === 'insurance' && (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Insurance Company</p>
                    <p className="text-sm font-medium">{patientDisplay.insuranceProvider}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Insurance Number</p>
                    <p className="text-sm font-medium">{patientDisplay.insuranceNumber}</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="medical" className="space-y-4 mt-4">
              {hasPermission("view_patient_medical") ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Blood Type</p>
                      <p className="text-sm font-medium">{patientDisplay.bloodType}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                      <p className="text-sm font-medium">N/A</p>
                    </div>
                  </div>
                  <Card className="p-4">
                    <p className="text-sm font-medium">Medical information would be displayed here</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This includes diagnoses, medications, allergies, and other medical history.
                    </p>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Access Restricted</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    You don't have permission to view medical information. This is restricted to clinical staff.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4 mt-4">
              {hasPermission("view_patient_medical") ? (
                <div className="space-y-4">
                  <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20">
                    <h4 className="font-medium text-red-700 dark:text-red-400">Allergies</h4>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">Penicillin - Severe reaction</p>
                  </Card>
                  <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <h4 className="font-medium text-amber-700 dark:text-amber-400">Medical Conditions</h4>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                      Hypertension - Controlled with medication
                    </p>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Access Restricted</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    You don't have permission to view patient alerts. This is restricted to clinical staff.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => setConfirmTriageOpen(true)}
                disabled={addingToTriage || !patient}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Add to queue
              </Button>
              {!hasPermission("view_patient_full") && (
                <Button onClick={handleFullProfileRequest} disabled={loading}>
                  {loading ? "Requesting..." : "Request Full Access"}
                </Button>
              )}
              {hasPermission("view_patient_full") && (
                <Button asChild>
                  <a href={`/patients/${patientId}`}>View Full Profile</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

