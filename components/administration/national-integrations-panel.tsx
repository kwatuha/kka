"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "@/components/ui/use-toast"
import { integrationApiUrl } from "@/lib/integration-api"

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

type AfyaConnectStatus = {
  configured: boolean
  tokenUrlHost?: string | null
  clientIdHint?: string | null
  authMethod?: string
  agentConfigured?: boolean
  crBaseUrlConfigured?: boolean
  crApiStyle?: string
}

type RegistryStatus = {
  afyaConnect?: AfyaConnectStatus
  clientRegistry: {
    mode: string
    baseUrlConfigured: boolean
    autoResolveNupiOnRegister: boolean
  }
  facilityRegistry: {
    mode: string
    baseUrlConfigured: boolean
  }
  facilities: { activeBranches: number; withMflCode: number }
  nupiByStatus: Record<string, number>
}

type FacilityRow = {
  branchId: number
  branchCode: string
  branchName: string
  mflCode?: string | null
  kephLevel?: string | null
  facilityRegistrySyncedAt?: string | null
}

export function NationalIntegrationsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<RegistryStatus | null>(null)
  const [branches, setBranches] = useState<FacilityRow[]>([])
  const [crMode, setCrMode] = useState("sandbox")
  const [frMode, setFrMode] = useState("sandbox")
  const [autoNupi, setAutoNupi] = useState(true)
  const [mflLookup, setMflLookup] = useState("FID-47-105963-0")
  const [lookupResult, setLookupResult] = useState<string>("")
  const [hptQuery, setHptQuery] = useState("amox")
  const [hptResults, setHptResults] = useState<any[]>([])
  const [authTesting, setAuthTesting] = useState(false)
  const [authTestResult, setAuthTestResult] = useState<string>("")
  const [crTestId, setCrTestId] = useState("12345678")
  const [crTesting, setCrTesting] = useState(false)
  const [crTestResult, setCrTestResult] = useState<string>("")
  const [crSmokeTesting, setCrSmokeTesting] = useState(false)
  const [crSmokeResult, setCrSmokeResult] = useState<string>("")
  const [frTestId, setFrTestId] = useState("FID-47-105963-0")
  const [frTesting, setFrTesting] = useState(false)
  const [frTestResult, setFrTestResult] = useState<string>("")
  const [frSmokeTesting, setFrSmokeTesting] = useState(false)
  const [frSmokeResult, setFrSmokeResult] = useState<string>("")
  const [fhirTesting, setFhirTesting] = useState(false)
  const [fhirTestResult, setFhirTestResult] = useState<string>("")
  const [shrTesting, setShrTesting] = useState(false)
  const [shrTestResult, setShrTestResult] = useState<string>("")
  const [claimDoctorTesting, setClaimDoctorTesting] = useState(false)
  const [claimDoctorTestResult, setClaimDoctorTestResult] = useState<string>("")
  const [hwrIdType, setHwrIdType] = useState("registration_number")
  const [hwrIdNumber, setHwrIdNumber] = useState("A7000")
  const [hwrRegulator, setHwrRegulator] = useState("KMPDC")
  const [hwrSearching, setHwrSearching] = useState(false)
  const [hwrSearchError, setHwrSearchError] = useState("")
  const [hwrSearchSummary, setHwrSearchSummary] = useState<{
    fullName?: string | null
    hwrPuid?: string | null
    kmpdcRegistration?: string | null
    licensingBody?: string | null
    specialty?: string | null
    isActive?: boolean | null
    identifierType?: string | null
    identifierNumber?: string | null
    claimDoctor?: {
      identificationType?: string
      identificationNumber?: string
      regulationBody?: string
    } | null
  } | null>(null)

  const searchHpt = async () => {
    try {
      const res = await fetch(
        `/api/integrations/hpt/search?${new URLSearchParams({ q: hptQuery, limit: "10" })}`,
        { headers: authHeaders() }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "HPT search failed")
      setHptResults(data.results || [])
    } catch (err: any) {
      toast({ title: "HPT search failed", description: err.message, variant: "destructive" })
    }
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sRes, bRes] = await Promise.all([
        fetch(integrationApiUrl("/api/integrations/registry/settings"), { headers: authHeaders() }),
        fetch(integrationApiUrl("/api/integrations/mfl/branches"), { headers: authHeaders() }),
      ])
      if (!sRes.ok) throw new Error("Failed to load registry status")
      const sData = await sRes.json()
      setStatus(sData)
      setCrMode(sData.clientRegistry?.mode || "sandbox")
      setFrMode(sData.facilityRegistry?.mode || "sandbox")
      setAutoNupi(Boolean(sData.clientRegistry?.autoResolveNupiOnRegister))
      if (bRes.ok) {
        const bData = await bRes.json()
        setBranches(bData.branches || [])
      }
    } catch (err: any) {
      toast({
        title: "Registry panel failed",
        description: err.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch(integrationApiUrl("/api/integrations/registry/settings"), {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          clientRegistryMode: crMode,
          facilityRegistryMode: frMode,
          autoResolveNupiOnRegister: autoNupi,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Registry settings saved" })
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const syncMfl = async () => {
    try {
      setSyncing(true)
      const res = await fetch(integrationApiUrl("/api/integrations/mfl/sync"), {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Sync failed")
      const data = await res.json()
      toast({
        title: "MFL sync complete",
        description: `${data.synced || 0} of ${data.total || 0} facilities synced (${data.mode})`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const testAfyaConnectAuth = async () => {
    try {
      setAuthTesting(true)
      setAuthTestResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-auth"), {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!data.ok) {
        setAuthTestResult(data.error || data.message || "OAuth failed")
        toast({ title: "AfyaConnect OAuth failed", description: data.error, variant: "destructive" })
        return
      }
      setAuthTestResult(
        `Token OK · ${data.tokenUrlHost || "token URL"} · expires ~${data.expiresInSeconds}s · fingerprint ${data.tokenFingerprint || "—"}`
      )
      toast({ title: "AfyaConnect OAuth OK", description: `Latency ${data.latencyMs}ms` })
      await load()
    } catch (err: any) {
      setAuthTestResult(err.message || "Request failed")
      toast({ title: "OAuth test failed", description: err.message, variant: "destructive" })
    } finally {
      setAuthTesting(false)
    }
  }

  const testAfyaConnectCrSmoke = async () => {
    try {
      setCrSmokeTesting(true)
      setCrSmokeResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-cr-smoke"), {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!data.ok) {
        setCrSmokeResult(data.error || `Failed ${data.summary?.failed ?? "?"}/${data.summary?.total ?? 6}`)
        toast({ title: "CR smoke failed", description: data.error, variant: "destructive" })
        return
      }
      setCrSmokeResult(`All ${data.summary?.passed ?? 6}/${data.summary?.total ?? 6} UAT cases passed`)
      toast({ title: "CR smoke OK" })
    } catch (err: any) {
      setCrSmokeResult(err.message || "Request failed")
      toast({ title: "CR smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setCrSmokeTesting(false)
    }
  }

  const testAfyaConnectCr = async () => {
    try {
      setCrTesting(true)
      setCrTestResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-cr"), {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ idNumber: crTestId.trim(), identificationType: "National ID" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCrTestResult(data.error || data.message || "CR test failed")
        toast({ title: "CR test failed", description: data.message || data.error, variant: "destructive" })
        return
      }
      const r = data.result
      if (r?.found && r.nupi) {
        setCrTestResult(
          `Found ${r.nupi} · ${r.patient?.firstName || ""} ${r.patient?.lastName || ""} (${r.provider || r.mode})`
        )
      } else {
        setCrTestResult("No match in Client Registry (HTTP OK)")
      }
      toast({ title: "Client Registry test complete" })
    } catch (err: any) {
      setCrTestResult(err.message || "Request failed")
      toast({ title: "CR test failed", description: err.message, variant: "destructive" })
    } finally {
      setCrTesting(false)
    }
  }

  const testAfyaConnectShr = async () => {
    try {
      setShrTesting(true)
      setShrTestResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-shr-smoke"), {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!data.ok) {
        setShrTestResult(data.error || data.message || "SHR smoke failed")
        toast({ title: "SHR consent smoke failed", description: data.error, variant: "destructive" })
        return
      }
      const warn = Array.isArray(data.warnings) && data.warnings.length ? ` · ${data.warnings[0]}` : ""
      setShrTestResult(
        `Open visits: ${data.openVisits?.visitCount ?? "—"} for ${data.openVisits?.crId || "CR"} · ${data.latencyMs}ms${warn}`
      )
      toast({ title: "SHR open-visits smoke OK" })
    } catch (err: any) {
      setShrTestResult(err.message || "Request failed")
      toast({ title: "SHR smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setShrTesting(false)
    }
  }

  const searchHealthWorkerRegistry = async () => {
    const num = hwrIdNumber.trim()
    if (!num) {
      toast({ title: "Enter an ID or registration number", variant: "destructive" })
      return
    }
    try {
      setHwrSearching(true)
      setHwrSearchError("")
      setHwrSearchSummary(null)
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/hwr/search"), {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          identificationNumber: num,
          identificationType: hwrIdType,
          regulator: hwrRegulator,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.found) {
        const msg = data.error || data.message || data.hint || "No match in Health Worker Registry"
        setHwrSearchError(msg)
        toast({ title: "HWR search", description: msg, variant: "destructive" })
        return
      }
      setHwrSearchSummary(data.summary || null)
      toast({ title: "HWR match", description: data.summary?.fullName || undefined })
    } catch (err: any) {
      setHwrSearchError(err.message || "Request failed")
      toast({ title: "HWR search failed", description: err.message, variant: "destructive" })
    } finally {
      setHwrSearching(false)
    }
  }

  const testAfyaConnectClaimDoctor = async () => {
    try {
      setClaimDoctorTesting(true)
      setClaimDoctorTestResult("")
      const res = await fetch(
        integrationApiUrl("/api/integrations/afyaconnect/test-claim-doctor-smoke"),
        { method: "POST", headers: authHeaders() }
      )
      const data = await res.json()
      if (!data.ok) {
        setClaimDoctorTestResult(data.error || data.note || "Claim doctor smoke failed")
        toast({
          title: "Claim doctor smoke failed",
          description: data.error || data.note,
          variant: "destructive",
        })
        return
      }
      const resolved = data.resolvedForSubmit
      const src = resolved?.source ? ` · submit source ${resolved.source}` : ""
      const id = resolved?.practitioner?.identificationNumber
        ? ` · id ${resolved.practitioner.identificationNumber}`
        : ""
      setClaimDoctorTestResult(
        `HWR checks ${data.checks?.length ?? 0} · ${data.latencyMs}ms${src}${id}`
      )
      toast({ title: "Claim doctor smoke OK", description: src || id || undefined })
    } catch (err: any) {
      setClaimDoctorTestResult(err.message || "Request failed")
      toast({ title: "Claim doctor smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setClaimDoctorTesting(false)
    }
  }

  const testAfyaConnectFhir = async () => {
    try {
      setFhirTesting(true)
      setFhirTestResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-fhir-smoke"), {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!data.ok) {
        setFhirTestResult(data.error || data.message || "FHIR smoke failed")
        toast({ title: "FHIR SHR smoke failed", description: data.error, variant: "destructive" })
        return
      }
      setFhirTestResult(
        `SHR accept HTTP ${data.httpStatus} · ${data.summary || "OK"} · bundle ${data.bundleId || "—"}`
      )
      toast({ title: "FHIR SHR smoke OK", description: `${data.latencyMs}ms` })
    } catch (err: any) {
      setFhirTestResult(err.message || "Request failed")
      toast({ title: "FHIR smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setFhirTesting(false)
    }
  }

  const testAfyaConnectFrSmoke = async () => {
    try {
      setFrSmokeTesting(true)
      setFrSmokeResult("")
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-fr-smoke"), {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!data.ok) {
        setFrSmokeResult(data.error || "FR smoke failed")
        toast({ title: "FR smoke failed", description: data.error, variant: "destructive" })
        return
      }
      setFrSmokeResult(`All ${data.summary?.passed ?? 2}/${data.summary?.total ?? 2} UAT cases passed`)
      toast({ title: "FR smoke OK" })
    } catch (err: any) {
      setFrSmokeResult(err.message || "Request failed")
      toast({ title: "FR smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setFrSmokeTesting(false)
    }
  }

  const testAfyaConnectFr = async () => {
    try {
      setFrTesting(true)
      setFrTestResult("")
      const id = frTestId.trim()
      const res = await fetch(integrationApiUrl("/api/integrations/afyaconnect/test-fr"), {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          identifier: id,
          identifierType: /^FID-/i.test(id) ? "fr-code" : "registration-number",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFrTestResult(data.error || data.message || "FR test failed")
        toast({ title: "Facility Registry test failed", description: data.message || data.error, variant: "destructive" })
        return
      }
      const r = data.result
      if (r?.found && r.facility) {
        setFrTestResult(
          `Found ${r.facility.officialName || "—"} · ${r.facility.kephLevel || "—"} · ${r.facility.status || ""}`
        )
      } else {
        setFrTestResult("No match in Facility Registry (HTTP OK)")
      }
      toast({ title: "Facility Registry test complete" })
    } catch (err: any) {
      setFrTestResult(err.message || "Request failed")
      toast({ title: "FR test failed", description: err.message, variant: "destructive" })
    } finally {
      setFrTesting(false)
    }
  }

  const lookupMfl = async () => {
    try {
      setLookupResult("")
      const q = /^FID-/i.test(mflLookup.trim()) ? "?identifierType=fr-code" : ""
      const res = await fetch(`/api/integrations/mfl/${encodeURIComponent(mflLookup)}${q}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setLookupResult(data.reason || data.message || "Not found")
        return
      }
      const f = data.facility
      setLookupResult(
        `${f.officialName} · ${f.kephLevel || "—"} · ${f.county || ""} ${f.subCounty || ""}`.trim()
      )
    } catch (err: any) {
      setLookupResult(err.message || "Lookup failed")
    }
  }

  return (
    <Card id="national-integrations">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>National registries (NUPI / MFL)</CardTitle>
          <CardDescription>
            AfyaConnect OAuth and Client Registry (NUPI) plus MFL sync. Configure Consumer Key/Secret
            and URLs in server env; use Test OAuth before setting Client Registry mode to live.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !status ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-md border border-primary/20 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>AfyaConnect authentication</Label>
                <Badge variant={status?.afyaConnect?.configured ? "default" : "secondary"}>
                  {status?.afyaConnect?.configured ? "env configured" : "credentials missing"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Token host: {status?.afyaConnect?.tokenUrlHost || "—"} · CR base:{" "}
                {status?.afyaConnect?.crBaseUrlConfigured ? "set" : "—"} · Agent:{" "}
                {status?.afyaConnect?.agentConfigured ? "set" : "required for fetch-client v3"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="default" onClick={() => void testAfyaConnectAuth()} disabled={authTesting}>
                  {authTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test OAuth token
                </Button>
              </div>
              {authTestResult ? <p className="text-xs text-muted-foreground">{authTestResult}</p> : null}
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-xs">Test CR lookup (live mode only)</Label>
                  <Input
                    className="max-w-[220px]"
                    value={crTestId}
                    onChange={(e) => setCrTestId(e.target.value)}
                    placeholder="National ID number"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => void testAfyaConnectCr()} disabled={crTesting}>
                  {crTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Client Registry
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void testAfyaConnectCrSmoke()}
                  disabled={crSmokeTesting}
                >
                  {crSmokeTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Run CR smoke (6)
                </Button>
              </div>
              {crTestResult ? <p className="text-xs text-muted-foreground">{crTestResult}</p> : null}
              {crSmokeResult ? <p className="text-xs text-muted-foreground">{crSmokeResult}</p> : null}
              <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <Label className="text-xs">Facility Registry test (live mode)</Label>
                  <Input
                    value={frTestId}
                    onChange={(e) => setFrTestId(e.target.value)}
                    placeholder="fr-code e.g. FID-47-105963-0"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => void testAfyaConnectFr()} disabled={frTesting}>
                  {frTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test Facility Registry
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void testAfyaConnectFrSmoke()}
                  disabled={frSmokeTesting}
                >
                  {frSmokeTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Run FR smoke (2)
                </Button>
              </div>
              {frTestResult ? <p className="text-xs text-muted-foreground">{frTestResult}</p> : null}
              {frSmokeResult ? <p className="text-xs text-muted-foreground">{frSmokeResult}</p> : null}
              <div className="space-y-2 border-t border-border/60 pt-3">
                <Label className="text-xs">Health Worker Registry search (live middleware)</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Search by KMPDC registration (e.g. A7000) or National ID — not license PUID. Use returned
                  membership PUID on user records; use KMPDC reg for claim doctor env.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">ID type</Label>
                    <Select value={hwrIdType} onValueChange={setHwrIdType}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registration_number">Registration No (KMPDC)</SelectItem>
                        <SelectItem value="National ID">National ID</SelectItem>
                        <SelectItem value="Alien ID">Alien ID</SelectItem>
                        <SelectItem value="Refugee ID">Refugee ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Regulator</Label>
                    <Select value={hwrRegulator} onValueChange={setHwrRegulator}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KMPDC">KMPDC</SelectItem>
                        <SelectItem value="NCK">NCK</SelectItem>
                        <SelectItem value="COC">COC</SelectItem>
                        <SelectItem value="PPB">PPB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Number</Label>
                    <Input
                      value={hwrIdNumber}
                      onChange={(e) => setHwrIdNumber(e.target.value)}
                      placeholder="A7000 or 22334289"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void searchHealthWorkerRegistry()}
                    disabled={hwrSearching}
                  >
                    {hwrSearching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search HWR
                  </Button>
                </div>
                {hwrSearchError ? (
                  <p className="text-xs text-destructive">{hwrSearchError}</p>
                ) : null}
                {hwrSearchSummary ? (
                  <dl className="grid gap-1 text-xs sm:grid-cols-2 rounded-md bg-muted/40 p-3">
                    <div>
                      <dt className="text-muted-foreground">Practitioner</dt>
                      <dd className="font-medium">{hwrSearchSummary.fullName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">HWR PUID (user hwrPuid)</dt>
                      <dd className="font-mono">{hwrSearchSummary.hwrPuid || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">KMPDC registration</dt>
                      <dd className="font-mono">{hwrSearchSummary.kmpdcRegistration || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">National identifier</dt>
                      <dd>
                        {hwrSearchSummary.identifierType
                          ? `${hwrSearchSummary.identifierType}: ${hwrSearchSummary.identifierNumber || "—"}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Claim doctor submit</dt>
                      <dd className="font-mono text-[11px]">
                        {hwrSearchSummary.claimDoctor?.identificationType || "—"}{" "}
                        {hwrSearchSummary.claimDoctor?.identificationNumber || ""}
                        {hwrSearchSummary.claimDoctor?.regulationBody
                          ? ` · ${hwrSearchSummary.claimDoctor.regulationBody}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        {hwrSearchSummary.isActive === true
                          ? "Active"
                          : hwrSearchSummary.isActive === false
                            ? "Inactive"
                            : "—"}
                        {hwrSearchSummary.specialty ? ` · ${hwrSearchSummary.specialty}` : ""}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Label className="text-xs">FHIR SHR smoke (requires FHIR_MODE=live on server)</Label>
                <Button size="sm" variant="outline" onClick={() => void testAfyaConnectFhir()} disabled={fhirTesting}>
                  {fhirTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test SHR bundle submit
                </Button>
              </div>
              {fhirTestResult ? <p className="text-xs text-muted-foreground">{fhirTestResult}</p> : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Label className="text-xs">
                  SHR consent smoke (open-visits; needs SHR_FACILITY_FR_CODE)
                </Label>
                <Button size="sm" variant="outline" onClick={() => void testAfyaConnectShr()} disabled={shrTesting}>
                  {shrTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test SHR open-visits
                </Button>
              </div>
              {shrTestResult ? <p className="text-xs text-muted-foreground">{shrTestResult}</p> : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Label className="text-xs">
                  eClaims claim doctor (HWR from env + your user hwrPuid)
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void testAfyaConnectClaimDoctor()}
                  disabled={claimDoctorTesting}
                >
                  {claimDoctorTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test claim doctor HWR
                </Button>
              </div>
              {claimDoctorTestResult ? (
                <p className="text-xs text-muted-foreground">{claimDoctorTestResult}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Client Registry mode</Label>
                  <Badge variant="outline">{status?.clientRegistry.baseUrlConfigured ? "URL set" : "sandbox local"}</Badge>
                </div>
                <Select value={crMode} onValueChange={setCrMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Auto-resolve NUPI on register</Label>
                    <p className="text-xs text-muted-foreground">Uses ID number or phone</p>
                  </div>
                  <Switch checked={autoNupi} onCheckedChange={setAutoNupi} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(status?.nupiByStatus || {}).map(([k, v]) => (
                    <Badge key={k} variant="secondary">
                      {k}: {v}
                    </Badge>
                  ))}
                  {!Object.keys(status?.nupiByStatus || {}).length ? (
                    <span className="text-muted-foreground">No NUPI statuses yet</span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Facility Registry mode</Label>
                  <Badge variant="outline">
                    {status?.facilities.withMflCode || 0}/{status?.facilities.activeBranches || 0} with MFL
                  </Badge>
                </div>
                <Select value={frMode} onValueChange={setFrMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void saveSettings()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save modes
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void syncMfl()} disabled={syncing}>
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sync MFL now
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={mflLookup}
                    onChange={(e) => setMflLookup(e.target.value)}
                    placeholder="MFL code"
                    className="max-w-[140px]"
                  />
                  <Button size="sm" variant="outline" onClick={() => void lookupMfl()}>
                    <Search className="mr-2 h-4 w-4" />
                    Lookup
                  </Button>
                </div>
                {lookupResult ? <p className="text-xs text-muted-foreground">{lookupResult}</p> : null}
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <Label>HPT medicines catalogue (sandbox)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-[200px]"
                  value={hptQuery}
                  onChange={(e) => setHptQuery(e.target.value)}
                  placeholder="Search HPT name"
                />
                <Button size="sm" variant="outline" onClick={() => void searchHpt()}>
                  <Search className="mr-2 h-4 w-4" />
                  Search HPT
                </Button>
              </div>
              {hptResults.length ? (
                <ul className="text-xs space-y-1 mt-2">
                  {hptResults.map((r) => (
                    <li key={r.hptCode}>
                      <span className="font-mono text-primary">{r.hptCode}</span> — {r.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Map codes to medications via API PUT …/hpt/map-medication/:id</p>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Branch code</TableHead>
                    <TableHead>MFL</TableHead>
                    <TableHead>KEPH</TableHead>
                    <TableHead>Last sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.branchId}>
                      <TableCell>{b.branchName}</TableCell>
                      <TableCell className="font-mono text-xs">{b.branchCode}</TableCell>
                      <TableCell className="font-mono text-xs">{b.mflCode || "—"}</TableCell>
                      <TableCell>{b.kephLevel || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.facilityRegistrySyncedAt
                          ? new Date(b.facilityRegistrySyncedAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
