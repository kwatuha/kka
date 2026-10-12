"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Package, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Medication {
  medicationId: number
  name?: string
  medicationName?: string
  medicationCode?: string
  hptCode?: string | null
  genericName?: string
  dosageForm?: string
  strength?: string
  category?: string
}

interface MedicationComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onMedicationSelect?: (medication: Medication | null) => void
  allowCreate?: boolean
  onMedicationCreated?: (medication: Medication) => void
}

export function MedicationCombobox({
  value,
  onValueChange,
  placeholder = "Search medication by name, code, or generic name...",
  disabled = false,
  onMedicationSelect,
  allowCreate = true,
  onMedicationCreated,
}: MedicationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [medications, setMedications] = React.useState<Medication[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [inventoryData, setInventoryData] = React.useState<Record<number, { totalQuantity: number; hasStock: boolean }>>({})
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [newMedication, setNewMedication] = React.useState({
    name: "",
    medicationCode: "",
    genericName: "",
    dosageForm: "",
    strength: "",
    category: "",
    manufacturer: "",
    description: "",
  })

  // Debug: Log when createDialogOpen changes
  React.useEffect(() => {
    console.log('🔍 createDialogOpen state changed:', createDialogOpen)
  }, [createDialogOpen])

  // Load selected medication if value is provided and not in current list
  React.useEffect(() => {
    const loadSelectedMedication = async () => {
      if (value && !medications.find((m) => m.medicationId.toString() === value)) {
        try {
          const medication = await pharmacyApi.getMedication(value)
          if (medication) {
            setMedications((prev) => {
              if (!prev.find((m) => m.medicationId.toString() === value)) {
                return [...prev, medication]
              }
              return prev
            })
          }
        } catch (error) {
          console.error("Error loading selected medication:", error)
        }
      }
    }

    loadSelectedMedication()
  }, [value])

  // Load medications when popover opens
  React.useEffect(() => {
    if (open) {
      loadMedications()
      loadInventoryData()
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadMedications(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const loadMedications = async (search?: string) => {
    try {
      setLoading(true)
      const data = await pharmacyApi.getMedications(search)
      setMedications(data || [])
    } catch (error) {
      console.error("Error loading medications:", error)
      setMedications([])
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryData = async () => {
    try {
      // Load all drug inventory to calculate totals per medication
      const inventoryItems = await pharmacyApi.getDrugInventory()

      // Calculate total quantity per medication
      const inventoryMap: Record<number, { totalQuantity: number; hasStock: boolean }> = {}

      inventoryItems.forEach((item: any) => {
        const medId = item.medicationId
        const quantity = parseInt(item.quantity || 0)

        if (!inventoryMap[medId]) {
          inventoryMap[medId] = { totalQuantity: 0, hasStock: false }
        }

        inventoryMap[medId].totalQuantity += quantity
        if (quantity > 0) {
          inventoryMap[medId].hasStock = true
        }
      })

      setInventoryData(inventoryMap)
    } catch (error) {
      console.error("Error loading inventory data:", error)
    }
  }

  const selectedMedication = medications.find(
    (m) => m.medicationId.toString() === value
  )

  const getMedicationDisplayName = (medication: Medication) => {
    const name = medication.name || medication.medicationName || "Unknown"
    const code = medication.medicationCode ? `(${medication.medicationCode})` : ""
    const generic = medication.genericName ? `- ${medication.genericName}` : ""
    return `${name} ${code} ${generic}`.trim()
  }

  const getInventoryStatus = (medicationId: number) => {
    const inventory = inventoryData[medicationId]
    if (!inventory) {
      return { hasStock: false, quantity: 0, label: "No inventory data" }
    }

    if (!inventory.hasStock || inventory.totalQuantity === 0) {
      return { hasStock: false, quantity: 0, label: "Out of stock" }
    }

    return {
      hasStock: true,
      quantity: inventory.totalQuantity,
      label: `${inventory.totalQuantity} available`,
    }
  }

  const handleSelect = (medicationId: string) => {
    onValueChange(medicationId)
    setOpen(false)
    setSearchQuery("")

    const selected = medications.find((m) => m.medicationId.toString() === medicationId)
    if (onMedicationSelect) {
      onMedicationSelect(selected || null)
    }
  }

  const handleCreateNew = (e?: React.MouseEvent) => {
    // Prevent event propagation to avoid closing the popover
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Pre-fill the medication name with the search query
    console.log('📝 Opening create medication dialog with search query:', searchQuery)
    setNewMedication({
      name: searchQuery || "",
      medicationCode: "",
      genericName: "",
      dosageForm: "",
      strength: "",
      category: "",
      manufacturer: "",
      description: "",
    })

    // Open the dialog immediately
    console.log('📝 Setting createDialogOpen to true immediately')
    setCreateDialogOpen(true)

    // Close the popover after a short delay to allow dialog to render
    setTimeout(() => {
      setOpen(false)
    }, 100)
  }

  const handleCreateMedication = async () => {
    if (!newMedication.name.trim()) {
      toast({
        title: "Error",
        description: "Medication name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      console.log('📝 Creating medication with data:', newMedication)

      const medicationData = {
        name: newMedication.name.trim(),
        medicationName: newMedication.name.trim(),
        medicationCode: newMedication.medicationCode.trim() || undefined,
        genericName: newMedication.genericName.trim() || undefined,
        dosageForm: newMedication.dosageForm.trim() || undefined,
        strength: newMedication.strength.trim() || undefined,
        category: newMedication.category.trim() || undefined,
        manufacturer: newMedication.manufacturer.trim() || undefined,
        description: newMedication.description.trim() || undefined,
      }

      console.log('📤 Sending medication data to API:', medicationData)
      const created = await pharmacyApi.createMedication(medicationData)
      console.log('✅ Medication created successfully:', created)

      toast({
        title: "Success",
        description: "Medication added to catalog successfully. Note: You may need to add it to inventory separately.",
        duration: 5000,
      })

      // Reload medications to get the updated list
      await loadMedications("")

      // Add to list and select it
      setMedications((prev) => {
        const exists = prev.find(m => m.medicationId === created.medicationId)
        if (exists) return prev
        return [...prev, created]
      })

      onValueChange(created.medicationId.toString())
      if (onMedicationSelect) {
        onMedicationSelect(created)
      }
      // Close the create medication dialog (catalog dialog)
      setCreateDialogOpen(false)
      // Close the combobox popover
      setOpen(false)
      setSearchQuery("")

      // Call onMedicationCreated callback if provided (e.g., to open prescription form)
      // This is called AFTER closing the create dialog so the prescription form can open
      if (onMedicationCreated) {
        // Use setTimeout to ensure the create dialog closes first, then open prescription
        setTimeout(() => {
          onMedicationCreated(created)
        }, 100)
      }
      setNewMedication({
        name: "",
        medicationCode: "",
        genericName: "",
        dosageForm: "",
        strength: "",
        category: "",
        manufacturer: "",
        description: "",
      })
    } catch (error: any) {
      console.error("❌ Error creating medication:", error)
      console.error("Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.status,
        data: error?.data,
      })

      const errorMessage = error?.response?.data?.message ||
                          error?.message ||
                          error?.error?.message ||
                          "Failed to create medication. Please check the console for details."

      toast({
        title: "Error Creating Medication",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      })
    } finally {
      setCreating(false)
    }
  }

  const filteredMedications = React.useMemo(() => {
    if (!searchQuery) return medications

    const lowerQuery = searchQuery.toLowerCase()
    return medications.filter((medication) => {
      const name = (medication.name || medication.medicationName || "").toLowerCase()
      const code = (medication.medicationCode || "").toLowerCase()
      const generic = (medication.genericName || "").toLowerCase()
      const category = (medication.category || "").toLowerCase()
      const strength = (medication.strength || "").toLowerCase()

      return (
        name.includes(lowerQuery) ||
        code.includes(lowerQuery) ||
        generic.includes(lowerQuery) ||
        category.includes(lowerQuery) ||
        strength.includes(lowerQuery)
      )
    })
  }, [medications, searchQuery])

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedMedication
            ? getMedicationDisplayName(selectedMedication)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, code, generic name, category, or strength..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading medications...
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="py-6 text-center space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        No medications found matching "{searchQuery}"
                      </p>
                      {allowCreate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            console.log('🔘 Add to Catalog button clicked, searchQuery:', searchQuery)
                            e.preventDefault()
                            e.stopPropagation()
                            handleCreateNew(e)
                          }}
                          onMouseDown={(e) => {
                            // Prevent popover from closing
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="mt-2 z-10 relative"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add "{searchQuery}" to Catalog
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {allowCreate
                          ? "This will add the medication to the drug catalog. You may need to add it to inventory separately."
                          : "Try searching by name, code, generic name, category, or strength"}
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Start typing to search for medications...
                      </p>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {filteredMedications.map((medication) => {
                    const inventoryStatus = getInventoryStatus(medication.medicationId)
                    return (
                      <CommandItem
                        key={medication.medicationId}
                        value={medication.medicationId.toString()}
                        onSelect={() => handleSelect(medication.medicationId.toString())}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === medication.medicationId.toString()
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {medication.name || medication.medicationName || "Unknown"}
                              </span>
                              {medication.medicationCode && (
                                <span className="text-xs text-muted-foreground">
                                  ({medication.medicationCode})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {medication.genericName && (
                                <span>{medication.genericName}</span>
                              )}
                              {medication.strength && (
                                <span>• {medication.strength}</span>
                              )}
                              {medication.dosageForm && (
                                <span>• {medication.dosageForm}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                          {medication.hptCode ? (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              HPT {medication.hptCode}
                            </Badge>
                          ) : null}
                          <Badge variant={inventoryStatus.hasStock ? "default" : "secondary"}>
                            <Package className="h-3 w-3 mr-1" />
                            {inventoryStatus.label}
                          </Badge>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <Dialog open={createDialogOpen} onOpenChange={(open) => {
      setCreateDialogOpen(open)
      if (!open) {
        // Reset form when dialog closes (but preserve name if it was from search)
        setNewMedication({
          name: "",
          medicationCode: "",
          genericName: "",
          dosageForm: "",
          strength: "",
          category: "",
          manufacturer: "",
          description: "",
        })
      }
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto z-[200]">
        <DialogHeader>
          <DialogTitle>Add Medication to Catalog</DialogTitle>
          <DialogDescription>
            Add a new medication to the drug catalog. Fill in the details below. The medication will be available for prescription but may need to be added to inventory separately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="medicationName">Medication Name *</Label>
            <Input
              id="medicationName"
              value={newMedication.name}
              onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
              placeholder="e.g., Paracetamol, Amoxicillin"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">The brand or trade name of the medication</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medicationCode">Medication Code</Label>
              <Input
                id="medicationCode"
                value={newMedication.medicationCode}
                onChange={(e) => setNewMedication({ ...newMedication, medicationCode: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genericName">Generic Name</Label>
              <Input
                id="genericName"
                value={newMedication.genericName}
                onChange={(e) => setNewMedication({ ...newMedication, genericName: e.target.value })}
                placeholder="e.g., Acetaminophen"
              />
              <p className="text-xs text-muted-foreground">The active ingredient or generic name</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosageForm">Dosage Form</Label>
              <Input
                id="dosageForm"
                value={newMedication.dosageForm}
                onChange={(e) => setNewMedication({ ...newMedication, dosageForm: e.target.value })}
                placeholder="e.g., Tablet, Capsule, Syrup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input
                id="strength"
                value={newMedication.strength}
                onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                placeholder="e.g., 500mg, 250mg/5ml"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newMedication.category}
                onChange={(e) => setNewMedication({ ...newMedication, category: e.target.value })}
                placeholder="e.g., Analgesic, Antibiotic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={newMedication.manufacturer}
                onChange={(e) => setNewMedication({ ...newMedication, manufacturer: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newMedication.description}
              onChange={(e) => setNewMedication({ ...newMedication, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateMedication}
            disabled={creating || !newMedication.name.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Catalog
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}

