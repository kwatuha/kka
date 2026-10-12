"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Pill, CheckCircle, User, ArrowRightLeft } from "lucide-react"
import { pharmacyApi, patientApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"
import { Card, CardContent } from "@/components/ui/card"
import { MedicationCombobox } from "@/components/medication-combobox"

interface DispenseMedicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: number
  onDispensed?: () => void
}

interface PrescriptionItem {
  itemId: number
  prescriptionId: number
  medicationId: number | null
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  prescribedQuantity: number
  instructions: string | null
  status: string
  prescriptionNumber: string
  prescriptionDate: string
  drugInventoryId: number | null
  batchNumber: string | null
  expiryDate: string | null
  availableQuantity: number | null
  unitPrice: number | null
  totalPrice: number | null
  hasSubstitution?: boolean
  substitutionId?: number | null
  substitutionType?: string | null
  substitutionReason?: string | null
  prescribedMedicationId?: number | null
  prescribedMedicationName?: string | null
  dispensedMedicationId?: number | null
  dispensedMedicationName?: string | null
}

interface DispensingItem {
  prescriptionItem: PrescriptionItem
  quantityToDispense: number
  notes: string
}

const SUBSTITUTION_TYPES = [
  { value: "generic", label: "Generic equivalent" },
  { value: "therapeutic", label: "Therapeutic alternative" },
  { value: "stock_unavailable", label: "Prescribed item out of stock" },
  { value: "other", label: "Other (document reason)" },
] as const

export function DispenseMedicationDialog({
  open,
  onOpenChange,
  patientId,
  onDispensed,
}: DispenseMedicationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingPatient, setLoadingPatient] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([])
  const [dispensingItems, setDispensingItems] = useState<Map<number, DispensingItem>>(new Map())
  const [dispensing, setDispensing] = useState(false)
  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false)
  const [substituteTarget, setSubstituteTarget] = useState<PrescriptionItem | null>(null)
  const [substituteMedicationId, setSubstituteMedicationId] = useState("")
  const [substituteType, setSubstituteType] = useState<string>("stock_unavailable")
  const [substituteReason, setSubstituteReason] = useState("")
  const [substituteNotes, setSubstituteNotes] = useState("")
  const [substituting, setSubstituting] = useState(false)
  const { currentStoreId } = useFacilityUnits()

  useEffect(() => {
    if (open && patientId) {
      loadPatient()
      loadPrescriptionItems()
    }
  }, [open, patientId])

  const loadPatient = async () => {
    try {
      setLoadingPatient(true)
      const data = await patientApi.getById(patientId.toString())
      setPatient(data)
    } catch (error: any) {
      console.error("Error loading patient:", error)
    } finally {
      setLoadingPatient(false)
    }
  }

  const buildDispensingMap = (items: PrescriptionItem[]) => {
    const initialDispensing = new Map<number, DispensingItem>()
    for (const item of items) {
      if (item.drugInventoryId) {
        initialDispensing.set(item.itemId, {
          prescriptionItem: item,
          quantityToDispense: Math.min(
            item.prescribedQuantity,
            item.availableQuantity || item.prescribedQuantity,
          ),
          notes: "",
        })
      }
    }
    return initialDispensing
  }

  const loadPrescriptionItems = async () => {
    try {
      setLoading(true)
      const items = await pharmacyApi.getPaidPrescriptionItemsReadyForDispensing(patientId.toString())
      setPrescriptionItems(items || [])
      setDispensingItems(buildDispensingMap(items || []))
    } catch (error: any) {
      console.error("Error loading prescription items:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load prescription items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotesChange = (itemId: number, notes: string) => {
    const dispensingItem = dispensingItems.get(itemId)
    if (dispensingItem) {
      setDispensingItems(
        new Map(dispensingItems).set(itemId, {
          ...dispensingItem,
          notes,
        }),
      )
    }
  }

  const openSubstituteDialog = (item: PrescriptionItem) => {
    setSubstituteTarget(item)
    setSubstituteMedicationId("")
    setSubstituteType("stock_unavailable")
    setSubstituteReason("")
    setSubstituteNotes("")
    setSubstituteDialogOpen(true)
  }

  const handleSubstitute = async () => {
    if (!substituteTarget) return
    if (!substituteMedicationId) {
      toast({
        title: "Select a medication",
        description: "Choose the substitute medication to dispense.",
        variant: "destructive",
      })
      return
    }
    if (!substituteReason.trim()) {
      toast({
        title: "Reason required",
        description: "Document why the prescribed medication is being substituted.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubstituting(true)
      await pharmacyApi.substitutePrescriptionItem(substituteTarget.itemId.toString(), {
        dispensedMedicationId: Number(substituteMedicationId),
        substitutionType: substituteType as "generic" | "therapeutic" | "stock_unavailable" | "other",
        reason: substituteReason.trim(),
        notes: substituteNotes.trim() || undefined,
        storeId: currentStoreId || null,
      })
      toast({
        title: "Substitution recorded",
        description: `${substituteTarget.medicationName} will be dispensed as the selected alternative.`,
      })
      setSubstituteDialogOpen(false)
      setSubstituteTarget(null)
      await loadPrescriptionItems()
    } catch (error: any) {
      toast({
        title: "Substitution failed",
        description: error.message || "Could not record medication substitution",
        variant: "destructive",
      })
    } finally {
      setSubstituting(false)
    }
  }

  const handleDispense = async () => {
    for (const [, dispensingItem] of dispensingItems.entries()) {
      const item = dispensingItem.prescriptionItem

      if (!item.drugInventoryId) {
        toast({
          title: "Missing inventory batch",
          description: `No inventory batch found for ${item.medicationName}. Record a substitution or check stock.`,
          variant: "destructive",
        })
        return
      }

      if (dispensingItem.quantityToDispense > (item.availableQuantity || 0)) {
        toast({
          title: "Insufficient quantity",
          description: `Insufficient stock for ${item.medicationName}. Available: ${item.availableQuantity || 0}`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      setDispensing(true)

      const results = []
      for (const [itemId, dispensingItem] of dispensingItems.entries()) {
        const item = dispensingItem.prescriptionItem

        if (!item.drugInventoryId) {
          results.push({ itemId, success: false, error: "No drug inventory ID" })
          continue
        }

        try {
          await pharmacyApi.createDispensation({
            prescriptionItemId: itemId,
            drugInventoryId: item.drugInventoryId,
            quantityDispensed: dispensingItem.quantityToDispense,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate || null,
            notes: dispensingItem.notes || null,
            storeId: currentStoreId || null,
            substitutionId: item.substitutionId || null,
          })
          results.push({ itemId, success: true })
        } catch (error: any) {
          console.error(`Error dispensing item ${itemId}:`, error)
          results.push({ itemId, success: false, error: error.message })
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failCount = results.length - successCount

      if (results.length === 0) {
        toast({
          title: "No items to dispense",
          description: "No items were processed. Record substitutions for out-of-stock lines or check stock.",
          variant: "destructive",
        })
        return
      }

      if (successCount > 0) {
        toast({
          title: "Medications dispensed",
          description: `Successfully dispensed ${successCount} medication(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
        })
        onOpenChange(false)
        if (onDispensed) {
          onDispensed()
        }
      } else {
        toast({
          title: "Failed to dispense medications",
          description: `${failCount} medication(s) could not be dispensed. Please check and retry.`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error dispensing medications:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to dispense medications",
        variant: "destructive",
      })
    } finally {
      setDispensing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const substitutionTypeLabel = (value?: string | null) =>
    SUBSTITUTION_TYPES.find((t) => t.value === value)?.label || value || "Substitution"

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Dispense Medications
            </DialogTitle>
            <DialogDescription>
              Review and dispense paid prescription medications. Use substitute when a different medication must be given.
            </DialogDescription>
          </DialogHeader>

          {patient && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Patient Name</div>
                      <div className="font-semibold">
                        {patient.firstName} {patient.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Patient Number</div>
                      <div className="font-medium">{patient.patientNumber || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Age / Gender</div>
                      <div className="font-medium">
                        {patient.dateOfBirth && calculateAge(patient.dateOfBirth)
                          ? `${calculateAge(patient.dateOfBirth)} years`
                          : "N/A"}{" "}
                        {patient.gender ? ` / ${patient.gender}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Phone</div>
                      <div className="font-medium">{patient.phone || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading || loadingPatient ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                {loadingPatient ? "Loading patient details..." : "Loading prescription items..."}
              </span>
            </div>
          ) : prescriptionItems.length === 0 ? (
            <div className="py-8 text-center">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No paid prescription items ready for dispensing</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Prescribed</TableHead>
                      <TableHead>Batch / Expiry</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptionItems.map((item) => {
                      const dispensingItem = dispensingItems.get(item.itemId)
                      const canDispense = !!item.drugInventoryId && !!dispensingItem
                      return (
                        <TableRow key={item.itemId}>
                          <TableCell>
                            <div>
                              {item.hasSubstitution ? (
                                <>
                                  <div className="text-xs text-muted-foreground line-through">
                                    Prescribed: {item.prescribedMedicationName || item.medicationName}
                                  </div>
                                  <div className="font-medium">{item.dispensedMedicationName || item.medicationName}</div>
                                  <Badge variant="secondary" className="mt-1">
                                    {substitutionTypeLabel(item.substitutionType)}
                                  </Badge>
                                </>
                              ) : (
                                <div className="font-medium">{item.medicationName}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {item.dosage} - {item.frequency} - {item.duration}
                              </div>
                              {item.instructions && (
                                <div className="text-xs text-muted-foreground mt-1">{item.instructions}</div>
                              )}
                              {item.substitutionReason && (
                                <div className="text-xs text-amber-700 mt-1">Reason: {item.substitutionReason}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{item.prescribedQuantity}</div>
                            <div className="text-xs text-muted-foreground">
                              Prescription: {item.prescriptionNumber}
                            </div>
                          </TableCell>
                          <TableCell>
                            {canDispense ? (
                              <>
                                <div className="text-sm font-medium">{item.batchNumber || "N/A"}</div>
                                <div className="text-xs text-muted-foreground">
                                  Exp: {formatDate(item.expiryDate)}
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No batch selected</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{item.availableQuantity || 0}</div>
                          </TableCell>
                          <TableCell>
                            {canDispense ? (
                              <>
                                <div className="text-sm font-medium">{dispensingItem.quantityToDispense}</div>
                                {item.totalPrice && (
                                  <div className="text-xs text-muted-foreground">
                                    Paid: {formatCurrency(item.totalPrice)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canDispense ? (
                              <Textarea
                                value={dispensingItem.notes}
                                onChange={(e) => handleNotesChange(item.itemId, e.target.value)}
                                placeholder="Optional notes"
                                className="w-32 min-h-[60px]"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openSubstituteDialog(item)}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                              Substitute
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={dispensing}>
              Cancel
            </Button>
            <Button
              onClick={handleDispense}
              disabled={dispensing || dispensingItems.size === 0}
            >
              {dispensing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dispensing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dispense Medications
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={substituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Substitute medication</DialogTitle>
            <DialogDescription>
              {substituteTarget
                ? `Replace "${substituteTarget.hasSubstitution ? substituteTarget.prescribedMedicationName : substituteTarget.medicationName}" with an in-stock alternative. This is recorded in the audit trail.`
                : "Select an alternative medication with documented reason."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Substitute medication</Label>
              <MedicationCombobox
                value={substituteMedicationId}
                onValueChange={setSubstituteMedicationId}
                placeholder="Search substitute medication..."
                allowCreate={false}
              />
            </div>

            <div className="space-y-2">
              <Label>Substitution type</Label>
              <Select value={substituteType} onValueChange={setSubstituteType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSTITUTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                value={substituteReason}
                onChange={(e) => setSubstituteReason(e.target.value)}
                placeholder="e.g. Prescribed brand out of stock; dispensing available generic equivalent"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional notes (optional)</Label>
              <Textarea
                value={substituteNotes}
                onChange={(e) => setSubstituteNotes(e.target.value)}
                placeholder="Any extra context for the audit log"
                className="min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubstituteDialogOpen(false)} disabled={substituting}>
              Cancel
            </Button>
            <Button onClick={handleSubstitute} disabled={substituting}>
              {substituting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Record substitution"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
