"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
import { patientApi } from "@/lib/api"

interface Patient {
  patientId: number
  firstName: string
  lastName: string
  patientNumber?: string
  idNumber?: string
  phone?: string
  email?: string
  registeredBranchId?: number | null
  registeredBranchName?: string | null
}

interface PatientComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  onPatientSelect?: (patient: Patient | null) => void
  placeholder?: string
  disabled?: boolean
}

export function PatientCombobox({
  value,
  onValueChange,
  onPatientSelect,
  placeholder = "Search patient by name, ID, or number...",
  disabled = false,
}: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Load selected patient if value is provided and not in current list
  React.useEffect(() => {
    const loadSelectedPatient = async () => {
      if (value && !patients.find((p) => p.patientId.toString() === value)) {
        try {
          const patient = await patientApi.getById(value)
          if (patient) {
            setPatients((prev) => {
              // Add patient if not already in list
              if (!prev.find((p) => p.patientId.toString() === value)) {
                return [...prev, patient]
              }
              return prev
            })
          }
        } catch (error) {
          console.error("Error loading selected patient:", error)
        }
      }
    }

    loadSelectedPatient()
  }, [value])

  // Load patients when popover opens
  React.useEffect(() => {
    if (open) {
      loadPatients()
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadPatients(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const loadPatients = async (search?: string) => {
    try {
      setLoading(true)
      const data = await patientApi.getAll(search, 1, 100)
      setPatients(data || [])
    } catch (error) {
      console.error("Error loading patients:", error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const selectedPatient = patients.find(
    (p) => p.patientId.toString() === value
  )

  const getPatientFacilityLabel = (patient: Patient) => {
    const name = String(patient.registeredBranchName || "").trim()
    if (name) return name
    const id = Number(patient.registeredBranchId)
    if (Number.isFinite(id) && id > 0) return `Facility #${id}`
    return "Unassigned facility"
  }

  const getPatientDisplayName = (patient: Patient) => {
    const name = `${patient.firstName} ${patient.lastName}`.trim()
    const identifiers = [
      patient.patientNumber,
      patient.idNumber,
      patient.phone,
      getPatientFacilityLabel(patient),
    ]
      .filter(Boolean)
      .join(", ")
    return identifiers ? `${name} (${identifiers})` : name
  }

  const filterPatients = (patients: Patient[], query: string) => {
    if (!query) return patients

    const lowerQuery = query.toLowerCase()
    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      const patientNumber = patient.patientNumber?.toLowerCase() || ""
      const idNumber = patient.idNumber?.toLowerCase() || ""
      const phone = patient.phone?.toLowerCase() || ""
      const email = patient.email?.toLowerCase() || ""

      return (
        fullName.includes(lowerQuery) ||
        patientNumber.includes(lowerQuery) ||
        idNumber.includes(lowerQuery) ||
        phone.includes(lowerQuery) ||
        email.includes(lowerQuery)
      )
    })
  }

  const filteredPatients = filterPatients(patients, searchQuery)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedPatient
            ? getPatientDisplayName(selectedPatient)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, ID, number, phone, or email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading patients...
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery
                    ? "No patients found."
                    : "Start typing to search for patients..."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredPatients.map((patient) => (
                    <CommandItem
                      key={patient.patientId}
                      value={patient.patientId.toString()}
                      onSelect={() => {
                        onValueChange(patient.patientId.toString())
                        onPatientSelect?.(patient)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === patient.patientId.toString()
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[
                            patient.patientNumber && `ID: ${patient.patientNumber}`,
                            patient.idNumber && `ID Number: ${patient.idNumber}`,
                            patient.phone && `Phone: ${patient.phone}`,
                            `Facility: ${getPatientFacilityLabel(patient)}`,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

