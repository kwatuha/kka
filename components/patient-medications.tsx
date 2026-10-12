"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { pharmacyApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

type Medication = {
  id: string
  name: string
  hptCode?: string | null
  dosage: string
  frequency: string
  startDate: string
  endDate: string | null
  status: string
  prescribedBy: string
  instructions: string
  reason: string
  dispensed: boolean
}

export function PatientMedications({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    loadMedications()
  }, [patientId])

  const loadMedications = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all prescriptions for the patient
      const prescriptions = await pharmacyApi.getPrescriptions(patientId)

      const meds: Medication[] = []

      // Process each prescription
      for (const prescription of prescriptions) {
        try {
          // Get prescription details with items
          const prescriptionDetails = await pharmacyApi.getPrescription(prescription.prescriptionId.toString())
          
          if (prescriptionDetails.items && prescriptionDetails.items.length > 0) {
            for (const item of prescriptionDetails.items) {
              const isActive = prescription.status === 'active' || prescription.status === 'pending'
              const isDispensed = item.dispensed || item.status === 'dispensed'
              
              meds.push({
                id: `med-${prescription.prescriptionId}-${item.itemId}`,
                name: item.medicationName || item.medicationNameFromCatalog || item.medication || 'Unknown Medication',
                hptCode: item.hptCode || null,
                dosage: `${item.dosage || ''}${item.unit || ''}`.trim() || 'N/A',
                frequency: item.frequency || item.dosageFrequency || 'As directed',
                startDate: prescription.prescriptionDate ? new Date(prescription.prescriptionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : null,
                status: isActive ? 'Active' : prescription.status === 'completed' ? 'Completed' : 'Discontinued',
                prescribedBy: prescription.doctorName || `${prescription.doctorFirstName || ''} ${prescription.doctorLastName || ''}`.trim() || 'Unknown Doctor',
                instructions: item.instructions || item.dosageInstructions || 'As directed',
                reason: prescription.notes || item.indication || 'Not specified',
                dispensed: isDispensed
              })
            }
          }
        } catch (err) {
          console.error(`Error loading prescription ${prescription.prescriptionId}:`, err)
        }
      }

      setMedications(meds)
    } catch (err: any) {
      console.error("Error loading medications:", err)
      setError(err.message || "Failed to load medications")
    } finally {
      setLoading(false)
    }
  }

  const activeMeds = medications.filter((med) => med.status === "Active")
  const pastMeds = medications.filter((med) => med.status !== "Active")
  const pendingMeds = medications.filter((med) => !med.dispensed && med.status === "Active")

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medications</CardTitle>
          <CardDescription>Current and past medication history</CardDescription>
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
          <CardTitle>Medications</CardTitle>
          <CardDescription>Current and past medication history</CardDescription>
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
        <CardTitle>Medications</CardTitle>
        <CardDescription>Current and past medication history</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Current Medications</TabsTrigger>
            <TabsTrigger value="past">Past Medications</TabsTrigger>
            <TabsTrigger value="pending">Pending Dispensing</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {activeMeds.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Prescribed By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeMeds.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">
                          <div>{med.name}</div>
                          {med.hptCode ? (
                            <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                              HPT {med.hptCode}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.frequency}</TableCell>
                        <TableCell>{med.startDate}</TableCell>
                        <TableCell>{med.prescribedBy}</TableCell>
                        <TableCell>{med.reason}</TableCell>
                        <TableCell>
                          <Badge variant="default">{med.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No active medications found</div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastMeds.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Prescribed By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastMeds.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">
                          <div>{med.name}</div>
                          {med.hptCode ? (
                            <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                              HPT {med.hptCode}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.startDate}</TableCell>
                        <TableCell>{med.endDate || 'N/A'}</TableCell>
                        <TableCell>{med.prescribedBy}</TableCell>
                        <TableCell>{med.reason}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{med.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No past medications found</div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingMeds.length > 0 ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Attention Required</AlertTitle>
                  <AlertDescription>
                    The following medications have been prescribed but not yet dispensed by the pharmacy.
                  </AlertDescription>
                </Alert>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Prescribed On</TableHead>
                        <TableHead>Prescribed By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMeds.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">
                            <div>{med.name}</div>
                            {med.hptCode ? (
                              <Badge variant="outline" className="mt-1 text-[10px] font-mono">
                                HPT {med.hptCode}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>{med.dosage}</TableCell>
                          <TableCell>{med.frequency}</TableCell>
                          <TableCell>{med.startDate}</TableCell>
                          <TableCell>{med.prescribedBy}</TableCell>
                          <TableCell>{med.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No pending medications found</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
