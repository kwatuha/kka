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
import { userApi } from "@/lib/api"

interface Staff {
  userId: number
  firstName: string
  lastName: string
  username?: string
  email?: string
  phone?: string
  roleName?: string
  department?: string
}

interface StaffComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function StaffCombobox({
  value,
  onValueChange,
  placeholder = "Search staff by name, username, email, or phone...",
  disabled = false,
}: StaffComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [staff, setStaff] = React.useState<Staff[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Load selected staff if value is provided and not in current list
  React.useEffect(() => {
    const loadSelectedStaff = async () => {
      if (value && !staff.find((s) => s.userId.toString() === value)) {
        try {
          const users = await userApi.getAll("", 1, 1000)
          const selectedUser = users.find((u: any) => u.userId.toString() === value)
          if (selectedUser) {
            setStaff((prev) => {
              if (!prev.find((s) => s.userId.toString() === value)) {
                return [...prev, selectedUser]
              }
              return prev
            })
          }
        } catch (error) {
          console.error("Error loading selected staff:", error)
        }
      }
    }

    loadSelectedStaff()
  }, [value])

  // Load staff when popover opens
  React.useEffect(() => {
    if (open) {
      loadStaff()
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      loadStaff(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const loadStaff = async (search?: string) => {
    try {
      setLoading(true)
      const data = await userApi.getAll(search || "", 1, 100)
      setStaff(data || [])
    } catch (error) {
      console.error("Error loading staff:", error)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const selectedStaff = staff.find(
    (s) => s.userId.toString() === value
  )

  const getStaffDisplayName = (staff: Staff) => {
    const name = `${staff.firstName} ${staff.lastName}`.trim()
    const identifiers = [
      staff.username,
      staff.email,
      staff.phone,
      staff.roleName,
      staff.department,
    ]
      .filter(Boolean)
      .join(", ")
    return identifiers ? `${name} (${identifiers})` : name
  }

  const filterStaff = (staff: Staff[], query: string) => {
    if (!query) return staff

    const lowerQuery = query.toLowerCase()
    return staff.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase()
      const username = s.username?.toLowerCase() || ""
      const email = s.email?.toLowerCase() || ""
      const phone = s.phone?.toLowerCase() || ""
      const role = s.roleName?.toLowerCase() || ""
      const department = s.department?.toLowerCase() || ""

      return (
        fullName.includes(lowerQuery) ||
        username.includes(lowerQuery) ||
        email.includes(lowerQuery) ||
        phone.includes(lowerQuery) ||
        role.includes(lowerQuery) ||
        department.includes(lowerQuery)
      )
    })
  }

  const filteredStaff = filterStaff(staff, searchQuery)

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
          {selectedStaff
            ? getStaffDisplayName(selectedStaff)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, username, email, phone, role, or department..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading staff...
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery
                    ? "No staff found."
                    : "Start typing to search for staff..."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredStaff.map((s) => (
                    <CommandItem
                      key={s.userId}
                      value={s.userId.toString()}
                      onSelect={() => {
                        onValueChange(s.userId.toString())
                        setOpen(false)
                        setSearchQuery("")
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === s.userId.toString()
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[
                            s.username && `Username: ${s.username}`,
                            s.email && `Email: ${s.email}`,
                            s.phone && `Phone: ${s.phone}`,
                            s.roleName && `Role: ${s.roleName}`,
                            s.department && `Dept: ${s.department}`,
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



