"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2, ShieldCheck, FileJson } from "lucide-react"
import { patientApi } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

const CONSENT_TYPE_OPTIONS = [
  { value: "treatment", label: "Treatment" },
  { value: "share_info", label: "Share information with care team" },
  { value: "photos", label: "Clinical photography" },
  { value: "hie_share", label: "Share via Kenya HIE (when live)" },
] as const

function labelForType(type: string) {
  return CONSENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
}

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

type ConsentRow = {
  consentId: number
  consentType: string
  granted: number | boolean
  grantedAt: string
  revokedAt?: string | null
  signatureName?: string | null
  notes?: string | null
  capturedByUsername?: string | null
  capturedByFirstName?: string | null
  capturedByLastName?: string | null
}

export function PatientConsentPanel({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [consentType, setConsentType] = useState<string>("share_info")
  const [granted, setGranted] = useState(true)
  const [signatureName, setSignatureName] = useState("")
  const [notes, setNotes] = useState("")
  const [fhirBusy, setFhirBusy] = useState<"preview" | "publish" | null>(null)
  const [revokeType, setRevokeType] = useState("hie_share")
  const [revokeReason, setRevokeReason] = useState("")
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await patientApi.getConsents(patientId)
      setConsents(data.consents || [])
    } catch (err: any) {
      toast({
        title: "Could not load consents",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    void load()
  }, [load])

  const submitConsent = async () => {
    try {
      setSaving(true)
      await patientApi.createConsent(patientId, {
        consentType,
        granted,
        signatureName: signatureName.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      toast({ title: "Consent recorded", description: "Audit trail updated." })
      setNotes("")
      await load()
    } catch (err: any) {
      toast({
        title: "Could not save consent",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const runFhir = async (mode: "preview" | "publish") => {
    try {
      setFhirBusy(mode)
      const path =
        mode === "preview"
          ? `/api/integrations/fhir/consent/${patientId}`
          : `/api/integrations/fhir/publish/consent/${patientId}`
      const res = await fetch(path, {
        method: mode === "publish" ? "POST" : "GET",
        headers: authHeaders(mode === "publish"),
        body: mode === "publish" ? "{}" : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || "FHIR request failed")
      if (mode === "preview") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `patient-${patientId}-consent-fhir.json`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: "FHIR Consent bundle downloaded" })
      } else {
        toast({
          title: "Consent bundle published (sandbox)",
          description: data.controlId || data.message || "Queued for integration outbox",
        })
      }
    } catch (err: any) {
      toast({
        title: "FHIR consent failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setFhirBusy(null)
    }
  }

  const revokeConsent = async () => {
    try {
      setRevoking(true)
      await patientApi.revokeConsent(patientId, {
        consentType: revokeType,
        reason: revokeReason.trim() || undefined,
        signatureName: signatureName.trim() || undefined,
      })
      toast({ title: "Consent withdrawn", description: "Audit trail updated." })
      setRevokeReason("")
      await load()
    } catch (err: any) {
      toast({
        title: "Could not withdraw consent",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setRevoking(false)
    }
  }

  const latestByType = new Map<string, ConsentRow>()
  for (const row of consents) {
    if (!latestByType.has(row.consentType)) latestByType.set(row.consentType, row)
  }

  function statusLabel(row: ConsentRow | undefined) {
    if (!row) return { text: "Not recorded", variant: "outline" as const }
    if (row.revokedAt) return { text: "Revoked (record)", variant: "secondary" as const }
    if (!row.granted) return { text: "Declined / withdrawn", variant: "secondary" as const }
    return { text: "Granted", variant: "default" as const }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Privacy &amp; consent. Record updates on the
          chart; export FHIR Consent for sandbox HIE readiness before live AfyaConnect credentials.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current status (latest per type)</CardTitle>
            <CardDescription>Most recent capture is shown on the chart</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {CONSENT_TYPE_OPTIONS.map((opt) => {
                  const row = latestByType.get(opt.value)
                  const st = statusLabel(row)
                  return (
                    <li key={opt.value} className="flex items-center justify-between gap-2">
                      <span>{opt.label}</span>
                      <Badge variant={st.variant}>{st.text}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record consent update</CardTitle>
            <CardDescription>Patient or guardian signature captured at registration can be renewed here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Consent type</Label>
              <Select value={consentType} onValueChange={setConsentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="consent-granted">Granted</Label>
              <Switch id="consent-granted" checked={granted} onCheckedChange={setGranted} />
            </div>
            <div className="space-y-2">
              <Label>Signature name</Label>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Patient / guardian name"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={() => void submitConsent()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save consent
            </Button>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={fhirBusy !== null}
                onClick={() => void runFhir("preview")}
              >
                {fhirBusy === "preview" ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-3 w-3" />
                )}
                Preview FHIR Consent
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={fhirBusy !== null}
                onClick={() => void runFhir("publish")}
              >
                {fhirBusy === "publish" ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                Publish (sandbox)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdraw consent</CardTitle>
          <CardDescription>
            Marks the active grant as revoked and records a declined row (audit + FHIR before live HIE share).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label>Type to withdraw</Label>
            <Select value={revokeType} onValueChange={setRevokeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-[2] space-y-2">
            <Label>Reason</Label>
            <Input
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Patient request, change of mind, etc."
            />
          </div>
          <Button variant="destructive" onClick={() => void revokeConsent()} disabled={revoking}>
            {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Withdraw
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consent history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consent rows yet — capture at registration or above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Captured by</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consents.map((c) => (
                    <TableRow key={c.consentId}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {c.grantedAt ? format(new Date(c.grantedAt), "dd MMM yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{labelForType(c.consentType)}</TableCell>
                      <TableCell>
                        <Badge variant={c.granted ? "default" : "secondary"}>
                          {c.granted ? "Granted" : "Declined"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.signatureName || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.capturedByUsername ||
                          [c.capturedByFirstName, c.capturedByLastName].filter(Boolean).join(" ") ||
                          "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {c.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
