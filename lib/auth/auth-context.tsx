"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { UserRole } from "./permissions"
import type { Branch, User } from "./auth-service"
import { invalidateRoleMenuAccessCache } from "@/lib/hooks/use-role-menu-access"
import { authApiUrl } from "@/lib/auth/api-url"

interface AuthContextType {
  user: User | null
  userRole: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  currentBranch: Branch | null
  accessibleBranches: Branch[]
  setCurrentBranch: (branchId: number | string) => void
  login: (
    username: string,
    password: string,
    totpCode?: string
  ) => Promise<{
    success: boolean
    error?: string
    requiresTotp?: boolean
    requiresLoginOtp?: boolean
    challengeId?: string
    maskedEmail?: string | null
    maskedPhone?: string | null
  }>
  verifyLoginOtp: (
    challengeId: string,
    code: string
  ) => Promise<{ success: boolean; error?: string; challengeId?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Login may include DB session load + SMS/email OTP delivery on slow networks. */
const LOGIN_TIMEOUT_MS = 35000
const VERIFY_TIMEOUT_MS = 2500

function normalizePrivileges(raw: unknown): Array<{ privilegeName: string; module?: string }> {
  if (!Array.isArray(raw)) return []
  return raw.map((priv: any) => {
    if (typeof priv === "string") return { privilegeName: priv }
    return { privilegeName: priv.privilegeName || priv, module: priv.module }
  })
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Start with true to check auth on mount
  const [accessibleBranches, setAccessibleBranches] = useState<Branch[]>([])
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null)

  const userRole = user?.role || "registration"

  const normalizeBranch = (branch: any): Branch | null => {
    if (!branch?.branchId || !branch?.branchName) return null
    return {
      branchId: Number(branch.branchId),
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      isMainBranch: Boolean(branch.isMainBranch),
      isDefault: Boolean(branch.isDefault),
    }
  }

  const applyBranchContext = (rawUser: any) => {
    const branches = Array.isArray(rawUser?.branches)
      ? (rawUser.branches.map(normalizeBranch).filter(Boolean) as Branch[])
      : []
    const defaultBranch = normalizeBranch(rawUser?.defaultBranch || rawUser?.currentBranch) || branches[0] || null
    const storedBranchId = typeof window !== "undefined" ? localStorage.getItem("current_branch_id") : null
    const selectedBranch =
      branches.find((branch) => String(branch.branchId) === storedBranchId) || defaultBranch || null

    setAccessibleBranches(branches)
    setCurrentBranchState(selectedBranch)
    if (selectedBranch && typeof window !== "undefined") {
      localStorage.setItem("current_branch_id", String(selectedBranch.branchId))
    }

    return { branches, defaultBranch, currentBranch: selectedBranch }
  }

  const hydrateUserFromApi = (apiUser: any) => {
    const branchContext = applyBranchContext(apiUser)
    const privileges = normalizePrivileges(apiUser.privileges)
    setUser({
      id: apiUser.id?.toString() || apiUser.userId?.toString() || "",
      username: apiUser.username,
      role: apiUser.role?.toLowerCase() || apiUser.roleName?.toLowerCase() || "registration",
      name: `${apiUser.firstName || ""} ${apiUser.lastName || ""}`.trim(),
      email: apiUser.email,
      department: apiUser.department || "",
      privileges,
      dashboardCards: apiUser.dashboardCards || null,
      landingConfig: apiUser.landingConfig || null,
      branches: branchContext.branches,
      defaultBranch: branchContext.defaultBranch,
      currentBranch: branchContext.currentBranch,
      canAccessAllBranches: Boolean(apiUser.canAccessAllBranches),
      totpEnabled: Boolean(apiUser.totpEnabled),
      mustSetup2fa: Boolean(apiUser.mustSetup2fa),
    })
    setIsAuthenticated(true)
  }

  const hydrateUserFromJwt = (token: string): boolean => {
    const payload = decodeJwtPayload(token)
    if (!payload?.user || !payload.exp || payload.exp * 1000 <= Date.now()) return false
    hydrateUserFromApi({
      ...payload.user,
      role: payload.user.roleName || payload.user.role,
    })
    return true
  }

  const clearAuthStorage = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("jwt_token")
    localStorage.removeItem("auth_token")
  }

  const setCurrentBranch = (branchId: number | string) => {
    const branch = accessibleBranches.find((item) => String(item.branchId) === String(branchId))
    if (!branch) return
    setCurrentBranchState(branch)
    if (typeof window !== "undefined") {
      localStorage.setItem("current_branch_id", String(branch.branchId))
    }
  }

  // Check for existing authentication on mount
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.warn("Auth check timeout - forcing loading to false")
      setIsLoading(false)
    }, 10000)

    const checkAuth = async () => {
      if (typeof window === "undefined") {
        clearTimeout(safetyTimeout)
        setIsLoading(false)
        return
      }

      const token = localStorage.getItem("token") || localStorage.getItem("jwt_token") || localStorage.getItem("auth_token")

      if (!token) {
        clearTimeout(safetyTimeout)
        setIsLoading(false)
        setIsAuthenticated(false)
        setAccessibleBranches([])
        setCurrentBranchState(null)
        return
      }

      // Instant paint from JWT (login already returned full payload). Verify refreshes in background.
      const hydratedFromJwt = hydrateUserFromJwt(token)
      if (hydratedFromJwt) {
        clearTimeout(safetyTimeout)
        setIsLoading(false)
      }

      const verifyUrl = authApiUrl("/api/auth/verify")

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)

        let response: Response | null = null
        try {
          response = await fetch(verifyUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            credentials: "include",
          })
          clearTimeout(timeoutId)
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          if (hydratedFromJwt) return
          console.warn("API verify failed, using JWT decode fallback:", fetchError.message)
          throw new Error("Network error or timeout")
        }

        if (response && response.ok) {
          const data = await response.json()
          if (data.user) {
            hydrateUserFromApi(data.user)
            setIsLoading(false)
            return
          }
          clearAuthStorage()
          setIsAuthenticated(false)
          setIsLoading(false)
          return
        }

        if (response) {
          // Only clear if JWT hydrate also failed (expired / invalid)
          if (!hydratedFromJwt) {
            clearAuthStorage()
            setIsAuthenticated(false)
          }
          setIsLoading(false)
          return
        }
      } catch {
        if (hydratedFromJwt) return
        try {
          if (hydrateUserFromJwt(token)) {
            setIsLoading(false)
            return
          }
        } catch (decodeError) {
          console.warn("Token decode failed:", decodeError)
        }
        clearAuthStorage()
        setIsAuthenticated(false)
        setAccessibleBranches([])
        setCurrentBranchState(null)
      } finally {
        clearTimeout(safetyTimeout)
        setIsLoading(false)
      }
    }

    checkAuth()

    return () => {
      clearTimeout(safetyTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auth bootstrap
  }, [])

  const login = async (username: string, password: string, totpCode?: string) => {
    try {
      setIsLoading(true)

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

        let response: Response
        try {
          response = await fetch(authApiUrl("/api/auth/login"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, ...(totpCode ? { totpCode } : {}) }),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }

        if (response.ok) {
          const data = await response.json()
          if (data.token) {
            localStorage.setItem("token", data.token)
            localStorage.setItem("jwt_token", data.token)
            if (data.user) {
              hydrateUserFromApi(data.user)
              return { success: true }
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.requiresTotp || errorData.error === "totp_required") {
            return {
              success: false,
              requiresTotp: true,
              error: errorData.message || "Enter your authenticator code",
            }
          }
          if (errorData.requiresLoginOtp || errorData.error === "login_otp_required") {
            return {
              success: false,
              requiresLoginOtp: true,
              challengeId: errorData.challengeId,
              maskedEmail: errorData.maskedEmail,
              maskedPhone: errorData.maskedPhone,
              error: errorData.message || "Enter the verification code sent to your phone and email",
            }
          }
          return {
            success: false,
            error: errorData.message || errorData.error || "Invalid username or password",
          }
        }
      } catch (apiError: any) {
        const configuredApi = Boolean((process.env.NEXT_PUBLIC_API_URL || "").trim())
        const isProdBuild = process.env.NODE_ENV === "production"
        if (apiError?.name === "AbortError") {
          return {
            success: false,
            error:
              "Login timed out. The server may be sending an SMS verification code — wait and try again, or ask an admin to check API/SMS connectivity.",
          }
        }
        console.error("HMIS API login request failed:", apiError)
        if (isProdBuild || configuredApi) {
          return {
            success: false,
            error:
              "Cannot reach the HMIS API from this browser. On https://hmis.azimkim.co.ke use same-origin /api (leave NEXT_PUBLIC_API_URL empty at build). If using port :5400 for UI, API should be on :3222.",
          }
        }
        return {
          success: false,
          error: "Cannot reach the HMIS API. Start the API server and set NEXT_PUBLIC_API_URL, or use same-origin /api proxy.",
        }
      }

      return { success: false, error: "Login failed. Please try again." }
    } catch {
      return { success: false, error: "Login failed. Please try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyLoginOtp = async (challengeId: string, code: string) => {
    try {
      setIsLoading(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch(authApiUrl("/api/auth/login/verify-otp"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId, loginOtpCode: code }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          localStorage.setItem("token", data.token)
          localStorage.setItem("jwt_token", data.token)
          if (data.user) {
            hydrateUserFromApi(data.user)
            return { success: true }
          }
        }
      }

      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || errorData.error || "Invalid verification code",
        challengeId: errorData.challengeId || challengeId,
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return { success: false, error: "Verification timed out. Try again." }
      }
      return { success: false, error: "Could not verify code. Try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(() => {
    invalidateRoleMenuAccessCache()
    localStorage.removeItem("auth_token")
    localStorage.removeItem("token")
    localStorage.removeItem("jwt_token")
    localStorage.removeItem("current_branch_id")
    setUser(null)
    setAccessibleBranches([])
    setCurrentBranchState(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isAuthenticated,
        isLoading,
        currentBranch,
        accessibleBranches,
        setCurrentBranch,
        login,
        verifyLoginOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
