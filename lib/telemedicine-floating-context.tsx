"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/** Optional patient hint when opening the floating panel (filled from session GET if omitted). */
export type TelemedicineOpenOptions = {
  patientId?: string | number
  patientDisplayName?: string
}

export type TelemedicineFloatingContextValue = {
  /** Active session shown in the floating panel (null = hidden) */
  sessionId: string | null
  minimized: boolean
  /** Patient for encounter/history beside video (from opener or session load) */
  patientId: string | null
  patientDisplayName: string | null
  openSession: (sessionId: string | number, options?: TelemedicineOpenOptions) => void
  setFloatingPatientMeta: (meta: { patientId?: string | null; patientDisplayName?: string | null }) => void
  closePanel: () => void
  setMinimized: (value: boolean) => void
  toggleMinimize: () => void
}

const TelemedicineFloatingContext = createContext<TelemedicineFloatingContextValue | null>(null)

export function TelemedicineFloatingProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientDisplayName, setPatientDisplayName] = useState<string | null>(null)

  const openSession = useCallback((id: string | number, options?: TelemedicineOpenOptions) => {
    setSessionId(String(id))
    setMinimized(false)
    if (options?.patientId != null && String(options.patientId).trim() !== "") {
      setPatientId(String(options.patientId))
    } else {
      setPatientId(null)
    }
    const label = options?.patientDisplayName?.trim()
    setPatientDisplayName(label || null)
  }, [])

  const setFloatingPatientMeta = useCallback((meta: { patientId?: string | null; patientDisplayName?: string | null }) => {
    if (meta.patientId !== undefined) {
      setPatientId(meta.patientId != null && String(meta.patientId).trim() !== "" ? String(meta.patientId) : null)
    }
    if (meta.patientDisplayName !== undefined) {
      const t = meta.patientDisplayName?.trim()
      setPatientDisplayName(t || null)
    }
  }, [])

  const closePanel = useCallback(() => {
    setSessionId(null)
    setMinimized(false)
    setPatientId(null)
    setPatientDisplayName(null)
  }, [])

  const toggleMinimize = useCallback(() => {
    setMinimized((m) => !m)
  }, [])

  const value = useMemo(
    () => ({
      sessionId,
      minimized,
      patientId,
      patientDisplayName,
      openSession,
      setFloatingPatientMeta,
      closePanel,
      setMinimized,
      toggleMinimize,
    }),
    [
      sessionId,
      minimized,
      patientId,
      patientDisplayName,
      openSession,
      setFloatingPatientMeta,
      closePanel,
      toggleMinimize,
    ]
  )

  return (
    <TelemedicineFloatingContext.Provider value={value}>{children}</TelemedicineFloatingContext.Provider>
  )
}

export function useTelemedicineFloating(): TelemedicineFloatingContextValue {
  const ctx = useContext(TelemedicineFloatingContext)
  if (!ctx) {
    throw new Error("useTelemedicineFloating must be used within TelemedicineFloatingProvider")
  }
  return ctx
}
