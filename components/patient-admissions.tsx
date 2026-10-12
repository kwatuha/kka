"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, AlertCircle } from "lucide-react"
import { inpatientApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

type Admission = {
  id: string
  admissionDate: string
  dischargeDate: string | null
  ward: string
  bedNumber: string
  admittingDoctor: string
  diagnosis: string
  status: string
  notes: string
  department: string
}

export function PatientAdmissions({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admissions, setAdmissions] = useState<Admission[]>([])

  useEffect(() => {
    loadAdmissions()
  }, [patientId])

  const loadAdmissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const admissionsData = await inpatientApi.getAdmissions(undefined, undefined, 1, 100, undefined, patientId)

      const admissionList: Admission[] = admissionsData.map((adm: any) => {
        const admissionDate = new Date(adm.admissionDate || new Date())
        const dischargeDate = adm.dischargeDate ? new Date(adm.dischargeDate) : null
        const primaryDiagnosis = adm.diagnoses && adm.diagnoses.length > 0 
          ? adm.diagnoses.find((d: any) => d.diagnosisType === 'primary') || adm.diagnoses[0]
          : null

        return {
          id: adm.admissionNumber || `ADM-${adm.admissionId}`,
          admissionDate: admissionDate.toISOString().split('T')[0],
          dischargeDate: dischargeDate ? dischargeDate.toISOString().split('T')[0] : null,
          ward: adm.wardName || adm.ward || 'Unknown Ward',
          bedNumber: adm.bedNumber || 'N/A',
          admittingDoctor: adm.doctorName || `${adm.doctorFirstName || ''} ${adm.doctorLastName || ''}`.trim() || 'Unknown Doctor',
          diagnosis: primaryDiagnosis ? (primaryDiagnosis.diagnosis || primaryDiagnosis.diagnosisName) : (adm.admissionDiagnosis || 'Not specified'),
          status: adm.status === 'active' ? 'Current' : 'Discharged',
          notes: adm.notes || '',
          department: adm.wardType || adm.department || 'General'
        }
      })

      // Sort by admission date descending
      admissionList.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())

      setAdmissions(admissionList)
    } catch (err: any) {
      console.error("Error loading admissions:", err)
      setError(err.message || "Failed to load admissions")
    } finally {
      setLoading(false)
    }
  }

  const currentAdmission = admissions.find((adm) => adm.status === "Current")
  const pastAdmissions = admissions.filter((adm) => adm.status === "Discharged")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hospital Admissions</CardTitle>
          <CardDescription>Current and previous hospital stays</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hospital Admissions</CardTitle>
          <CardDescription>Current and previous hospital stays</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hospital Admissions</CardTitle>
        <CardDescription>Current and previous hospital stays</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentAdmission && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Admission</h3>
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Admission ID</div>
                    <div className="font-medium">{currentAdmission.id}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Admission Date</div>
                    <div className="font-medium">{currentAdmission.admissionDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Ward</div>
                    <div className="font-medium">{currentAdmission.ward}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Bed Number</div>
                    <div className="font-medium">{currentAdmission.bedNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Admitting Doctor</div>
                    <div className="font-medium">{currentAdmission.admittingDoctor}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Department</div>
                    <div className="font-medium">{currentAdmission.department}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-sm font-medium text-muted-foreground">Diagnosis</div>
                    <div className="font-medium">{currentAdmission.diagnosis}</div>
                  </div>
                  {currentAdmission.notes && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">Notes</div>
                      <div className="font-medium">{currentAdmission.notes}</div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Admission History</h3>
          {pastAdmissions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Discharge Date</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAdmissions.map((admission) => (
                    <TableRow key={admission.id}>
                      <TableCell className="font-medium">{admission.id}</TableCell>
                      <TableCell>{admission.admissionDate}</TableCell>
                      <TableCell>{admission.dischargeDate || 'N/A'}</TableCell>
                      <TableCell>{admission.ward}</TableCell>
                      <TableCell>{admission.diagnosis}</TableCell>
                      <TableCell>{admission.admittingDoctor}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No previous admissions found</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
