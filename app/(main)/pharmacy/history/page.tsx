"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  History, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Filter,
  Download,
  Calendar
} from "lucide-react"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import Link from "next/link"

interface DrugHistoryItem {
  adjustmentId: number
  drugInventoryId: number
  medicationId: number
  medicationName: string
  medicationCode: string
  adjustmentType: string
  adjustmentDate: string
  adjustmentTime: string
  quantity: number
  batchNumber: string
  unitPrice: string
  sellPrice: string
  expiryDate: string
  location: string
  patientId?: number
  patientFirstName?: string
  patientLastName?: string
  patientNumber?: string
  prescriptionId?: number
  prescriptionNumber?: string
  performedByFirstName?: string
  performedByLastName?: string
  notes?: string
}

export default function DrugHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<DrugHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState("")
  const [medicationId, setMedicationId] = useState<string>("all")
  const [patientId, setPatientId] = useState<string>("")
  const [batchNumber, setBatchNumber] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Medications list for filter
  const [medications, setMedications] = useState<any[]>([])

  useEffect(() => {
    loadMedications()
  }, [])

  useEffect(() => {
    loadHistory()
  }, [page, search, medicationId, patientId, batchNumber, adjustmentType, startDate, endDate])

  const loadMedications = async () => {
    try {
      const data = await pharmacyApi.getMedications(undefined, 1, 300)
      setMedications(data || [])
    } catch (err: any) {
      console.error("Error loading medications:", err)
    }
  }

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: any = {
        page,
        limit,
      }

      if (medicationId && medicationId !== "all") {
        filters.medicationId = medicationId
      }
      if (patientId) {
        filters.patientId = patientId
      }
      if (batchNumber) {
        filters.batchNumber = batchNumber
      }
      if (adjustmentType && adjustmentType !== "all") {
        filters.adjustmentType = adjustmentType
      }
      if (startDate) {
        filters.startDate = startDate
      }
      if (endDate) {
        filters.endDate = endDate
      }
      if (search) {
        filters.search = search
      }

      const data = await pharmacyApi.getDrugHistory(filters)

      setHistory(data.adjustments || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)
    } catch (err: any) {
      console.error("Error loading drug history:", err)
      setError(err.message || "Failed to load drug history")
      toast({
        title: "Error",
        description: "Failed to load drug history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setMedicationId("all")
    setPatientId("")
    setBatchNumber("")
    setAdjustmentType("all")
    setStartDate("")
    setEndDate("")
    setPage(1)
  }

  const getAdjustmentTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      RECEIPT: "default",
      DISPENSATION: "destructive",
      ADJUSTMENT: "secondary",
      TRANSFER: "outline",
      EXPIRY: "destructive",
      DAMAGE: "destructive",
      RETURN: "outline",
      CORRECTION: "secondary",
    }
    return (
      <Badge variant={variants[type] || "outline"}>
        {type}
      </Badge>
    )
  }

  const getQuantityIcon = (quantity: number) => {
    if (quantity > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (quantity < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    const time = timeString ? new Date(timeString) : date
    return `${formatDate(dateString)} ${time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drug History</h1>
          <p className="text-muted-foreground">
            Complete history of all drug inventory movements with patient tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter drug history by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medications, batches, patients..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medication</Label>
              <SearchableSelect
                value={medicationId}
                onValueChange={(value) => {
                  setMedicationId(value)
                  if (value !== "all" && adjustmentType === "all") {
                    setAdjustmentType("DISPENSATION")
                  }
                  setPage(1)
                }}
                options={[
                  { value: "all", label: "All medications" },
                  ...medications.map((med) => ({
                    value: String(med.medicationId),
                    label: med.name || med.medicationName || `Medication ${med.medicationId}`,
                  })),
                ]}
                placeholder="Search medication…"
                emptyMessage="No medication found"
              />
              <p className="text-xs text-muted-foreground">
                Looking for patients who received a drug?{" "}
                <Link href="/pharmacy?tab=patients-by-drug" className="underline underline-offset-2">
                  Open Patients by drug
                </Link>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={adjustmentType} onValueChange={(value) => {
                setAdjustmentType(value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="RECEIPT">Receipt</SelectItem>
                  <SelectItem value="DISPENSATION">Dispensation</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="EXPIRY">Expiry</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input
                placeholder="Batch number"
                value={batchNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Patient ID</Label>
              <Input
                placeholder="Patient ID"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drug Inventory History</CardTitle>
          <CardDescription>
            Showing {history.length} of {total} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No drug history found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.adjustmentId}>
                      <TableCell className="font-mono text-sm">
                        {formatDateTime(item.adjustmentDate, item.adjustmentTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.medicationName}</span>
                          {item.medicationCode && (
                            <span className="text-xs text-muted-foreground">
                              {item.medicationCode}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.batchNumber}</TableCell>
                      <TableCell>{getAdjustmentTypeBadge(item.adjustmentType)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getQuantityIcon(item.quantity)}
                          <span
                            className={
                              item.quantity > 0
                                ? "text-green-600 font-semibold"
                                : item.quantity < 0
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {item.quantity > 0 ? "+" : ""}
                            {item.quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unitPrice
                          ? `KES ${parseFloat(item.unitPrice).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.sellPrice
                          ? `KES ${parseFloat(item.sellPrice).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {item.patientFirstName || item.patientLastName ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {item.patientFirstName || ""} {item.patientLastName || ""}
                            </span>
                            {item.patientNumber && (
                              <span className="text-xs text-muted-foreground">
                                {item.patientNumber}
                              </span>
                            )}
                            {item.prescriptionNumber && (
                              <span className="text-xs text-muted-foreground">
                                Rx: {item.prescriptionNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                      </TableCell>
                      <TableCell>
                        {item.performedByFirstName || item.performedByLastName
                          ? `${item.performedByFirstName || ""} ${item.performedByLastName || ""}`.trim()
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.notes || ""}>
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total records)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

