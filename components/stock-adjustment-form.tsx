"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Minus } from "lucide-react"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface StockAdjustmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  drugInventoryId?: number
  medicationId?: number
  initialLocation?: string
  initialMedicationName?: string
}

interface DrugInventoryItem {
  drugInventoryId: number
  medicationId: number
  batchNumber: string
  quantity: number
  unitPrice: number
  sellPrice: number
  manufactureDate?: string
  expiryDate?: string
  location?: string
}

export function StockAdjustmentForm({
  open,
  onOpenChange,
  onSuccess,
  drugInventoryId: initialDrugInventoryId,
  medicationId: initialMedicationId,
  initialLocation,
  initialMedicationName,
}: StockAdjustmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [drugInventories, setDrugInventories] = useState<DrugInventoryItem[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [stores, setStores] = useState<any[]>([])
  const [loadingStores, setLoadingStores] = useState(false)

  // Form state
  const [selectedDrugInventoryId, setSelectedDrugInventoryId] = useState<string>(
    initialDrugInventoryId?.toString() || ""
  )
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>(
    initialMedicationId?.toString() || ""
  )
  const [adjustmentType, setAdjustmentType] = useState<string>("ADJUSTMENT")
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [quantity, setQuantity] = useState<string>("")
  const [batchNumber, setBatchNumber] = useState("")
  const [unitPrice, setUnitPrice] = useState<string>("")
  const [sellPrice, setSellPrice] = useState<string>("")
  const [manufactureDate, setManufactureDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [minPrice, setMinPrice] = useState<string>("")
  const [location, setLocation] = useState(initialLocation || "")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")

  // Load medications and drug inventories
  useEffect(() => {
    if (open) {
      loadMedications()
      loadStores()
      
      // If opened from drug inventory item (has initialDrugInventoryId and initialMedicationId)
      if (initialMedicationId && initialDrugInventoryId) {
        // Set medication ID immediately
        setSelectedMedicationId(initialMedicationId.toString())
        // Load inventories for this medication, then auto-select the batch
        loadDrugInventories(initialMedicationId.toString()).then((inventories) => {
          // After inventories load, auto-select the batch
          if (inventories && inventories.length > 0) {
            setSelectedDrugInventoryId(initialDrugInventoryId.toString())
          }
        })
      } else if (initialMedicationId) {
        // Only medication ID provided
        setSelectedMedicationId(initialMedicationId.toString())
        loadDrugInventories(initialMedicationId.toString())
      } else if (selectedMedicationId && selectedMedicationId !== "all" && !initialDrugInventoryId) {
        // Manual medication selection (not from drug inventory item)
        loadDrugInventories(selectedMedicationId)
      }
      
      // Pre-populate location if provided
      if (initialLocation) {
        setLocation(initialLocation)
      }
    } else {
      // Reset form when closed
      resetForm()
    }
  }, [open, initialMedicationId, initialDrugInventoryId, initialLocation])

  // Load selected drug inventory details and auto-populate all fields
  useEffect(() => {
    // Ensure batch is auto-selected when inventories load (for opened from drug inventory item)
    if (initialDrugInventoryId && drugInventories.length > 0 && selectedDrugInventoryId !== initialDrugInventoryId.toString()) {
      const batchExists = drugInventories.some(
        (di) => di.drugInventoryId.toString() === initialDrugInventoryId.toString()
      )
      if (batchExists) {
        setSelectedDrugInventoryId(initialDrugInventoryId.toString())
        return // Exit early, let the next effect handle population
      }
    }
    
    if (selectedDrugInventoryId && drugInventories.length > 0) {
      const selected = drugInventories.find(
        (di) => di.drugInventoryId.toString() === selectedDrugInventoryId
      )
      if (selected) {
        console.log('StockAdjustmentForm: Selected batch data', selected)
        
        // Auto-populate all fields from the selected batch
        // Handle both camelCase and snake_case field names from API
        const batchNum = selected.batchNumber || selected.batch_number || ''
        const medId = selected.medicationId || selected.medication_id
        const unitP = selected.unitPrice || selected.unit_price || 0
        const sellP = selected.sellPrice || selected.sell_price || 0
        const manufDate = selected.manufactureDate || selected.manufacture_date || null
        const expDate = selected.expiryDate || selected.expiry_date || null
        const loc = selected.location || null
        
        // Always set batch number
        setBatchNumber(batchNum)
        
        // Always set medication ID
        if (medId) {
          setSelectedMedicationId(medId.toString())
        }
        
        // Price fields - always set (even if 0)
        setUnitPrice(unitP.toString())
        setSellPrice(sellP.toString())
        
        // Date fields
        if (manufDate) {
          try {
            const mDate = new Date(manufDate)
            if (!isNaN(mDate.getTime())) {
              setManufactureDate(mDate.toISOString().split("T")[0])
            }
          } catch (e) {
            console.error('Error parsing manufacture date:', e)
          }
        }
        
        if (expDate) {
          try {
            const eDate = new Date(expDate)
            if (!isNaN(eDate.getTime())) {
              setExpiryDate(eDate.toISOString().split("T")[0])
            } else {
              // Try parsing as string if date object fails
              setExpiryDate(expDate.split("T")[0])
            }
          } catch (e) {
            // If date parsing fails, try string split
            setExpiryDate(expDate.split("T")[0])
          }
        }
        
        // Location - only set if not already provided via initialLocation
        if (!initialLocation && loc) {
          setLocation(loc)
        } else if (initialLocation) {
          setLocation(initialLocation)
        }
        
        console.log('StockAdjustmentForm: Pre-filled values', {
          batchNumber: batchNum,
          medicationId: medId,
          unitPrice: unitP,
          sellPrice: sellP,
          manufactureDate: manufDate,
          expiryDate: expDate,
          location: loc || initialLocation
        })
      }
    } else if (!selectedDrugInventoryId) {
      // Clear fields when no batch is selected
      setBatchNumber("")
      setUnitPrice("")
      setSellPrice("")
      setManufactureDate("")
      setExpiryDate("")
    }
  }, [selectedDrugInventoryId, drugInventories, initialLocation])

  const loadMedications = async () => {
    try {
      setLoadingData(true)
      const data = await pharmacyApi.getMedications(undefined, 1, 100)
      setMedications(data || [])
    } catch (err: any) {
      console.error("Error loading medications:", err)
      toast({
        title: "Error",
        description: "Failed to load medications",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  const loadDrugInventories = async (medId: string) => {
    try {
      const data = await pharmacyApi.getDrugInventory(medId)
      setDrugInventories(Array.isArray(data) ? data : [])
      
      // If we have an initialDrugInventoryId, auto-select it after loading
      if (initialDrugInventoryId && !selectedDrugInventoryId) {
        setSelectedDrugInventoryId(initialDrugInventoryId.toString())
      }
      
      return data
    } catch (err: any) {
      console.error("Error loading drug inventories:", err)
      return []
    }
  }

  const loadStores = async () => {
    try {
      setLoadingStores(true)
      const data = await pharmacyApi.getDrugStores(undefined, undefined, 'true')
      setStores(data || [])
    } catch (error: any) {
      console.error('Error loading stores:', error)
      setStores([])
    } finally {
      setLoadingStores(false)
    }
  }

  const resetForm = () => {
    setSelectedDrugInventoryId(initialDrugInventoryId?.toString() || "")
    setSelectedMedicationId(initialMedicationId?.toString() || "all")
    setAdjustmentType("ADJUSTMENT")
    setAdjustmentDate(new Date().toISOString().split("T")[0])
    setQuantity("")
    setBatchNumber("")
    setUnitPrice("")
    setSellPrice("")
    setManufactureDate("")
    setExpiryDate("")
    setMinPrice("")
    setLocation(initialLocation || "")
    setReferenceNumber("")
    setNotes("")
  }

  const handleMedicationChange = (medId: string) => {
    setSelectedMedicationId(medId)
    setSelectedDrugInventoryId("")
    if (medId && medId !== "all") {
      loadDrugInventories(medId)
    } else {
      setDrugInventories([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMedicationId || selectedMedicationId === "all") {
      toast({
        title: "Error",
        description: "Please select a medication",
        variant: "destructive",
      })
      return
    }

    // For RECEIPT adjustments, drugInventoryId is optional (can create new batch)
    // For all other adjustments, drugInventoryId is required
    if (adjustmentType !== "RECEIPT" && !selectedDrugInventoryId) {
      toast({
        title: "Error",
        description: "Please select a drug inventory batch",
        variant: "destructive",
      })
      return
    }

    if (!adjustmentType || !adjustmentDate || !quantity) {
      toast({
        title: "Error",
        description: "Adjustment type, date, and quantity are required",
        variant: "destructive",
      })
      return
    }

    if (adjustmentType === "RECEIPT" && !batchNumber) {
      toast({
        title: "Error",
        description: "Batch number is required for receipt adjustments",
        variant: "destructive",
      })
      return
    }

    // For TRANSFER, location (to store) is required
    if (adjustmentType === "TRANSFER" && !location) {
      toast({
        title: "Error",
        description: "Please select a destination store for transfer",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const adjustmentData: any = {
        medicationId: parseInt(selectedMedicationId),
        adjustmentType,
        adjustmentDate,
        quantity: Math.abs(parseInt(quantity)), // Always positive, API handles sign based on type
        batchNumber: batchNumber || undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice) : undefined,
        sellPrice: sellPrice ? parseFloat(sellPrice) : undefined,
        manufactureDate: manufactureDate || undefined,
        expiryDate: expiryDate || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        location: location || undefined,
        referenceType: adjustmentType === "RECEIPT" ? "purchase_order" : "adjustment",
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      }

      // For non-RECEIPT adjustments, include drugInventoryId
      if (adjustmentType !== "RECEIPT" && selectedDrugInventoryId) {
        adjustmentData.drugInventoryId = parseInt(selectedDrugInventoryId)
      } else if (adjustmentType === "RECEIPT" && selectedDrugInventoryId) {
        // For RECEIPT, if batch is selected, use it; otherwise create new
        adjustmentData.drugInventoryId = parseInt(selectedDrugInventoryId)
      }

      await pharmacyApi.createStockAdjustment(adjustmentData)

      toast({
        title: "Success",
        description: "Stock adjustment created successfully",
      })

      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (err: any) {
      console.error("Error creating stock adjustment:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to create stock adjustment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getQuantityLabel = () => {
    switch (adjustmentType) {
      case "RECEIPT":
        return "Quantity to Add"
      case "DISPENSATION":
        return "Quantity to Dispense"
      case "EXPIRY":
      case "DAMAGE":
        return "Quantity to Remove"
      case "ADJUSTMENT":
      case "CORRECTION":
        return "Quantity Adjustment (can be positive or negative)"
      default:
        return "Quantity"
    }
  }

  const isQuantityPositive = () => {
    return ["RECEIPT", "ADJUSTMENT", "CORRECTION"].includes(adjustmentType)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Record a stock movement: receipt, adjustment, expiry, damage, or transfer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adjustmentType">Adjustment Type *</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIPT">Receipt (New Stock Entry)</SelectItem>
                  <SelectItem value="DISPENSATION">Dispensation (Remove Stock)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="CORRECTION">Correction</SelectItem>
                  <SelectItem value="EXPIRY">Expiry (Remove Stock)</SelectItem>
                  <SelectItem value="DAMAGE">Damage (Remove Stock)</SelectItem>
                  <SelectItem value="TRANSFER">Transfer (Between Stores)</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustmentDate">Adjustment Date *</Label>
              <Input
                id="adjustmentDate"
                type="date"
                value={adjustmentDate}
                onChange={(e) => setAdjustmentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* For RECEIPT - New stock entry flow */}
          {adjustmentType === "RECEIPT" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medication">Medication *</Label>
                  <Select
                    value={selectedMedicationId}
                    onValueChange={handleMedicationChange}
                    disabled={!!initialMedicationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medication" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select medication</SelectItem>
                      {medications.map((med) => (
                        <SelectItem key={med.medicationId} value={med.medicationId.toString()}>
                          {med.name || med.medicationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number *</Label>
                  <Input
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Enter batch number"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            /* For all other adjustments - Select existing batch */
            <>
              {/* If opened from drug inventory item, show read-only fields */}
              {initialDrugInventoryId && initialMedicationId ? (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Medication</Label>
                    <Input
                      value={initialMedicationName || medications.find(m => m.medicationId?.toString() === selectedMedicationId)?.name || "Loading..."}
                      disabled
                      className="bg-background font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Batch Number</Label>
                    <Input
                      value={batchNumber || "Loading..."}
                      disabled
                      className="bg-background font-medium"
                    />
                  </div>
                </div>
              ) : (
                /* Otherwise show dropdowns for selection */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medication">Medication *</Label>
                    <Select
                      value={selectedMedicationId}
                      onValueChange={handleMedicationChange}
                      disabled={!!initialMedicationId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={initialMedicationName || "Select medication"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select medication</SelectItem>
                        {medications.map((med) => (
                          <SelectItem key={med.medicationId} value={med.medicationId.toString()}>
                            {med.name || med.medicationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch">Drug Inventory Batch *</Label>
                    {loadingData ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <Select
                        value={selectedDrugInventoryId}
                        onValueChange={setSelectedDrugInventoryId}
                        disabled={!selectedMedicationId || selectedMedicationId === "all"}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {drugInventories.length > 0 ? (
                            drugInventories.map((di) => (
                              <SelectItem key={di.drugInventoryId} value={di.drugInventoryId.toString()}>
                                {di.batchNumber} (Qty: {di.quantity}{di.expiryDate ? `, Exp: ${new Date(di.expiryDate).toLocaleDateString()}` : ''})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No batches available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedDrugInventoryId && drugInventories.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Current quantity:{" "}
                        {
                          drugInventories.find(
                            (di) => di.drugInventoryId.toString() === selectedDrugInventoryId
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Auto-populated batch details (read-only) - only for non-RECEIPT adjustments */}
              {selectedDrugInventoryId && adjustmentType !== "RECEIPT" && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm">Batch Details (from selected inventory)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Batch Number</Label>
                      <Input
                        value={batchNumber}
                        disabled
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Manufacture Date</Label>
                      <Input
                        type="date"
                        value={manufactureDate}
                        disabled
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                      <Input
                        type="date"
                        value={expiryDate}
                        disabled
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Buy Price (Unit Price)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        disabled
                        className="bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Sell Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={sellPrice}
                        disabled
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Transfer-specific fields */}
          {adjustmentType === "TRANSFER" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="fromLocation">From Store/Location</Label>
                <Input
                  id="fromLocation"
                  value={location || "Current location"}
                  disabled
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toLocation">To Store/Location *</Label>
                {loadingStores ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : stores.length > 0 ? (
                  <Select
                    value={location || undefined}
                    onValueChange={(value) => setLocation(value)}
                    required
                  >
                    <SelectTrigger id="toLocation">
                      <SelectValue placeholder="Select destination store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores
                        .filter(store => store.storeName !== location)
                        .map((store) => (
                          <SelectItem key={store.storeId} value={store.storeName}>
                            {store.storeName}
                            {store.branchName && ` (${store.branchName})`}
                            {store.isDispensingStore && ' - Dispensing'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="toLocation"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter destination location"
                    required
                  />
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{getQuantityLabel()} *</Label>
              <Input
                id="quantity"
                type="number"
                min={isQuantityPositive() ? "0" : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
              {selectedDrugInventoryId && drugInventories.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Current quantity:{" "}
                  {
                    drugInventories.find(
                      (di) => di.drugInventoryId.toString() === selectedDrugInventoryId
                    )?.quantity
                  }
                </p>
              )}
            </div>

            {adjustmentType !== "TRANSFER" && (
              <div className="space-y-2">
                <Label htmlFor="location">Store/Location</Label>
                {loadingStores ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : stores.length > 0 ? (
                  <Select
                    value={location || undefined}
                    onValueChange={(value) => setLocation(value)}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select a store location (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.storeId} value={store.storeName}>
                          {store.storeName}
                          {store.branchName && ` (${store.branchName})`}
                          {store.isDispensingStore && ' - Dispensing'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Storage location (no stores configured)"
                  />
                )}
              </div>
            )}
          </div>

          {/* Only show price/date fields for RECEIPT (new stock entry) */}
          {adjustmentType === "RECEIPT" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Buy Price (Unit Price)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellPrice">Sell Price</Label>
                  <Input
                    id="sellPrice"
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufactureDate">Manufacture Date</Label>
                  <Input
                    id="manufactureDate"
                    type="date"
                    value={manufactureDate}
                    onChange={(e) => setManufactureDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPrice">Minimum Price</Label>
              <Input
                id="minPrice"
                type="number"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="PO number, adjustment ID, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this adjustment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Adjustment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
