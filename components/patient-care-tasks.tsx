"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Eye, Stethoscope } from "lucide-react"
import { inpatientApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { InpatientManagement } from "@/components/inpatient-management"

export function PatientCareTasks() {
  const { toast } = useToast()
  const [admissions, setAdmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewAdmissionId, setViewAdmissionId] = useState<string | null>(null)
  const [viewAdmissionOpen, setViewAdmissionOpen] = useState(false)

  useEffect(() => {
    loadAdmissions()
  }, [])

  const loadAdmissions = async () => {
    try {
      setLoading(true)
      // GET /api/inpatient/admissions filters by nurse's assigned wards when user is a nurse
      const data = await inpatientApi.getAdmissions("admitted", undefined, 1, 100)
      setAdmissions(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to load patients in your wards",
        variant: "destructive",
      })
      setAdmissions([])
    } finally {
      setLoading(false)
    }
  }

  const initials = (first?: string, last?: string, patientNumber?: string) => {
    if (first && last) return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase()
    if (patientNumber) return patientNumber.slice(-2).toUpperCase()
    return "?"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Care Tasks</CardTitle>
            <CardDescription>
              Patients currently admitted in your assigned wards. Open an admission to record vitals, nursing care, and view the care plan.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No patients in your wards</p>
            <p className="text-sm mt-1">
              There are no current admissions in your assigned wards. Assign wards under Ward Management → Ward Assignments if needed.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Admission</TableHead>
                <TableHead>Ward / Bed</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.map((adm) => (
                <TableRow key={adm.admissionId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={undefined} alt="" />
                        <AvatarFallback>
                          {initials(adm.firstName, adm.lastName, adm.patientNumber)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {[adm.firstName, adm.lastName].filter(Boolean).join(" ") || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{adm.patientNumber || adm.patientId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{adm.admissionNumber || `#${adm.admissionId}`}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{adm.wardName || "—"}</span>
                    {adm.bedNumber && (
                      <span className="text-muted-foreground ml-1">• Bed {adm.bedNumber}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {[adm.doctorFirstName, adm.doctorLastName].filter(Boolean).join(" ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewAdmissionId(adm.admissionId.toString())
                        setViewAdmissionOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {viewAdmissionId && (
        <InpatientManagement
          admissionId={viewAdmissionId}
          open={viewAdmissionOpen}
          onOpenChange={(open) => {
            setViewAdmissionOpen(open)
            if (!open) setViewAdmissionId(null)
          }}
          onAdmissionUpdated={loadAdmissions}
        />
      )}
    </Card>
  )
}
