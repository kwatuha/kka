"use client"

import { useAuth } from "@/lib/auth/auth-context"
import type { UserRole } from "@/lib/auth/permissions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function RoleSwitcher() {
  const { userRole, setUserRole } = useAuth()

  const roles: { value: UserRole; label: string }[] = [
    { value: "admin", label: "Administrator" },
    { value: "doctor", label: "Doctor" },
    { value: "nurse", label: "Nurse" },
    { value: "lab_technician", label: "Lab Technician" },
    { value: "registration", label: "Registration Clerk" },
    { value: "billing", label: "Billing Staff" },
    { value: "pharmacy", label: "Pharmacist" },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Role:</span>
      <Select value={userRole} onValueChange={(value) => setUserRole(value as UserRole)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
