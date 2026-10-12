"use client"

import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { diagnosesApi } from "@/lib/api"

interface Diagnosis {
  diagnosisId: number
  icd10Code?: string
  diagnosisName: string
  category?: string
  description?: string
}

interface ChiefComplaintComboboxProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChiefComplaintCombobox({
  value = "",
  onChange,
  placeholder = "Enter chief complaint or search ICD-10 symptoms...",
  disabled = false,
  className,
}: ChiefComplaintComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [diagnoses, setDiagnoses] = React.useState<Diagnosis[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedComplaints, setSelectedComplaints] = React.useState<string[]>([])

  // Extract complaints from value (comma-separated)
  React.useEffect(() => {
    if (value) {
      const complaints = value
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
      setSelectedComplaints(complaints)
    } else {
      setSelectedComplaints([])
    }
  }, [value])

  // Load diagnoses when popover opens - prioritize symptoms category
  React.useEffect(() => {
    if (open) {
      loadDiagnoses("", true) // Load symptoms first
    } else {
      setSearchQuery("")
    }
  }, [open])

  // Debounced search - reload when search query changes
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadDiagnoses(searchQuery.trim() || "", false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const loadDiagnoses = async (search?: string, symptomsOnly?: boolean) => {
    try {
      setLoading(true)
      // Search for symptoms category or all diagnoses
      const searchTerm = symptomsOnly ? "Symptoms" : search || ""
      const data = await diagnosesApi.getAll(searchTerm, 1, 100)
      const allDiagnoses = Array.isArray(data) ? data : []
      
      // Filter to symptoms category (R codes) if symptomsOnly, otherwise show all
      let filtered = allDiagnoses
      if (symptomsOnly) {
        filtered = allDiagnoses.filter(
          (d) => d.category === "Symptoms" || 
                 (d.icd10Code && d.icd10Code.startsWith("R")) ||
                 d.diagnosisName.toLowerCase().includes("symptom") ||
                 d.diagnosisName.toLowerCase().includes("complaint")
        )
      } else if (search) {
        // When searching, show all matching diagnoses
        filtered = allDiagnoses
      }
      
      setDiagnoses(filtered)
    } catch (error: any) {
      console.error("Error loading diagnoses for chief complaint:", error)
      setDiagnoses([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddComplaint = (complaint: string) => {
    if (!selectedComplaints.includes(complaint)) {
      const updated = [...selectedComplaints, complaint]
      setSelectedComplaints(updated)
      onChange(updated.join(", "))
      setSearchQuery("")
    }
  }

  const handleRemoveComplaint = (complaint: string) => {
    const updated = selectedComplaints.filter((c) => c !== complaint)
    setSelectedComplaints(updated)
    onChange(updated.join(", "))
  }

  const handleSelect = (diagnosis: Diagnosis) => {
    // Use the diagnosis name as the chief complaint (with ICD-10 code if available)
    const complaint = diagnosis.icd10Code 
      ? `${diagnosis.icd10Code} - ${diagnosis.diagnosisName}`
      : diagnosis.diagnosisName
    
    handleAddComplaint(complaint)
    // Keep popover open for multiple selections
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  // Filter diagnoses based on search and exclude already selected
  const filteredDiagnoses = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return diagnoses.filter(
        (d) => !selectedComplaints.some((sc) => sc.includes(d.diagnosisName))
      )
    }
    return diagnoses.filter(
      (d) => !selectedComplaints.some((sc) => sc.includes(d.diagnosisName))
    )
  }, [diagnoses, searchQuery, selectedComplaints])

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected complaints as badges */}
      {selectedComplaints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedComplaints.map((complaint) => (
            <Badge
              key={complaint}
              variant="secondary"
              className="flex items-center gap-1 py-1"
            >
              <span className="text-xs">{complaint}</span>
              <button
                type="button"
                onClick={() => handleRemoveComplaint(complaint)}
                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Textarea for free text input */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[80px] pr-10"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 h-7"
              disabled={disabled}
              onClick={() => setOpen(!open)}
            >
              + Suggest
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search ICD-10 symptoms/complaints (e.g., R51 Headache, R50.9 Fever)..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading...
                    </span>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      {searchQuery
                        ? "No matching symptoms found"
                        : "Start typing to search for ICD-10 symptoms/complaints"}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredDiagnoses.slice(0, 20).map((diagnosis) => (
                        <CommandItem
                          key={diagnosis.diagnosisId}
                          value={diagnosis.diagnosisId.toString()}
                          onSelect={() => handleSelect(diagnosis)}
                          className="flex flex-col items-start py-2"
                        >
                          <div className="flex items-center w-full">
                            {diagnosis.icd10Code && (
                              <span className="font-mono font-semibold text-sm mr-2">
                                {diagnosis.icd10Code}
                              </span>
                            )}
                            <span className="font-medium">
                              {diagnosis.diagnosisName}
                            </span>
                          </div>
                          {diagnosis.category && (
                            <span className="text-xs text-muted-foreground ml-0 mt-1">
                              {diagnosis.category}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                      {filteredDiagnoses.length > 20 && (
                        <CommandItem disabled className="text-center text-xs text-muted-foreground">
                          ... and {filteredDiagnoses.length - 20} more
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick add buttons for most common complaints */}
      {selectedComplaints.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {["Headache", "Fever", "Cough", "Chest pain", "Abdominal pain", "Shortness of breath", "Nausea", "Dizziness"].map((complaint) => (
            <Button
              key={complaint}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleAddComplaint(complaint)}
              disabled={disabled}
            >
              + {complaint}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

