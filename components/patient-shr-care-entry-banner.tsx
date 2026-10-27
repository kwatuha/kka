"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { getPublicApiBaseUrl } from "@/lib/public-api-url"

function authHeaders(json = false): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers["Content-Type"] = "application/json"
  return headers
}

type ShrSession = {
  sessionId: number
  consentStatus: string
  visitId?: string | null
}

type Props = {
  patientId: string
  nupi?: string | null
  onOpenDocuments?: () => void
}

/**
 * TaifaCare care entry: prompt for national SHR consent when patient has NUPI (CR-linked).
 */
export function PatientShrCareEntryBanner({ patientId, nupi, onOpenDocuments }: Props) {
  const [loading, setLoading] = useState(true)
  const [shrReady, setShrReady] = useState<boolean | null>(null)
  const [session, setSession] = useState<ShrSession | null>(null)
  const [otp, setOtp] = useState("")
  const [busy, setBusy] = useState(false)
  const [representativeCrId, setRepresentativeCrId] = useState<string | null>(null)

  const apiBase = typeof window !== "undefined" ? getPublicApiBaseUrl() : ""

  const load = useCallback(async () => {
    if (!nupi?.trim()) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [sessRes, cfgRes] = await Promise.all([
        fetch(`${apiBase}/api/integrations/shr/sessions/active/${patientId}`, {
          headers: authHeaders(),
        }),
        fetch(`${apiBase}/api/integrations/shr/status`, { headers: authHeaders() }),
      ])
      const data = await sessRes.json()
      setSession(data.session || null)
      if (cfgRes.ok) {
        const cfg = await cfgRes.json()
        setShrReady(Boolean(cfg.configured && cfg.facilityFrCode && cfg.defaultPractitionerPuid))
      } else {
        setShrReady(null)
      }
    } catch {
      setSession(null)
      setShrReady(null)
    } finally {
      setLoading(false)
    }
  }, [apiBase, patientId, nupi])

  useEffect(() => {
    void load()
  }, [load])

  if (!nupi?.trim()) return null

  const approved =
    session?.consentStatus === "approved" || session?.consentStatus === "emergency"

  const startVisit = async (emergency = false) => {
    try {
      setBusy(true)
      const res = await fetch(`${apiBase}/api/integrations/shr/visits/start`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          patientId: Number(patientId),
          visitType: "OP",
          emergency,
          incapacityReason: emergency ? "Emergency presentation at facility" : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to start SHR visit")
      setRepresentativeCrId(
        typeof data.representativeCrId === "string" ? data.representativeCrId : null
      )
      toast({
        title: emergency ? "Emergency SHR path" : data.dependantConsent ? "Guardian OTP sent" : "OTP sent",
        description: data.message,
      })
      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SHR consent failed"
      toast({ title: "SHR consent failed", description: msg, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async () => {
    if (!session?.sessionId || !otp.trim()) return
    try {
      setBusy(true)
      const res = await fetch(`${apiBase}/api/integrations/shr/visits/verify`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          sessionId: session.sessionId,
          otp: otp.trim(),
          consentDecision: "Approve",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "OTP verification failed")
      toast({ title: "SHR consent approved", description: "You can document care and publish to SHR." })
      setOtp("")
      await load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed"
      toast({ title: "Verification failed", description: msg, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Alert className="border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle className="text-sm">National health record</AlertTitle>
        <AlertDescription className="text-xs">Checking SHR visit status…</AlertDescription>
      </Alert>
    )
  }

  if (shrReady === false) {
    return (
      <Alert variant="default" className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/20">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="text-sm">NUPI linked — SHR not configured</AlertTitle>
        <AlertDescription className="text-xs">
          Patient NUPI <span className="font-mono">{nupi}</span>. Ask admin to set facility FR code and
          practitioner PUID (branch settings / user profile).
        </AlertDescription>
      </Alert>
    )
  }

  if (approved) {
    return (
      <Alert className="border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/20">
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        <AlertTitle className="flex flex-wrap items-center gap-2 text-sm">
          National SHR visit active
          <Badge variant="secondary" className="font-mono text-[10px]">
            {nupi}
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-xs">
          Consent approved — encounters can publish to the Shared Health Record. Use Documents for read-back
          and visit close.
          {onOpenDocuments ? (
            <>
              {" "}
              <button type="button" className="underline font-medium" onClick={onOpenDocuments}>
                Open SHR tools
              </button>
            </>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-sky-300 bg-sky-50/90 dark:bg-sky-950/30">
      <ShieldCheck className="h-4 w-4 text-sky-800" />
      <AlertTitle className="text-sm">Continue TaifaCare — national SHR consent</AlertTitle>
      <AlertDescription className="space-y-3 text-xs">
        <p>
          Client Registry matched NUPI <span className="font-mono font-medium">{nupi}</span>. Request OTP
          consent before clinical documentation and national record sharing. For dependants, HMIS sends SHR
          consent to the linked household head when <span className="font-mono">linkedParentCrId</span> is
          on file.
        </p>
        {representativeCrId ? (
          <p className="text-[10px] text-muted-foreground">
            OTP routed to representative CR{" "}
            <span className="font-mono">{representativeCrId}</span>.
          </p>
        ) : null}
        {session?.consentStatus === "pending" ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <Input
                placeholder={
                  representativeCrId ? "OTP from guardian phone" : "OTP from patient or guardian phone"
                }
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="h-9 bg-background"
              />
            </div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void verifyOtp()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void startVisit(false)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send consent OTP"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void startVisit(true)}
            >
              Emergency path
            </Button>
            {onOpenDocuments ? (
              <Button type="button" size="sm" variant="ghost" onClick={onOpenDocuments}>
                Advanced SHR
              </Button>
            ) : null}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
