/**
 * Dashboard Cards Configuration
 * Maps dashboard cards to required privileges
 * Cards will only be shown if the user has the required privilege
 */

export interface DashboardCard {
  id: string
  title: string
  requiredPrivilege?: string // Privilege name required to view this card
  requiredPrivilegeModule?: string // Module name for the privilege
  alwaysVisible?: boolean // If true, card is always visible regardless of privileges
}

/**
 * Dashboard card definitions with their required privileges
 * If a card has a requiredPrivilege, the user must have that privilege to see it
 * If alwaysVisible is true, the card is shown to all authenticated users
 */
export const DASHBOARD_CARDS: DashboardCard[] = [
  {
    id: 'total_patients',
    title: 'Total Patients',
    requiredPrivilege: 'view_patients',
    requiredPrivilegeModule: 'patients',
  },
  {
    id: 'today_appointments',
    title: "Today's Appointments",
    requiredPrivilege: 'view_appointments',
    requiredPrivilegeModule: 'appointments',
  },
  {
    id: 'active_employees',
    title: 'Active Employees',
    requiredPrivilege: 'view_employees',
    requiredPrivilegeModule: 'hr',
  },
  {
    id: 'departments',
    title: 'Departments',
    requiredPrivilege: 'view_departments',
    requiredPrivilegeModule: 'departments',
  },
  {
    id: 'monthly_revenue',
    title: 'Monthly Revenue',
    requiredPrivilege: 'view_revenue',
    requiredPrivilegeModule: 'billing',
  },
  {
    id: 'low_stock_items',
    title: 'Low Stock Items',
    requiredPrivilege: 'view_inventory',
    requiredPrivilegeModule: 'inventory',
  },
  {
    id: 'inpatients',
    title: 'Inpatients',
    requiredPrivilege: 'view_inpatients',
    requiredPrivilegeModule: 'inpatient',
  },
  {
    id: 'active_queue',
    title: 'Active Queue',
    requiredPrivilege: 'view_queue',
    requiredPrivilegeModule: 'queue',
  },
]

/**
 * Get the privilege name for a dashboard card
 */
export function getCardPrivilege(cardId: string): string | undefined {
  const card = DASHBOARD_CARDS.find(c => c.id === cardId)
  return card?.requiredPrivilege
}

/**
 * Check if a user has access to a specific dashboard card
 * @param cardId - The ID of the dashboard card
 * @param userPrivileges - Array of privilege objects from the user object
 * @param roleCardVisibility - Optional object mapping card IDs to visibility (from role_dashboard_cards table)
 * @param userRole - Optional user role name (e.g., "admin", "doctor")
 * @returns true if the user can see the card, false otherwise
 */
export function canViewDashboardCard(
  cardId: string,
  userPrivileges?: Array<{ privilegeName: string; module?: string }> | null,
  roleCardVisibility?: Record<string, boolean> | null,
  userRole?: string | null
): boolean {
  const card = DASHBOARD_CARDS.find(c => c.id === cardId)
  
  // If card doesn't exist, don't show it
  if (!card) {
    return false
  }
  
  // Admin users can see all cards regardless of privileges or role configuration
  // Check for common admin role names (case-insensitive)
  if (userRole) {
    const roleLower = userRole.toLowerCase()
    if (roleLower === 'admin' || roleLower === 'administrator') {
      return true
    }
  }
  
  // First, check role-specific card visibility (overrides privilege-based logic)
  // If explicitly set in roleCardVisibility, return that value directly (true or false)
  if (roleCardVisibility && cardId in roleCardVisibility) {
    return roleCardVisibility[cardId] // Return the value directly - if false, return false immediately
  }
  
  // If card is always visible, show it
  if (card.alwaysVisible) {
    return true
  }
  
  // If card has no required privilege, show it (backward compatibility)
  if (!card.requiredPrivilege) {
    return true
  }
  
  // If user has no privileges, don't show cards that require privileges
  if (!userPrivileges || userPrivileges.length === 0) {
    return false
  }
  
  // Check if user has the required privilege
  // Match by privilege name (case-insensitive) and optionally by module
  const hasPrivilege = userPrivileges.some(priv => {
    const nameMatch = priv.privilegeName?.toLowerCase() === card.requiredPrivilege?.toLowerCase()
    const moduleMatch = !card.requiredPrivilegeModule || 
                       priv.module?.toLowerCase() === card.requiredPrivilegeModule?.toLowerCase()
    return nameMatch && moduleMatch
  })
  
  return hasPrivilege
}

/**
 * Filter dashboard cards based on user privileges and role-specific visibility
 * @param cards - Array of card objects (with id property)
 * @param userPrivileges - Array of privilege objects from the user object
 * @param roleCardVisibility - Optional object mapping card IDs to visibility (from role_dashboard_cards table)
 * @param userRole - Optional user role name (e.g., "admin", "doctor")
 * @returns Filtered array of cards that the user can view
 */
export function filterDashboardCards<T extends { id: string }>(
  cards: T[],
  userPrivileges?: Array<{ privilegeName: string; module?: string }> | null,
  roleCardVisibility?: Record<string, boolean> | null,
  userRole?: string | null
): T[] {
  return cards.filter(card => canViewDashboardCard(card.id, userPrivileges, roleCardVisibility, userRole))
}
