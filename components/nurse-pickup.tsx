"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Package,
  CheckCircle2,
  Loader2,
  Eye,
  History,
  User,
  Users,
  Calendar,
  FileText,
  Pill,
  AlertCircle,
  Clock,
  Inbox,
  ArrowRightCircle,
  XCircle
} from "lucide-react"
import Link from "next/link"
import { pharmacyApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export function NursePickup() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [readyPrescriptions, setReadyPrescriptions] = useState<any[]>([])
  const [pickupHistory, setPickupHistory] = useState<any[]>([])
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Set<string>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Map<string, Set<string>>>(new Map())
  const [pickupNotes, setPickupNotes] = useState<Map<string, string>>(new Map())
  const [creatingPickup, setCreatingPickup] = useState(false)
  const [viewPickupDialogOpen, setViewPickupDialogOpen] = useState(false)
  const [selectedPickup, setSelectedPickup] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("ready")
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingDetailsOpen, setPendingDetailsOpen] = useState(false)
  const [selectedPendingRequest, setSelectedPendingRequest] = useState<any>(null)
  const [dispensingPickupId, setDispensingPickupId] = useState<string | null>(null)
  const [cancelPickupId, setCancelPickupId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadReadyPrescriptions()
    loadPickupHistory()
    loadPendingRequests()
  }, [])

  const loadPendingRequests = async () => {
    try {
      setPendingLoading(true)
      const data = await pharmacyApi.getNursePickups({ status: "pending", limit: 100 })
      setPendingRequests(data?.pickups || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load pending requests",
        variant: "destructive",
      })
    } finally {
      setPendingLoading(false)
    }
  }

  const loadReadyPrescriptions = async () => {
    try {
      setLoading(true)
      const data = await pharmacyApi.getPrescriptionsReadyForPickup()
      setReadyPrescriptions(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load prescriptions ready for pickup",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPickup = async (pickupId: string) => {
    try {
      setCancelling(true)
      await pharmacyApi.cancelNursePickup(pickupId)
      toast({ title: "Cancelled", description: "Pickup has been cancelled. If it was already picked up, quantities were returned to inventory." })
      setCancelPickupId(null)
      await Promise.all([loadPickupHistory(), loadReadyPrescriptions(), loadPendingRequests()])
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to cancel pickup", variant: "destructive" })
    } finally {
      setCancelling(false)
    }
  }

  const markAsDispensed = async (pickupId: string) => {
    try {
      setDispensingPickupId(pickupId)
      await pharmacyApi.markNursePickupReadyForPickup(pickupId)
      toast({ title: "Updated", description: "Request moved to history (ready for pickup)." })
      setPendingDetailsOpen(false)
      setSelectedPendingRequest(null)
      await Promise.all([loadPendingRequests(), loadPickupHistory(), loadReadyPrescriptions()])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update request",
        variant: "destructive",
      })
    } finally {
      setDispensingPickupId(null)
    }
  }

  const loadPickupHistory = async () => {
    try {
      // Load all pickups (not filtered by nurse) so we can see all pickup history
      // If you want to filter by current nurse, uncomment the nurseId line
      const data = await pharmacyApi.getNursePickups({
        // nurseId: user?.id?.toString() || user?.userId?.toString(),
        limit: 50
      })
      setPickupHistory(data?.pickups || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load pickup history",
        variant: "destructive",
      })
    }
  }

  const handlePrescriptionToggle = (prescriptionId: string) => {
    const newSelected = new Set(selectedPrescriptions)
    if (newSelected.has(prescriptionId)) {
      newSelected.delete(prescriptionId)
      // Remove all items for this prescription
      const newSelectedItems = new Map(selectedItems)
      newSelectedItems.delete(prescriptionId)
      setSelectedItems(newSelectedItems)
    } else {
      newSelected.add(prescriptionId)
      // Select all items for this prescription
      const prescription = readyPrescriptions.find(p => p.prescriptionId === prescriptionId)
      if (prescription?.items) {
        const newSelectedItems = new Map(selectedItems)
        const itemIds = new Set(prescription.items.map((item: any) => item.itemId.toString()))
        newSelectedItems.set(prescriptionId, itemIds)
        setSelectedItems(newSelectedItems)
      }
    }
    setSelectedPrescriptions(newSelected)
  }

  const handleItemToggle = (prescriptionId: string, itemId: string) => {
    const newSelectedItems = new Map(selectedItems)
    const itemSet = newSelectedItems.get(prescriptionId) || new Set<string>()

    if (itemSet.has(itemId)) {
      itemSet.delete(itemId)
    } else {
      itemSet.add(itemId)
    }

    if (itemSet.size === 0) {
      newSelectedItems.delete(prescriptionId)
      const newSelected = new Set(selectedPrescriptions)
      newSelected.delete(prescriptionId)
      setSelectedPrescriptions(newSelected)
    } else {
      newSelectedItems.set(prescriptionId, itemSet)
      if (!selectedPrescriptions.has(prescriptionId)) {
        const newSelected = new Set(selectedPrescriptions)
        newSelected.add(prescriptionId)
        setSelectedPrescriptions(newSelected)
      }
    }

    setSelectedItems(newSelectedItems)
  }

  const handleCreatePickup = async () => {
    if (selectedPrescriptions.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one prescription to pick up",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingPickup(true)

      const pickups = Array.from(selectedPrescriptions).map(prescriptionId => {
        const prescription = readyPrescriptions.find(p => p.prescriptionId.toString() === prescriptionId)
        const itemSet = selectedItems.get(prescriptionId) || new Set<string>()

        return {
          prescriptionId: prescriptionId,
          admissionId: prescription?.admissionId?.toString(),
          items: prescription?.items
            .filter((item: any) => itemSet.has(item.itemId.toString()))
            .map((item: any) => ({
              prescriptionItemId: item.itemId.toString(),
              dispensationId: item.dispensationId?.toString(),
              quantityPickedUp: item.quantityDispensed || item.quantity || 1,
              notes: "",
            })) || [],
          notes: pickupNotes.get(prescriptionId) || "",
        }
      }).filter(pickup => pickup.items.length > 0)

      if (pickups.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one item to pick up",
          variant: "destructive",
        })
        setCreatingPickup(false)
        return
      }

      await pharmacyApi.createNursePickup({ pickups })

      toast({
        title: "Success",
        description: `Successfully recorded pickup for ${pickups.length} prescription(s)`,
      })

      // Reset selections
      setSelectedPrescriptions(new Set())
      setSelectedItems(new Map())
      setPickupNotes(new Map())

      // Reload data
      await loadReadyPrescriptions()
      await loadPickupHistory()
      await loadPendingRequests()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create pickup record",
        variant: "destructive",
      })
    } finally {
      setCreatingPickup(false)
    }
  }

  const handleViewPickup = async (pickupId: string) => {
    try {
      const pickup = await pharmacyApi.getNursePickup(pickupId)
      setSelectedPickup(pickup)
      setViewPickupDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load pickup details",
        variant: "destructive",
      })
    }
  }

  const filteredReadyPrescriptions = readyPrescriptions.filter(p => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.prescriptionNumber?.toLowerCase().includes(query) ||
      p.patientFirstName?.toLowerCase().includes(query) ||
      p.patientLastName?.toLowerCase().includes(query) ||
      p.patientNumber?.toLowerCase().includes(query) ||
      p.admissionNumber?.toLowerCase().includes(query) ||
      p.medicationNames?.toLowerCase().includes(query)
    )
  })

  const filteredPickupHistory = pickupHistory.filter(p => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.prescriptionNumber?.toLowerCase().includes(query) ||
      p.patientFirstName?.toLowerCase().includes(query) ||
      p.patientLastName?.toLowerCase().includes(query) ||
      p.patientNumber?.toLowerCase().includes(query) ||
      p.admissionNumber?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nurse Drug Pickup</h2>
          <p className="text-muted-foreground">Pick up drugs for admitted patients</p>
        </div>
        {selectedPrescriptions.size > 0 && (
          <Button
            onClick={handleCreatePickup}
            disabled={creatingPickup}
            className="gap-2"
          >
            {creatingPickup ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording Pickup...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Record Pickup ({selectedPrescriptions.size})
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Inbox className="h-4 w-4 mr-1" />
            Pending requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready for Pickup ({readyPrescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Pickup History ({pickupHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending requests from nurses
              </CardTitle>
              <CardDescription>
                Nurses have requested these prescriptions. Dispense the prescription (Prescriptions tab or Dispense flow), then go to &quot;Ready for Pickup&quot; to record when the nurse collects the drugs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No pending requests from nurses.</p>
              ) : (
                <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Requested by (nurse)</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((p: any) => (
                        <TableRow key={p.pickupId}>
                          <TableCell className="whitespace-nowrap">
                            {p.createdAt ? format(new Date(p.createdAt), "PPp") : "—"}
                          </TableCell>
                          <TableCell>
                            {p.patientFirstName} {p.patientLastName} ({p.patientNumber})
                          </TableCell>
                          <TableCell>
                            {p.nurseFirstName} {p.nurseLastName}
                            {p.nurseUsername ? ` (@${p.nurseUsername})` : ""}
                          </TableCell>
                          <TableCell>{p.itemCount ?? p.items?.length ?? 0} item(s)</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPendingRequest(p)
                                  setPendingDetailsOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={dispensingPickupId === p.pickupId?.toString()}
                                onClick={() => markAsDispensed(p.pickupId?.toString() ?? "")}
                              >
                                {dispensingPickupId === p.pickupId?.toString() ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                )}
                                Mark dispensed
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/pharmacy?tab=prescriptions&prescriptionId=${p.prescriptionId}`}>
                                  Open prescription
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Dialog open={pendingDetailsOpen} onOpenChange={setPendingDetailsOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Request details</DialogTitle>
                      <DialogDescription>
                        {selectedPendingRequest && (
                          <>
                            {selectedPendingRequest.patientFirstName} {selectedPendingRequest.patientLastName} •{" "}
                            {selectedPendingRequest.prescriptionNumber} •{" "}
                            {selectedPendingRequest.createdAt
                              ? format(new Date(selectedPendingRequest.createdAt), "PPp")
                              : ""}
                          </>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    {selectedPendingRequest && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Patient</div>
                          <div>
                            {selectedPendingRequest.patientFirstName} {selectedPendingRequest.patientLastName} (
                            {selectedPendingRequest.patientNumber})
                          </div>
                          <div className="text-muted-foreground">Prescription</div>
                          <div>{selectedPendingRequest.prescriptionNumber}</div>
                          <div className="text-muted-foreground">Admission</div>
                          <div>{selectedPendingRequest.admissionNumber || "—"}</div>
                          <div className="text-muted-foreground">Requested by</div>
                          <div>
                            {selectedPendingRequest.nurseFirstName} {selectedPendingRequest.nurseLastName}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Requested items</h4>
                          <ul className="rounded-md border divide-y text-sm">
                            {(selectedPendingRequest.items || []).length === 0 ? (
                              <li className="p-3 text-muted-foreground">No items</li>
                            ) : (
                              (selectedPendingRequest.items || []).map((item: any, idx: number) => (
                                <li key={item.pickupItemId ?? idx} className="p-3 flex items-center gap-2">
                                  <Pill className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div>
                                    <span className="font-medium">{item.medicationName || "—"}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" • ")}
                                      {item.quantityPickedUp != null ? ` • Qty: ${item.quantityPickedUp}` : ""}
                                    </span>
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                        {selectedPendingRequest.notes && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Notes from nurse</h4>
                            <p className="text-sm text-muted-foreground rounded-md border p-3 bg-muted/30">
                              {selectedPendingRequest.notes}
                            </p>
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            size="sm"
                            disabled={dispensingPickupId === selectedPendingRequest.pickupId?.toString()}
                            onClick={() => markAsDispensed(selectedPendingRequest.pickupId?.toString() ?? "")}
                          >
                            {dispensingPickupId === selectedPendingRequest.pickupId?.toString() ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            Mark dispensed
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/pharmacy?tab=prescriptions&prescriptionId=${selectedPendingRequest.prescriptionId}`}
                              onClick={() => setPendingDetailsOpen(false)}
                            >
                              Open prescription
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Prescriptions Ready for Pickup</CardTitle>
                  <CardDescription>
                    Select prescriptions to record pickup for admitted patients
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search prescriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReadyPrescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No prescriptions ready for pickup</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReadyPrescriptions.map((prescription) => {
                    const isSelected = selectedPrescriptions.has(prescription.prescriptionId.toString())
                    const selectedItemSet = selectedItems.get(prescription.prescriptionId.toString()) || new Set<string>()

                    return (
                      <Card key={prescription.prescriptionId} className={isSelected ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handlePrescriptionToggle(prescription.prescriptionId.toString())}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">{prescription.prescriptionNumber}</span>
                                    <Badge variant="outline">{prescription.pendingPickupItems} items</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {prescription.patientFirstName} {prescription.patientLastName}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(prescription.prescriptionDate), "PP")}
                                    </div>
                                    {prescription.admissionNumber && (
                                      <Badge variant="secondary">Admission: {prescription.admissionNumber}</Badge>
                                    )}
                                  </div>
                                  {prescription.requestingNurses?.length > 0 && (
                                    <div className="flex items-center gap-1 text-sm mt-1">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Requested by:</span>
                                      <span>
                                        {prescription.requestingNurses.map((n: any) => `${n.nurseFirstName} ${n.nurseLastName}${n.nurseUsername ? ` (@${n.nurseUsername})` : ""}`).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right text-sm">
                                  <div className="text-muted-foreground">Doctor</div>
                                  <div>{prescription.doctorFirstName} {prescription.doctorLastName}</div>
                                </div>
                              </div>

                              {isSelected && prescription.items && prescription.items.length > 0 && (
                                <div className="mt-4 space-y-2 border-t pt-3">
                                  <Label className="text-sm font-medium">Select Items to Pick Up:</Label>
                                  <div className="space-y-2">
                                    {prescription.items.map((item: any) => {
                                      const itemSelected = selectedItemSet.has(item.itemId.toString())
                                      return (
                                        <div
                                          key={item.itemId}
                                          className={`flex items-center gap-3 p-2 rounded-md border ${
                                            itemSelected ? "bg-primary/5 border-primary" : ""
                                          }`}
                                        >
                                          <Checkbox
                                            checked={itemSelected}
                                            onCheckedChange={() => handleItemToggle(prescription.prescriptionId.toString(), item.itemId.toString())}
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <Pill className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium">{item.medicationName}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground ml-6">
                                              {item.dosage} • {item.frequency} • {item.duration}
                                              {item.batchNumber && ` • Batch: ${item.batchNumber}`}
                                              {item.quantityDispensed && ` • Qty: ${item.quantityDispensed}`}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div className="mt-2">
                                    <Label htmlFor={`notes-${prescription.prescriptionId}`} className="text-sm">
                                      Notes (optional)
                                    </Label>
                                    <Textarea
                                      id={`notes-${prescription.prescriptionId}`}
                                      placeholder="Add notes for this pickup..."
                                      value={pickupNotes.get(prescription.prescriptionId.toString()) || ""}
                                      onChange={(e) => {
                                        const newNotes = new Map(pickupNotes)
                                        newNotes.set(prescription.prescriptionId.toString(), e.target.value)
                                        setPickupNotes(newNotes)
                                      }}
                                      rows={2}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pickup History</CardTitle>
                  <CardDescription>View history of drug pickups</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[300px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPickupHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pickup history found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pickup Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Prescription</TableHead>
                      <TableHead>Admission</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nurse</TableHead>
                      <TableHead>Pharmacist</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPickupHistory.map((pickup) => (
                      <TableRow key={pickup.pickupId}>
                        <TableCell>
                          {format(new Date(pickup.pickupDate), "PPp")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {pickup.patientFirstName} {pickup.patientLastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {pickup.patientNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pickup.prescriptionNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(pickup.prescriptionDate), "PP")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pickup.admissionNumber ? (
                            <Badge variant="secondary">{pickup.admissionNumber}</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pickup.itemCount} items</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pickup.status === "picked_up" ? "default" : "secondary"}>
                            {pickup.status === "ready_for_pickup" ? "Ready for pickup" : pickup.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pickup.nurseFirstName} {pickup.nurseLastName}
                          {pickup.nurseUsername ? ` (@${pickup.nurseUsername})` : ""}
                        </TableCell>
                        <TableCell>
                          {pickup.pharmacistFirstName != null ? (
                            <span>{pickup.pharmacistFirstName} {pickup.pharmacistLastName}{pickup.pharmacistUsername ? ` (@${pickup.pharmacistUsername})` : ""}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPickup(pickup.pickupId.toString())}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(pickup.status === "picked_up" || pickup.status === "ready_for_pickup") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setCancelPickupId(pickup.pickupId.toString())}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={cancelPickupId != null} onOpenChange={(open) => !open && setCancelPickupId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel pickup</AlertDialogTitle>
          <AlertDialogDescription>
            Cancel this nurse pickup? If it was already recorded as picked up, the drug quantities will be returned to inventory and the prescription status reverted to dispensed.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (cancelPickupId) handleCancelPickup(cancelPickupId)
              }}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel pickup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Pickup Dialog */}
      <Dialog open={viewPickupDialogOpen} onOpenChange={setViewPickupDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pickup Details</DialogTitle>
            <DialogDescription>
              View detailed information about this drug pickup
            </DialogDescription>
          </DialogHeader>
          {selectedPickup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Pickup Date</Label>
                  <p>{format(new Date(selectedPickup.pickupDate), "PPp")}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <p>
                    <Badge variant={selectedPickup.status === 'picked_up' ? 'default' : 'secondary'}>
                      {selectedPickup.status === 'ready_for_pickup' ? 'Ready for pickup' : selectedPickup.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Patient</Label>
                  <p>
                    {selectedPickup.patientFirstName} {selectedPickup.patientLastName}
                    <span className="text-muted-foreground ml-2">({selectedPickup.patientNumber})</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Prescription</Label>
                  <p>{selectedPickup.prescriptionNumber}</p>
                </div>
                {selectedPickup.admissionNumber && (
                  <div>
                    <Label className="text-sm font-semibold">Admission</Label>
                    <p><Badge variant="secondary">{selectedPickup.admissionNumber}</Badge></p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Nurse</Label>
                  <p>
                    {selectedPickup.nurseFirstName} {selectedPickup.nurseLastName}
                    {selectedPickup.nurseUsername ? ` (@${selectedPickup.nurseUsername})` : ""}
                  </p>
                </div>
                {(selectedPickup.pharmacistFirstName != null || selectedPickup.pharmacistLastName != null) && (
                  <div>
                    <Label className="text-sm font-semibold">Issuing Pharmacist</Label>
                    <p>
                      {selectedPickup.pharmacistFirstName} {selectedPickup.pharmacistLastName}
                      {selectedPickup.pharmacistUsername ? ` (@${selectedPickup.pharmacistUsername})` : ""}
                    </p>
                  </div>
                )}
              </div>

              {selectedPickup.items && selectedPickup.items.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Items Picked Up</Label>
                  <div className="space-y-2">
                    {selectedPickup.items.map((item: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{item.medicationName}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.dosage} • {item.frequency} • {item.duration}
                              </div>
                              {item.batchNumber && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Batch: {item.batchNumber}
                                  {item.expiryDate && ` • Expires: ${format(new Date(item.expiryDate), "PP")}`}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline">
                              Qty: {item.quantityPickedUp}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedPickup.notes && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Notes</Label>
                  <p className="text-sm p-3 bg-muted rounded-md">{selectedPickup.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
