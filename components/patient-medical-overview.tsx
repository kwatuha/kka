"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  AlertTriangle,
  HeartPulse,
  FileText,
  Calendar,
  Stethoscope,
  Activity,
} from "lucide-react"
import { medicalRecordsApi, patientApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AddMedicalRecordForm } from "@/components/add-medical-record-form"

interface MedicalOverviewProps {
  patientId: string
}

interface MedicalRecord {
  recordId: number
  visitDate: string
  chiefComplaint?: string
  diagnosis?: string
  treatment?: string
  visitType?: string
  department?: string
  doctorName?: string
}

interface Allergy {
  allergyId: number
  allergen: string
  allergyType: string
  severity: string
  reaction?: string
  status: string
}

interface VitalSign {
  vitalSignId: number
  recordedDate: string
  systolicBP?: number
  diastolicBP?: number
  heartRate?: number
  temperature?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
}

export function PatientMedicalOverview({ patientId }: MedicalOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [amendOpen, setAmendOpen] = useState(false)
  const [recordToAmend, setRecordToAmend] = useState<any | null>(null)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([])
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMedicalInformation()
  }, [patientId])

  const loadMedicalInformation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch medical records
      const records = await medicalRecordsApi.getAll(undefined, patientId, undefined, undefined, undefined, 1, 5)
      setMedicalRecords(records || [])

      // Fetch allergies
      try {
        const allergiesData = await patientApi.getAllergies(patientId)
        setAllergies(allergiesData || [])
      } catch (err) {
        console.error("Error fetching allergies:", err)
        setAllergies([])
      }

      // Fetch vital signs
      try {
        const vitalsData = await patientApi.getVitals(patientId)
        setVitals(vitalsData || [])
      } catch (err) {
        console.error("Error fetching vitals:", err)
        setVitals([])
      }
    } catch (err: any) {
      console.error("Error loading medical information:", err)
      setError(err.message || "Failed to load medical information")
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "life_threatening":
      case "severe":
        return "destructive"
      case "moderate":
        return "default"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const activeAllergies = allergies.filter((a) => a.status === "active")
  const latestVitals = vitals.length > 0 ? vitals[0] : null
  const recentRecords = medicalRecords.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Active Allergies Alert */}
      {activeAllergies.length > 0 && (
        <Alert variant={activeAllergies.some((a) => a.severity === "severe" || a.severity === "life_threatening") ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Allergies</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {activeAllergies.map((allergy) => (
                <div key={allergy.allergyId} className="flex items-center gap-2">
                  <Badge variant={getSeverityColor(allergy.severity)} className="text-xs">
                    {allergy.allergen}
                  </Badge>
                  {allergy.reaction && (
                    <span className="text-sm text-muted-foreground">- {allergy.reaction}</span>
                  )}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Latest Vital Signs */}
      {latestVitals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              Latest Vital Signs
            </CardTitle>
            <CardDescription>Recorded on {formatDateTime(latestVitals.recordedDate)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {latestVitals.systolicBP && latestVitals.diastolicBP && (
                <div>
                  <p className="text-xs text-muted-foreground">Blood Pressure</p>
                  <p className="text-lg font-semibold">
                    {latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg
                  </p>
                </div>
              )}
              {latestVitals.heartRate && (
                <div>
                  <p className="text-xs text-muted-foreground">Heart Rate</p>
                  <p className="text-lg font-semibold">{latestVitals.heartRate} bpm</p>
                </div>
              )}
              {latestVitals.temperature && (
                <div>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-lg font-semibold">{latestVitals.temperature}°C</p>
                </div>
              )}
              {latestVitals.oxygenSaturation && (
                <div>
                  <p className="text-xs text-muted-foreground">SpO2</p>
                  <p className="text-lg font-semibold">{latestVitals.oxygenSaturation}%</p>
                </div>
              )}
              {latestVitals.weight && (
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="text-lg font-semibold">{latestVitals.weight} kg</p>
                </div>
              )}
              {latestVitals.height && (
                <div>
                  <p className="text-xs text-muted-foreground">Height</p>
                  <p className="text-lg font-semibold">{latestVitals.height} cm</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Medical Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Medical Records
          </CardTitle>
          <CardDescription>Latest consultations and diagnoses</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecords.length > 0 ? (
            <div className="space-y-4">
              {recentRecords.map((record) => (
                <div key={record.recordId} className="border-l-4 border-primary pl-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatDate(record.visitDate)}</span>
                      {record.visitType && (
                        <Badge variant="outline" className="text-xs">
                          {record.visitType}
                        </Badge>
                      )}
                      {record.department && (
                        <Badge variant="outline" className="text-xs">
                          {record.department}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {record.doctorName && (
                        <span className="text-xs text-muted-foreground">Dr. {record.doctorName}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            const full = await medicalRecordsApi.getById(String(record.recordId))
                            setRecordToAmend(full)
                            setAmendOpen(true)
                          } catch {
                            setRecordToAmend({ ...record, patientId: Number(patientId) })
                            setAmendOpen(true)
                          }
                        }}
                      >
                        Amend
                      </Button>
                    </div>
                  </div>
                  {record.chiefComplaint && (
                    <div>
                      <p className="text-xs text-muted-foreground">Chief Complaint</p>
                      <p className="text-sm">{record.chiefComplaint}</p>
                    </div>
                  )}
                  {record.diagnosis && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        Diagnosis
                      </p>
                      <p className="text-sm font-medium">{record.diagnosis}</p>
                    </div>
                  )}
                  {record.treatment && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Treatment
                      </p>
                      <p className="text-sm">{record.treatment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No medical records found for this patient.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalRecords.length}</div>
            <p className="text-xs text-muted-foreground">Medical records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAllergies.length}</div>
            <p className="text-xs text-muted-foreground">Allergies recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vital Signs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vitals.length}</div>
            <p className="text-xs text-muted-foreground">Recordings available</p>
          </CardContent>
        </Card>
      </div>

      <AddMedicalRecordForm
        open={amendOpen}
        onOpenChange={(next) => {
          setAmendOpen(next)
          if (!next) setRecordToAmend(null)
        }}
        record={recordToAmend}
        onSuccess={() => void loadMedicalInformation()}
      />
    </div>
  )
}

