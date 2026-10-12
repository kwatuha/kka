"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
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
import { proceduresApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Procedure {
  procedureId: number
  procedureName: string
  procedureCode?: string
  category?: string
  description?: string
  cost?: number
  duration?: number
  chargeName?: string
}

interface ProcedureComboboxProps {
  value?: string
  onValueChange: (value: string, procedure?: Procedure) => void
  placeholder?: string
  disabled?: boolean
  category?: string
  allowCreate?: boolean
}

export function ProcedureCombobox({
  value,
  onValueChange,
  placeholder = "Search procedure...",
  disabled = false,
  category,
  allowCreate = true,
}: ProcedureComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [procedures, setProcedures] = React.useState<Procedure[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [newProcedure, setNewProcedure] = React.useState({
    procedureName: "",
    procedureCode: "",
    category: category || "",
    description: "",
    duration: "",
    cost: "",
  })

  // Load procedures when popover opens - load all first
  React.useEffect(() => {
    if (open) {
      // Load all procedures first, then filter as user types
      loadProcedures("")
    } else {
      // Clear results when closed
      setSearchQuery("")
    }
  }, [open, category])

  // Load procedures when value is provided (for editing) but list is empty
  React.useEffect(() => {
    if (value && procedures.length === 0 && !loading && !open) {
      // Load procedures to find the selected one when editing
      loadProcedures("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Debounced search - reload when search query changes
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadProcedures(searchQuery.trim() || "")
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open, category])

  const loadProcedures = async (search?: string) => {
    try {
      setLoading(true)
      const data = await proceduresApi.getAll(search || "", category, true)
      setProcedures(Array.isArray(data) ? data : [])

      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${data?.length || 0} procedures${search ? ` for search: "${search}"` : ''}`)
      }
    } catch (error: any) {
      console.error("Error loading procedures:", error)
      setProcedures([])
    } finally {
      setLoading(false)
    }
  }

  const selectedProcedure = procedures.find(
    (p) => p.procedureId.toString() === value
  )

  const getProcedureDisplay = (procedure: Procedure) => {
    let display = procedure.procedureName
    if (procedure.category) {
      display += ` (${procedure.category})`
    }
    if (procedure.cost) {
      display += ` - KES ${parseFloat(procedure.cost.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if (procedure.duration) {
      display += ` - ${procedure.duration} min`
    }
    return display
  }

  const handleSelect = (procedure: Procedure) => {
    onValueChange(procedure.procedureId.toString(), procedure)
    setOpen(false)
    setSearchQuery("")
  }

  const handleCreateNew = () => {
    // Pre-fill the procedure name with the search query
    setNewProcedure({
      procedureName: searchQuery || "",
      procedureCode: "",
      category: category || "",
      description: "",
      duration: "",
      cost: "",
    })
    setCreateDialogOpen(true)
  }

  const handleCreateProcedure = async () => {
    if (!newProcedure.procedureName.trim()) {
      toast({
        title: "Error",
        description: "Procedure name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const created = await proceduresApi.create({
        procedureName: newProcedure.procedureName.trim(),
        procedureCode: newProcedure.procedureCode.trim() || undefined,
        category: newProcedure.category.trim() || undefined,
        description: newProcedure.description.trim() || undefined,
        duration: newProcedure.duration ? parseInt(newProcedure.duration) : undefined,
        cost: newProcedure.cost ? parseFloat(newProcedure.cost) : undefined,
        isActive: true,
      })

      toast({
        title: "Success",
        description: "Procedure created successfully",
      })

      // Add to list and select it
      setProcedures((prev) => [...prev, created])
      onValueChange(created.procedureId.toString(), created)
      setCreateDialogOpen(false)
      setOpen(false)
      setSearchQuery("")
      setNewProcedure({
        procedureName: "",
        procedureCode: "",
        category: category || "",
        description: "",
        duration: "",
        cost: "",
      })
    } catch (error: any) {
      console.error("Error creating procedure:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create procedure",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

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
          type="button"
        >
          {selectedProcedure
            ? getProcedureDisplay(selectedProcedure)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by procedure name, code, or category..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading procedures...
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {loading ? (
                    <div className="py-6 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Loading procedures...</p>
                    </div>
                  ) : searchQuery ? (
                    <div className="py-6 text-center space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        No procedures found matching "{searchQuery}"
                      </p>
                      {allowCreate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCreateNew}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create "{searchQuery}"
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {allowCreate ? "Or try searching by procedure name, code, or category" : "Try searching by procedure name, code, or category"}
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {procedures.length === 0
                          ? "No procedures available"
                          : `Showing ${procedures.length} procedures - Start typing to search`}
                      </p>
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {procedures.map((procedure) => (
                    <CommandItem
                      key={procedure.procedureId}
                      value={procedure.procedureId.toString()}
                      onSelect={() => handleSelect(procedure)}
                      className="flex flex-col items-start py-3"
                    >
                      <div className="flex items-center w-full">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === procedure.procedureId.toString()
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          {procedure.procedureCode && (
                            <span className="font-mono font-semibold text-sm mr-2">
                              {procedure.procedureCode}
                            </span>
                          )}
                          <span className="font-medium">
                            {procedure.procedureName}
                          </span>
                        </div>
                      </div>
                      <div className="ml-6 mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {procedure.category && (
                          <span>{procedure.category}</span>
                        )}
                        {procedure.cost && (
                          <span>KES {parseFloat(procedure.cost.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        )}
                        {procedure.duration && (
                          <span>{procedure.duration} min</span>
                        )}
                      </div>
                      {procedure.description && (
                        <p className="ml-6 mt-1 text-xs text-muted-foreground line-clamp-2">
                          {procedure.description}
                        </p>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Procedure</DialogTitle>
          <DialogDescription>
            Add a new procedure to the system. The procedure will be available for selection immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="procedureName">Procedure Name *</Label>
            <Input
              id="procedureName"
              value={newProcedure.procedureName}
              onChange={(e) => setNewProcedure({ ...newProcedure, procedureName: e.target.value })}
              placeholder="e.g., Minor Surgery, Wound Dressing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="procedureCode">Procedure Code</Label>
            <Input
              id="procedureCode"
              value={newProcedure.procedureCode}
              onChange={(e) => setNewProcedure({ ...newProcedure, procedureCode: e.target.value })}
              placeholder="Optional - Auto-generated if not provided"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newProcedure.category}
                onChange={(e) => setNewProcedure({ ...newProcedure, category: e.target.value })}
                placeholder="e.g., Surgical, Diagnostic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={newProcedure.duration}
                onChange={(e) => setNewProcedure({ ...newProcedure, duration: e.target.value })}
                placeholder="e.g., 30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Cost (KES)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={newProcedure.cost}
              onChange={(e) => setNewProcedure({ ...newProcedure, cost: e.target.value })}
              placeholder="e.g., 5000.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newProcedure.description}
              onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })}
              placeholder="Optional description of the procedure"
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
            onClick={handleCreateProcedure}
            disabled={creating || !newProcedure.procedureName.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Procedure
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}
