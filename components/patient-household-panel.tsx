"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Users } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { patientApi } from "@/lib/api"

type HouseholdMember = {
  patientId: number
  patientNumber: string
  name: string
  dateOfBirth?: string | null
  idType?: string | null
  idNumber?: string | null
  nupi?: string | null
  role: "head" | "dependant" | "member"
  isCurrentPatient?: boolean
}

type Props = {
  patientId: string
  /** Hide when chart has no CR link yet */
  showWhenEmpty?: boolean
}

export function PatientHouseholdPanel({ patientId, showWhenEmpty = false }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headCr, setHeadCr] = useState<string | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [billingNote, setBillingNote] = useState<string | null>(null)
  const [consentNote, setConsentNote] = useState<string | null>(null)
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    try {
      setLoading(true)
      setError(null)
      const data = await patientApi.getHousehold(patientId)
      setHeadCr(data.householdHeadCr || null)
      setMembers(data.members || [])
      setBillingNote(data.billingNote || null)
      setConsentNote(data.consentNote || null)
      setEmptyMessage(data.message || null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load household"
      setError(msg)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  const dependants = members.filter((m) => m.role === "dependant")
  const hasHousehold = Boolean(headCr && members.length > 0)

  if (loading) {
    return (
      <Alert className="border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/30">
        <Users className="h-4 w-4" />
        <AlertTitle className="text-sm">Household / linked dependants</AlertTitle>
        <AlertDescription className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading household…
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="text-sm">Household / linked dependants</AlertTitle>
        <AlertDescription className="text-xs">{error}</AlertDescription>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void load()}>
          Retry
        </Button>
      </Alert>
    )
  }

  if (!hasHousehold && !showWhenEmpty) return null

  return (
    <Alert className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/25">
      <Users className="h-4 w-4 text-indigo-800 dark:text-indigo-200" />
      <AlertTitle className="text-sm">Household / linked dependants</AlertTitle>
      <AlertDescription className="mt-2 space-y-3 text-xs">
        {!hasHousehold ? (
          <p className="text-muted-foreground">
            {emptyMessage ||
              "No linked household members in this facility yet. Register dependants with Client Registry search (birth certificate or NUPI)."}
          </p>
        ) : (
          <>
            <p>
              Household head (national CR):{" "}
              <span className="font-mono text-[11px]">{headCr}</span>
            </p>
            {billingNote ? (
              <p className="rounded-md border border-indigo-300/50 bg-background/70 px-2 py-1.5 text-[11px] text-indigo-950 dark:text-indigo-100">
                {billingNote}
              </p>
            ) : null}
            {consentNote ? (
              <p className="rounded-md border border-sky-300/40 bg-sky-50/80 px-2 py-1.5 text-[10px] text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                {consentNote}
              </p>
            ) : null}
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.patientId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/80 px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{m.name || "—"}</span>
                      <Badge variant={m.role === "head" ? "default" : "secondary"} className="text-[9px]">
                        {m.role === "head" ? "Household head" : m.role === "dependant" ? "Dependant" : "Member"}
                      </Badge>
                      {m.isCurrentPatient ? (
                        <Badge variant="outline" className="text-[9px]">
                          This chart
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      #{m.patientNumber}
                      {m.nupi ? (
                        <>
                          {" · "}
                          NUPI <span className="font-mono">{m.nupi}</span>
                        </>
                      ) : null}
                      {m.idNumber ? (
                        <>
                          {" · "}
                          {m.idType || "ID"} {m.idNumber}
                        </>
                      ) : null}
                    </p>
                  </div>
                  {!m.isCurrentPatient ? (
                    <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" asChild>
                      <Link href={`/patients/${m.patientId}`}>Open chart</Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            {dependants.length === 0 && members.length === 1 ? (
              <p className="text-[10px] text-muted-foreground">
                No dependants registered at this facility under this household. Add a patient with CR
                dependant search (e.g. birth certificate) linked to the same parent CR.
              </p>
            ) : null}
          </>
        )}
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => void load()}>
          Refresh household
        </Button>
      </AlertDescription>
    </Alert>
  )
}
