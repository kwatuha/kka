"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Search, Upload, Loader2, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import { AddMedicalRecordForm } from "@/components/add-medical-record-form"
import { medicalRecordsApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MedicalRecord {
  recordId: number
  patientId: number
  visitDate: string
  visitType: string
  department?: string
  chiefComplaint?: string
  diagnosis?: string
  treatment?: string
  prescription?: string
  notes?: string
  doctorId?: number
  patientName?: string
  patientNumber?: string
  doctorName?: string
  createdAt?: string
  updatedAt?: string
}

export default function MedicalRecordsPage() {
  const [addRecordOpen, setAddRecordOpen] = useState(false)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("")
  
  // Record actions state
  const [viewRecordOpen, setViewRecordOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)
  const [editRecordOpen, setEditRecordOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null)
  const [deleteRecordOpen, setDeleteRecordOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<MedicalRecord | null>(null)
  const [deletingRecordLoading, setDeletingRecordLoading] = useState(false)

  const loadRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await medicalRecordsApi.getAll(
        search || undefined,
        undefined,
        undefined,
        visitTypeFilter || undefined,
        departmentFilter || undefined
      )
      setRecords(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load medical records')
      console.error('Error loading medical records:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [visitTypeFilter, departmentFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== undefined) {
        loadRecords()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [search])

  const filteredRecords = records.filter((record) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        record.patientName?.toLowerCase().includes(searchLower) ||
        record.patientNumber?.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.chiefComplaint?.toLowerCase().includes(searchLower) ||
        record.department?.toLowerCase().includes(searchLower) ||
        record.doctorName?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const formatVisitType = (visitType: string) => {
    return visitType.charAt(0).toUpperCase() + visitType.slice(1)
  }

  const handleViewRecord = async (record: MedicalRecord) => {
    try {
      const details = await medicalRecordsApi.getById(record.recordId.toString())
      setSelectedRecord(details)
      setViewRecordOpen(true)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load record details",
        variant: "destructive",
      })
    }
  }

  const handleEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record)
    setEditRecordOpen(true)
  }

  const handleDeleteRecordClick = (record: MedicalRecord) => {
    setDeletingRecord(record)
    setDeleteRecordOpen(true)
  }

  const handleDeleteRecordConfirm = async () => {
    if (!deletingRecord) return

    try {
      setDeletingRecordLoading(true)
      await medicalRecordsApi.delete(deletingRecord.recordId.toString())
      toast({
        title: "Success",
        description: "Medical record deleted successfully",
      })
      setDeleteRecordOpen(false)
      setDeletingRecord(null)
      loadRecords()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete medical record",
        variant: "destructive",
      })
    } finally {
      setDeletingRecordLoading(false)
    }
  }

  const handleRecordSaved = () => {
    loadRecords()
    setEditRecordOpen(false)
    setEditingRecord(null)
  }

  // Get unique departments for filter
  const departments = Array.from(new Set(records.map(r => r.department).filter(Boolean))) as string[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground">Access and manage patient medical records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Records
          </Button>
          <Button onClick={() => setAddRecordOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Records Management</CardTitle>
          <CardDescription>View and manage all patient medical records in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                variant={visitTypeFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisitTypeFilter("")}
              >
                All
              </Button>
              <Button
                variant={visitTypeFilter === "Outpatient" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisitTypeFilter("Outpatient")}
              >
                Outpatient
              </Button>
              <Button
                variant={visitTypeFilter === "Inpatient" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisitTypeFilter("Inpatient")}
              >
                Inpatient
              </Button>
              <Button
                variant={visitTypeFilter === "Emergency" ? "default" : "outline"}
                size="sm"
                onClick={() => setVisitTypeFilter("Emergency")}
              >
                Emergency
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search records..."
                className="w-full pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No medical records found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Visit Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.recordId}>
                      <TableCell className="font-medium">MR-{record.recordId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.patientName || `Patient ${record.patientId}`}</div>
                          <div className="text-xs text-muted-foreground">{record.patientNumber || `ID: ${record.patientId}`}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.visitDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatVisitType(record.visitType)}</Badge>
                      </TableCell>
                      <TableCell>{record.department || "-"}</TableCell>
                      <TableCell>{record.doctorName || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.diagnosis || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewRecord(record)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditRecord(record)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteRecordClick(record)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddMedicalRecordForm
        open={addRecordOpen}
        onOpenChange={(open) => {
          setAddRecordOpen(open)
          if (!open) {
            loadRecords()
          }
        }}
        onSuccess={loadRecords}
      />

      <AddMedicalRecordForm
        open={editRecordOpen}
        onOpenChange={(open) => {
          setEditRecordOpen(open)
          if (!open) {
            setEditingRecord(null)
          }
        }}
        onSuccess={handleRecordSaved}
        record={editingRecord}
      />

      {/* View Record Dialog */}
      <Dialog open={viewRecordOpen} onOpenChange={setViewRecordOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Medical Record Details</DialogTitle>
            <DialogDescription>View complete medical record information</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Record ID</label>
                  <p className="text-sm font-medium">MR-{selectedRecord.recordId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Visit Date</label>
                  <p className="text-sm">{formatDate(selectedRecord.visitDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient</label>
                  <p className="text-sm">
                    {selectedRecord.patientName || `Patient ${selectedRecord.patientId}`}
                    {selectedRecord.patientNumber && ` (${selectedRecord.patientNumber})`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Visit Type</label>
                  <p className="text-sm">
                    <Badge variant="outline">{formatVisitType(selectedRecord.visitType)}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="text-sm">{selectedRecord.department || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Doctor</label>
                  <p className="text-sm">{selectedRecord.doctorName || "-"}</p>
                </div>
              </div>
              {selectedRecord.chiefComplaint && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Chief Complaint</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRecord.chiefComplaint}</p>
                </div>
              )}
              {selectedRecord.diagnosis && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Diagnosis</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRecord.diagnosis}</p>
                </div>
              )}
              {selectedRecord.treatment && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Treatment Plan</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRecord.treatment}</p>
                </div>
              )}
              {selectedRecord.prescription && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prescription</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRecord.prescription}</p>
                </div>
              )}
              {selectedRecord.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteRecordOpen} onOpenChange={setDeleteRecordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical record? This action cannot be undone.
              {deletingRecord && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-sm font-medium">Record MR-{deletingRecord.recordId}</p>
                  <p className="text-xs text-muted-foreground">
                    Patient: {deletingRecord.patientName || `Patient ${deletingRecord.patientId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Date: {formatDate(deletingRecord.visitDate)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingRecordLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecordConfirm}
              disabled={deletingRecordLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRecordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
