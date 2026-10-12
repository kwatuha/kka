"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Stethoscope } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { proceduresApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

type Procedure = {
  patientProcedureId: number
  procedureId: number | null
  procedureCode: string | null
  procedureName: string
  procedureDate: string
  performedBy: number | null
  performedByFirstName: string | null
  performedByLastName: string | null
  notes: string | null
  complications: string | null
  category: string | null
  duration: number | null
  cost: number | null
  chargeCost: number | null
}

export function PatientProcedures({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procedures, setProcedures] = useState<Procedure[]>([])

  useEffect(() => {
    loadProcedures()
  }, [patientId])

  const loadProcedures = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all procedures for the patient
      const data = await proceduresApi.getPatientProcedures(patientId)

      setProcedures(data || [])
    } catch (err: any) {
      console.error("Error loading procedures:", err)
      setError(err.message || "Failed to load procedures")
    } finally {
      setLoading(false)
    }
  }

  const getPerformedByName = (procedure: Procedure) => {
    if (procedure.performedByFirstName && procedure.performedByLastName) {
      return `${procedure.performedByFirstName} ${procedure.performedByLastName}`
    }
    return "Unknown"
  }

  const getProcedureCost = (procedure: Procedure) => {
    return procedure.cost || procedure.chargeCost || 0
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Procedures</CardTitle>
          <CardDescription>History of procedures performed</CardDescription>
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
          <CardTitle>Procedures</CardTitle>
          <CardDescription>History of procedures performed</CardDescription>
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

  if (procedures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Procedures
          </CardTitle>
          <CardDescription>History of procedures performed</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Procedures Found</AlertTitle>
            <AlertDescription>
              No procedures have been recorded for this patient yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Sort by date descending (most recent first)
  const sortedProcedures = [...procedures].sort((a, b) => {
    return new Date(b.procedureDate).getTime() - new Date(a.procedureDate).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Procedures ({procedures.length})
        </CardTitle>
        <CardDescription>History of procedures performed for this patient</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Complications</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProcedures.map((procedure) => {
                const cost = getProcedureCost(procedure)
                const hasComplications = procedure.complications && procedure.complications.trim() !== ""

                return (
                  <TableRow key={procedure.patientProcedureId}>
                    <TableCell className="font-medium">
                      {format(new Date(procedure.procedureDate), "PPP")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{procedure.procedureName}</div>
                        {procedure.procedureCode && (
                          <div className="text-xs text-muted-foreground">
                            Code: {procedure.procedureCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {procedure.category ? (
                        <Badge variant="outline">{procedure.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getPerformedByName(procedure)}</TableCell>
                    <TableCell>
                      {cost > 0 ? (
                        <span className="font-medium">
                          KES {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {procedure.duration ? `${procedure.duration} min` : "—"}
                    </TableCell>
                    <TableCell>
                      {hasComplications ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {procedure.notes || procedure.complications ? (
                        <div className="text-sm">
                          {procedure.notes && (
                            <div className="truncate">{procedure.notes}</div>
                          )}
                          {hasComplications && (
                            <div className="text-destructive text-xs mt-1 truncate">
                              Complications: {procedure.complications}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}






