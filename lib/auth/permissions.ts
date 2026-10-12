// Define user roles
export type UserRole = "admin" | "doctor" | "nurse" | "lab_technician" | "registration" | "billing" | "pharmacy"

// Define permission types
export type Permission =
  | "view_patient_full"
  | "view_patient_medical"
  | "edit_patient"
  | "view_billing"
  | "edit_billing"
  | "view_lab_results"
  | "create_lab_results"
  | "view_prescriptions"
  | "create_prescriptions"

// Role-based permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "view_patient_full",
    "view_patient_medical",
    "edit_patient",
    "view_billing",
    "edit_billing",
    "view_lab_results",
    "create_lab_results",
    "view_prescriptions",
    "create_prescriptions",
  ],
  doctor: [
    "view_patient_full",
    "view_patient_medical",
    "edit_patient",
    "view_lab_results",
    "create_lab_results",
    "view_prescriptions",
    "create_prescriptions",
  ],
  nurse: ["view_patient_full", "view_patient_medical", "view_lab_results", "view_prescriptions"],
  lab_technician: ["view_patient_medical", "view_lab_results", "create_lab_results"],
  registration: ["edit_patient"],
  billing: ["view_billing", "edit_billing"],
  pharmacy: ["view_prescriptions"],
}

// For simplicity in this demo, we'll assume a default role
// In a real app, this would come from authentication
let currentUserRole: UserRole = "registration"

// Function to check if the current user has a specific permission
export function hasPermission(permission: Permission): boolean {
  return rolePermissions[currentUserRole]?.includes(permission) || false
}

// Function to set the current user role (for demo purposes)
export function setCurrentUserRole(role: UserRole): void {
  currentUserRole = role
}

// Function to get the current user role
export function getCurrentUserRole(): UserRole {
  return currentUserRole
}
