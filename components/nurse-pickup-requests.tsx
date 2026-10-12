"use client"

import React, { useEffect, useState } from "react"
import { nursingApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Loader2, Search, User, Bed, Calendar, Pill, AlertCircle, History, CheckCircle2, Clock, FileDown, FileSpreadsheet, Package } from "lucide-react"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ReadyPickupRequest {
  admissionId: number
  admissionNumber: string
  wardId: number
  wardName: string
  bedNumber?: string | null
  patientId: number
  patientNumber: string
  patientFirstName: string
  patientLastName: string
  prescriptionId: number
  prescriptionNumber: string
  prescriptionDate: string
  items: {
    prescriptionItemId: number
    medicationName: string
    dosage?: string | null
    frequency?: string | null
    duration?: string | null
    quantity?: number | null
    status: string
  }[]
}

export function NursePickupRequests() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<ReadyPickupRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<Map<string, Set<number>>>(new Map())
  const [notes, setNotes] = useState<Map<string, string>>(new Map())
  const [submittingForKey, setSubmittingForKey] = useState<string | null>(null)
  const [hasAssignedWards, setHasAssignedWards] = useState<boolean | null>(null)
  const [myRequestHistory, setMyRequestHistory] = useState<any[]>([])
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // First, check if nurse has any assigned wards
      try {
        const wards = await nursingApi.getAssignedWards()
        setHasAssignedWards(wards && wards.length > 0)
      } catch (error) {
        console.error("Error loading assigned wards:", error)
      }

      const [readyData, historyData] = await Promise.all([
        nursingApi.getReadyPickupRequests(),
        nursingApi.getMyPickupRequests().then((data: any) => {
          if (Array.isArray(data)) return data
          if (data && Array.isArray(data.pickups)) return data.pickups
          if (data && Array.isArray(data.data)) return data.data
          return []
        }).catch((err) => {
          console.error("Error loading my request history:", err)
          toast({
            title: "Could not load request history",
            description: err?.message || "Please try again.",
            variant: "destructive",
          })
          return []
        }),
      ])
      setRequests(readyData || [])
      setMyRequestHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error: any) {
      console.error("Error loading pickup-ready prescriptions:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to load pickup-ready prescriptions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const keyFor = (req: ReadyPickupRequest) =>
    `${req.admissionId}:${req.prescriptionId}`

  const handleCancelRequest = async (pickupId: string | number) => {
    if (!confirm("Cancel this pickup request? You can create a new request later if needed.")) return
    try {
      setCancellingId(pickupId.toString())
      await nursingApi.cancelPickupRequest(pickupId.toString())
      toast({ title: "Cancelled", description: "Your pickup request has been cancelled." })
      await loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel request",
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
    }
  }

  const handleItemToggle = (key: string, itemId: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      const set = new Set(next.get(key) ?? [])
      if (set.has(itemId)) {
        set.delete(itemId)
      } else {
        set.add(itemId)
      }
      if (set.size === 0) {
        next.delete(key)
      } else {
        next.set(key, set)
      }
      return next
    })
  }

  const handleSelectAllItems = (req: ReadyPickupRequest) => {
    const key = keyFor(req)
    setSelectedItems(prev => {
      const next = new Map(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.set(
          key,
          new Set(req.items.map(i => i.prescriptionItemId))
        )
      }
      return next
    })
  }

  const handleCreateRequest = async (req: ReadyPickupRequest) => {
    const key = keyFor(req)
    const selected = selectedItems.get(key)

    if (!selected || selected.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one medication to request",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingForKey(key)

      const items = req.items
        .filter(i => selected.has(i.prescriptionItemId))
        .map(i => ({
          prescriptionItemId: i.prescriptionItemId,
          quantityRequested: i.quantity ?? 1,
        }))

      await nursingApi.createPickupRequest({
        admissionId: req.admissionId,
        prescriptionId: req.prescriptionId,
        items,
        notes: notes.get(key) || undefined,
      })

      toast({
        title: "Pickup request sent",
        description: `Pickup request created for ${items.length} item(s)`,
      })

      // Clear selection and notes for this prescription and reload data
      setSelectedItems(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      setNotes(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })

      await loadData()
    } catch (error: any) {
      console.error("Error creating pickup request:", error)
      toast({
        title: "Error",
        description:
          error?.response?.data?.error ||
          error?.message ||
          "Failed to create pickup request",
        variant: "destructive",
      })
    } finally {
      setSubmittingForKey(null)
    }
  }

  const formatHistoryStatus = (h: any) => {
    if (h.status === "picked_up") return "Picked up"
    if (h.status === "cancelled") return "Cancelled"
    return "Pending"
  }

  const handleExportHistoryExcel = async () => {
    if (myRequestHistory.length === 0) {
      toast({ title: "No data", description: "No request history to export.", variant: "destructive" })
      return
    }
    if (typeof window === "undefined") return
    setExporting("excel")
    try {
      const xlsxModule = await import("xlsx")
      const XLSX = xlsxModule.default || xlsxModule
      if (!XLSX?.utils) throw new Error("Excel library not loaded")
      const excelData = myRequestHistory.map((h: any) => ({
        "Request date": h.createdAt ? format(new Date(h.createdAt), "PPp") : "—",
        "Prescription": h.prescriptionNumber ?? "",
        "Patient": `${h.patientFirstName ?? ""} ${h.patientLastName ?? ""}`.trim(),
        "Patient number": h.patientNumber ?? "",
        "Ward": h.wardName ?? "—",
        "Bed": h.bedNumber ?? "—",
        "Items": h.items?.length ?? 0,
        "Status": formatHistoryStatus(h),
      }))
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "My request history")
      ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }]
      const filename = `Nurse_pickup_request_history_${format(new Date(), "yyyy-MM-dd")}.xlsx`
      XLSX.writeFile(wb, filename)
      toast({ title: "Success", description: `Exported ${myRequestHistory.length} row(s) to Excel.` })
    } catch (error: any) {
      console.error("Export Excel:", error)
      toast({ title: "Error", description: "Failed to export to Excel.", variant: "destructive" })
    } finally {
      setExporting(null)
    }
  }

  const handleExportHistoryPDF = async () => {
    if (myRequestHistory.length === 0) {
      toast({ title: "No data", description: "No request history to export.", variant: "destructive" })
      return
    }
    if (typeof window === "undefined") return
    setExporting("pdf")
    try {
      const [{ default: jsPDF }, ..._] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      pdf.setFontSize(16)
      pdf.text("My pickup request history", 14, 15)
      pdf.setFontSize(10)
      pdf.text(`Generated on ${format(new Date(), "PPp")} • ${myRequestHistory.length} request(s)`, 14, 22)
      const tableData = myRequestHistory.map((h: any) => [
        h.createdAt ? format(new Date(h.createdAt), "PPp") : "—",
        h.prescriptionNumber ?? "",
        `${h.patientFirstName ?? ""} ${h.patientLastName ?? ""}`.trim(),
        h.wardName ?? "—",
        h.bedNumber ?? "—",
        String(h.items?.length ?? 0),
        formatHistoryStatus(h),
      ])
      ;(pdf as any).autoTable({
        head: [["Request date", "Prescription", "Patient", "Ward", "Bed", "Items", "Status"]],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 28 },
          2: { cellWidth: 38 },
          3: { cellWidth: 30 },
          4: { cellWidth: 18 },
          5: { cellWidth: 14 },
          6: { cellWidth: 22 },
        },
      })
      const filename = `Nurse_pickup_request_history_${format(new Date(), "yyyy-MM-dd")}.pdf`
      pdf.save(filename)
      toast({ title: "Success", description: `Exported ${myRequestHistory.length} row(s) to PDF.` })
    } catch (error: any) {
      console.error("Export PDF:", error)
      toast({ title: "Error", description: "Failed to export to PDF.", variant: "destructive" })
    } finally {
      setExporting(null)
    }
  }

  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      req.patientFirstName.toLowerCase().includes(q) ||
      req.patientLastName.toLowerCase().includes(q) ||
      req.patientNumber.toLowerCase().includes(q) ||
      req.admissionNumber.toLowerCase().includes(q) ||
      req.wardName.toLowerCase().includes(q) ||
      req.prescriptionNumber.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Nurse Pickup Requests
          </h2>
          <p className="text-muted-foreground">
            Request drugs from pharmacy for patients in your assigned wards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, ward, admission..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 w-[260px]"
            />
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      {hasAssignedWards === false && (
        <Card className="border-dashed border-amber-400 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-medium">No ward assignments found</p>
              <p className="text-sm text-muted-foreground">
                You are not currently assigned to any wards. Contact your
                supervisor or ward in-charge to assign you to wards before
                requesting drug pickups.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new">
            New request {requests.length > 0 ? `(${requests.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            My request history ({myRequestHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
            <Pill className="h-10 w-10 text-muted-foreground mb-1" />
            <p className="font-medium">No pickup-ready prescriptions</p>
            <p className="text-sm text-muted-foreground max-w-md">
              There are currently no admitted patients in your assigned wards
              with pending prescriptions that are ready for pickup requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(req => {
            const key = keyFor(req)
            const selectedSet = selectedItems.get(key) ?? new Set<number>()
            const allSelected =
              selectedSet.size > 0 &&
              selectedSet.size === req.items.length

            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">
                          {req.admissionNumber}
                        </Badge>
                        <span>{req.prescriptionNumber}</span>
                      </CardTitle>
                      <CardDescription>
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {req.patientFirstName} {req.patientLastName} (
                            {req.patientNumber})
                          </span>
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" />
                            {req.wardName}
                            {req.bedNumber
                              ? ` • Bed ${req.bedNumber}`
                              : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(req.prescriptionDate),
                              "PP"
                            )}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">
                        {req.items.length} item
                        {req.items.length === 1 ? "" : "s"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAllItems(req)}
                      >
                        {allSelected
                          ? "Clear selection"
                          : "Select all items"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {req.items.map(item => {
                      const selected = selectedSet.has(
                        item.prescriptionItemId
                      )
                      return (
                        <div
                          key={item.prescriptionItemId}
                          className={`flex items-start gap-3 p-2 rounded-md border ${
                            selected
                              ? "border-primary bg-primary/5"
                              : ""
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() =>
                              handleItemToggle(
                                key,
                                item.prescriptionItemId
                              )
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Pill className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {item.medicationName}
                              </span>
                            </div>
                            <div className="text-xs md:text-sm text-muted-foreground ml-6">
                              {[item.dosage, item.frequency, item.duration]
                                .filter(Boolean)
                                .join(" • ")}
                              {item.quantity
                                ? ` • Qty: ${item.quantity}`
                                : ""}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor={`notes-${key}`}
                      className="text-sm font-medium"
                    >
                      Notes to pharmacy (optional)
                    </Label>
                    <Textarea
                      id={`notes-${key}`}
                      rows={2}
                      placeholder="Add any special instructions or notes for pharmacy..."
                      value={notes.get(key) || ""}
                      onChange={e => {
                        const value = e.target.value
                        setNotes(prev => {
                          const next = new Map(prev)
                          if (value) {
                            next.set(key, value)
                          } else {
                            next.delete(key)
                          }
                          return next
                        })
                      }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleCreateRequest(req)}
                      disabled={
                        submittingForKey === key ||
                        selectedSet.size === 0
                      }
                    >
                      {submittingForKey === key ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending request...
                        </>
                      ) : (
                        "Send Pickup Request"
                      )}
                    </Button>
                  </div>
                </CardContent>
            </Card>
          )
        })}
        </div>
      )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    My request history
                  </CardTitle>
                  <CardDescription>
                    See status of your pickup requests. Pending = pharmacy has not yet dispensed. Picked up = you have collected the drugs.
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportHistoryExcel}
                    disabled={myRequestHistory.length === 0 || exporting !== null}
                  >
                    {exporting === "excel" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Export to Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportHistoryPDF}
                    disabled={myRequestHistory.length === 0 || exporting !== null}
                  >
                    {exporting === "pdf" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export to PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myRequestHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No pickup requests yet.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request date</TableHead>
                        <TableHead>Prescription</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Ward / Bed</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequestHistory.map((h: any) => (
                        <TableRow key={h.pickupId}>
                          <TableCell className="whitespace-nowrap">
                            {h.createdAt ? format(new Date(h.createdAt), "PPp") : "—"}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{h.prescriptionNumber}</span>
                          </TableCell>
                          <TableCell>
                            {h.patientFirstName} {h.patientLastName} ({h.patientNumber})
                          </TableCell>
                          <TableCell>
                            {h.wardName || "—"}
                            {h.bedNumber ? ` • Bed ${h.bedNumber}` : ""}
                          </TableCell>
                          <TableCell>{h.items?.length ?? 0} item(s)</TableCell>
                          <TableCell>
                            {h.status === "picked_up" ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Picked up
                              </Badge>
                            ) : h.status === "ready_for_pickup" ? (
                              <Badge variant="secondary" className="gap-1">
                                <Package className="h-3 w-3" />
                                Ready for pickup
                              </Badge>
                            ) : h.status === "cancelled" ? (
                              <Badge variant="secondary">Cancelled</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(h.status === "pending" || h.status === "ready_for_pickup") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={cancellingId === h.pickupId?.toString()}
                                onClick={() => handleCancelRequest(h.pickupId)}
                              >
                                {cancellingId === h.pickupId?.toString() ? "Cancelling…" : "Cancel request"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

