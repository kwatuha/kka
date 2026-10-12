"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, FileText, User, Calendar, Package, AlertCircle } from "lucide-react"
import { pharmacyApi } from "@/lib/api"
import { format } from "date-fns"
import Link from "next/link"

interface BatchTraceResult {
  batchNumber: string
  batchInfo: {
    drugInventoryId?: number
    medicationId?: number
    batchNumber: string
    currentQuantity?: number
    unitPrice?: number
    manufactureDate?: string
    expiryDate?: string
    minPrice?: number
    sellPrice?: number
    location?: string
    notes?: string
    createdAt?: string
    medicationName?: string
    medicationCode?: string
    genericName?: string
  } | null
  dispensations: Array<{
    dispensationId: number
    dispensationDate: string
    quantityDispensed: number
    batchNumber: string
    expiryDate?: string
    dispensationNotes?: string
    dispensedAt: string
    prescriptionItemId: number
    medicationName: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
    prescriptionId: number
    prescriptionNumber: string
    prescriptionDate: string
    prescriptionStatus: string
    patientId: number
    patientNumber: string
    patientFirstName: string
    patientLastName: string
    patientPhone?: string
    dateOfBirth?: string
    gender?: string
    doctorFirstName: string
    doctorLastName: string
    doctorUsername?: string
    dispensedByFirstName: string
    dispensedByLastName: string
    dispensedByUsername?: string
    medicationId?: number
    medicationCode?: string
    medicationFullName?: string
    genericName?: string
    dosageForm?: string
    strength?: string
    manufacturer?: string
  }>
  totalDispensations: number
  totalQuantityDispensed: number
  uniquePatients: number
}

export function BatchTraceability() {
  const [batchNumber, setBatchNumber] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [traceResult, setTraceResult] = useState<BatchTraceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchList, setBatchList] = useState<any[]>([])
  const [loadingBatchList, setLoadingBatchList] = useState(false)

  useEffect(() => {
    loadBatchList()
  }, [searchQuery])

  const loadBatchList = async () => {
    try {
      setLoadingBatchList(true)
      const data = await pharmacyApi.getBatchTraceList(searchQuery)
      setBatchList(data)
    } catch (err: any) {
      console.error("Error loading batch list:", err)
    } finally {
      setLoadingBatchList(false)
    }
  }

  const handleTrace = async () => {
    if (!batchNumber.trim()) {
      setError("Please enter a batch number")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await pharmacyApi.getBatchTrace(batchNumber.trim())
      setTraceResult(data)
    } catch (err: any) {
      setError(err.message || "Failed to trace batch number")
      setTraceResult(null)
      console.error("Error tracing batch:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchSelect = (selectedBatch: string) => {
    setBatchNumber(selectedBatch)
    handleTrace()
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return "-"
    try {
      return format(new Date(date), "MMM dd, yyyy")
    } catch {
      return date
    }
  }

  const calculateAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return "-"
    try {
      const birth = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return `${age} years`
    } catch {
      return "-"
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Batch Traceability</CardTitle>
          <CardDescription>
            Trace which patients received drugs from a specific batch number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search/Input Section */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter batch number (e.g., BT-2023-045)"
                className="pl-8"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTrace()
                  }
                }}
              />
            </div>
            <Button onClick={handleTrace} disabled={loading || !batchNumber.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tracing...
                </>
              ) : (
                "Trace Batch"
              )}
            </Button>
          </div>

          {/* Batch List Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search batch numbers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loadingBatchList && (
              <div className="absolute right-2.5 top-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Batch List */}
          {searchQuery && batchList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {batchList.map((batch) => (
                    <Button
                      key={batch.batchNumber}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleBatchSelect(batch.batchNumber)}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{batch.batchNumber}</span>
                        {batch.medicationName && (
                          <span className="text-xs text-muted-foreground">
                            {batch.medicationName} • {batch.patientCount} patients • {batch.totalQuantityDispensed} units
                          </span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Trace Results */}
          {traceResult && (
            <div className="space-y-4">
              {/* Batch Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Batch Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Batch Number</p>
                      <p className="text-lg font-semibold">{traceResult.batchNumber}</p>
                    </div>
                    {traceResult.batchInfo && (
                      <>
                        {traceResult.batchInfo.medicationName && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Medication</p>
                            <p className="text-lg font-semibold">{traceResult.batchInfo.medicationName}</p>
                            {traceResult.batchInfo.genericName && (
                              <p className="text-xs text-muted-foreground">{traceResult.batchInfo.genericName}</p>
                            )}
                          </div>
                        )}
                        {traceResult.batchInfo.expiryDate && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                            <p className="text-lg font-semibold">{formatDate(traceResult.batchInfo.expiryDate)}</p>
                          </div>
                        )}
                        {traceResult.batchInfo.currentQuantity !== undefined && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Current Quantity</p>
                            <p className="text-lg font-semibold">{traceResult.batchInfo.currentQuantity}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Dispensed</p>
                      <p className="text-lg font-semibold">{traceResult.totalQuantityDispensed} units</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unique Patients</p>
                      <p className="text-lg font-semibold">{traceResult.uniquePatients}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dispensations</p>
                      <p className="text-lg font-semibold">{traceResult.totalDispensations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispensations Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Patient Dispensations</CardTitle>
                  <CardDescription>
                    List of all patients who received this batch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {traceResult.dispensations.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Medication</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Prescription</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Dispensed By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {traceResult.dispensations.map((disp) => (
                            <TableRow key={disp.dispensationId}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {formatDate(disp.dispensationDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <Link
                                      href={`/patients/${disp.patientId}`}
                                      className="font-medium hover:underline"
                                    >
                                      {disp.patientFirstName} {disp.patientLastName}
                                    </Link>
                                    <div className="text-xs text-muted-foreground">
                                      {disp.patientNumber} • {calculateAge(disp.dateOfBirth)} • {disp.gender}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{disp.medicationName}</div>
                                  {disp.dosage && (
                                    <div className="text-xs text-muted-foreground">
                                      {disp.dosage} • {disp.frequency} • {disp.duration}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  <Package className="mr-1 h-3 w-3" />
                                  {disp.quantityDispensed}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/pharmacy?prescription=${disp.prescriptionId}`}
                                  className="text-sm font-medium hover:underline flex items-center gap-1"
                                >
                                  <FileText className="h-3 w-3" />
                                  {disp.prescriptionNumber}
                                </Link>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(disp.prescriptionDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  Dr. {disp.doctorFirstName} {disp.doctorLastName}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {disp.dispensedByFirstName} {disp.dispensedByLastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(disp.dispensedAt)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No dispensations found for this batch number
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}






