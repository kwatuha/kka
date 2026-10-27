"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { integrationApiUrl, integrationFetch } from "@/lib/integration-api"

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
  consentTokenExpiresAt?: string | null
}

export function PatientShrConsentCard({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<ShrSession | null>(null)
  const [otp, setOtp] = useState("")
  const [busy, setBusy] = useState(false)
  const [readPreview, setReadPreview] = useState<string>("")
  const [shrReady, setShrReady] = useState<boolean | null>(null)
  const [closeOtpRecord, setCloseOtpRecord] = useState<string | null>(null)
  const [closeOtp, setCloseOtp] = useState("")
  const [representativeCrId, setRepresentativeCrId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sessRes, cfgRes] = await Promise.all([
        fetch(`/api/integrations/shr/sessions/active/${patientId}`, { headers: authHeaders() }),
        fetch(integrationApiUrl("/api/integrations/shr/status"), { headers: authHeaders() }),
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
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  const startVisit = async (emergency = false) => {
    try {
      setBusy(true)
      const res = await integrationFetch("/api/integrations/shr/visits/start", {
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
        title: emergency ? "Emergency SHR path" : data.dependantConsent ? "Guardian OTP requested" : "OTP requested",
        description: data.message,
      })
      await load()
      if (data.sessionId && data.consentStatus === "pending") {
        setSession({
          sessionId: data.sessionId,
          consentStatus: "pending",
        })
      }
    } catch (err: any) {
      toast({ title: "SHR consent failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async (consentDecision: "Approve" | "Reject" = "Approve") => {
    if (!session?.sessionId || !otp.trim()) return
    try {
      setBusy(true)
      const res = await integrationFetch("/api/integrations/shr/visits/verify", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          sessionId: session.sessionId,
          otp: otp.trim(),
          consentDecision,
          rejectionReason: consentDecision === "Reject" ? "Patient declined at facility" : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "OTP verification failed")
      toast({
        title: consentDecision === "Reject" ? "SHR consent declined" : "SHR consent approved",
        description: data.message,
      })
      setOtp("")
      await load()
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const resendConsentOtp = async () => {
    if (!session?.sessionId) return
    try {
      setBusy(true)
      const res = await integrationFetch("/api/integrations/shr/visits/resend-otp", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ sessionId: session.sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Resend failed")
      toast({ title: "OTP resent", description: data.message })
      await load()
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const startCloseVisit = async (patientIncapable = false) => {
    if (!session?.sessionId) return
    try {
      setBusy(true)
      setCloseOtpRecord(null)
      setCloseOtp("")
      const res = await integrationFetch("/api/integrations/shr/visits/close", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          sessionId: session.sessionId,
          patientIncapable,
          incapacityReason: patientIncapable ? "Unable to consent to visit closure" : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Close visit failed")
      if (data.closed) {
        toast({ title: "National visit closed", description: data.message })
        await load()
        return
      }
      if (data.otpRecord) {
        setCloseOtpRecord(String(data.otpRecord))
        toast({ title: "Close OTP sent", description: data.message })
      }
    } catch (err: any) {
      toast({ title: "Close visit failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const verifyCloseOtp = async () => {
    if (!session?.sessionId || !closeOtpRecord || !closeOtp.trim()) return
    try {
      setBusy(true)
      const res = await integrationFetch("/api/integrations/shr/visits/close/verify", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          sessionId: session.sessionId,
          otp: closeOtp.trim(),
          otpRecord: closeOtpRecord,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Close verification failed")
      toast({ title: "Visit closed", description: data.message })
      setCloseOtp("")
      setCloseOtpRecord(null)
      await load()
    } catch (err: any) {
      toast({ title: "Close verification failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const readShr = async () => {
    if (!session?.sessionId) return
    try {
      setBusy(true)
      setReadPreview("")
      const res = await integrationFetch("/api/integrations/shr/patient-records", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ sessionId: session.sessionId, resources: "Observation,Condition" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "SHR read failed")
      setReadPreview(JSON.stringify(data.data || data, null, 2).slice(0, 1200))
      toast({ title: "SHR records retrieved" })
    } catch (err: any) {
      toast({ title: "SHR read failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const approved =
    session?.consentStatus === "approved" || session?.consentStatus === "emergency"

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          National SHR consent (visit)
        </CardTitle>
        <CardDescription>
          Request OTP consent before reading the Shared Health Record. For dependants with a linked household
          head, OTP is sent to the parent/guardian CR on file. Approved consent also unlocks live SHR publish
          when SHR_REQUIRE_CONSENT_FOR_PUBLISH is enabled on the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            {shrReady === false ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Server SHR config incomplete (facility fr-code or practitioner PUID). Ask admin to check
                National integrations / env.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Session:</span>
              {session ? (
                <Badge variant={approved ? "default" : "secondary"}>{session.consentStatus}</Badge>
              ) : (
                <Badge variant="outline">none</Badge>
              )}
              {session?.visitId ? (
                <span className="text-xs text-muted-foreground">visit {session.visitId}</span>
              ) : null}
            </div>
            {!session || session.consentStatus === "rejected" ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => void startVisit(false)}>
                  Request OTP consent
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void startVisit(true)}>
                  Emergency consent
                </Button>
              </div>
            ) : null}
            {representativeCrId ? (
              <p className="text-[10px] text-muted-foreground">
                Consent OTP sent to representative{" "}
                <span className="font-mono">{representativeCrId}</span>.
              </p>
            ) : null}
            {session?.consentStatus === "pending" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    {representativeCrId ? "Guardian OTP" : "Patient / guardian OTP"}
                  </Label>
                  <Input
                    className="max-w-[140px]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="SMS code"
                  />
                </div>
                <Button size="sm" disabled={busy} onClick={() => void verifyOtp("Approve")}>
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void verifyOtp("Reject")}
                >
                  Decline
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void resendConsentOtp()}>
                  Resend OTP
                </Button>
              </div>
            ) : null}
            {approved && session ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => void readShr()}>
                  Read SHR (sample)
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void startCloseVisit(false)}>
                  Close national visit
                </Button>
              </div>
            ) : null}
            {closeOtpRecord && session ? (
              <div className="flex flex-wrap items-end gap-2 border-t pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Close visit OTP</Label>
                  <Input
                    className="max-w-[140px]"
                    value={closeOtp}
                    onChange={(e) => setCloseOtp(e.target.value)}
                    placeholder="SMS code"
                  />
                </div>
                <Button size="sm" disabled={busy} onClick={() => void verifyCloseOtp()}>
                  Confirm close
                </Button>
              </div>
            ) : null}
            {readPreview ? (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">{readPreview}</pre>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
