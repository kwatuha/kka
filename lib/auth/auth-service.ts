import type { UserRole } from './permissions'

export interface Branch {
  branchId: number
  branchCode?: string
  branchName: string
  isMainBranch?: boolean
  isDefault?: boolean
}

export interface User {
  id: string
  username: string
  role: UserRole
  name: string
  email: string
  department: string
  privileges?: Array<{ privilegeName: string; module?: string }> | string[]
  dashboardCards?: Record<string, boolean> | null
  branches?: Branch[]
  defaultBranch?: Branch | null
  currentBranch?: Branch | null
  canAccessAllBranches?: boolean
  landingConfig?: {
    type: 'dashboard' | 'app_view' | 'redirect'
    label?: string
    url?: string
    icon?: string
    description?: string
    servicePoint?: string
    quickLinks?: Array<{ label: string; url: string; icon?: string }>
  }
  totpEnabled?: boolean
  mustSetup2fa?: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}
