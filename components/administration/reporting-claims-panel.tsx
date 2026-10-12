"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { cqmApi, ihrApi } from "@/lib/api"
import { downloadCqmAssessorPdf } from "@/lib/cqm-assessor-pdf"

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

export function ReportingClaimsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)
  const [idsrMode, setIdsrMode] = useState("sandbox")
  const [dhis2Mode, setDhis2Mode] = useState("sandbox")
  const [shaMode, setShaMode] = useState("sandbox")
  const [autoSha, setAutoSha] = useState(true)
  const [orgUnit, setOrgUnit] = useState("")
  const [alerts, setAlerts] = useState<any[]>([])
  const [exports, setExports] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [evalText, setEvalText] = useState("Suspected cholera with acute watery diarrhoea")
  const [period, setPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [claimId, setClaimId] = useState("")
  const [preview, setPreview] = useState("")
  const [weeklyReports, setWeeklyReports] = useState<any[]>([])
  const [mohExports, setMohExports] = useState<any[]>([])
  const [ihrEvents, setIhrEvents] = useState<any[]>([])
  const [ihrLinks, setIhrLinks] = useState<any[]>([])
  const [ihrAlertId, setIhrAlertId] = useState("")
  const [ihrEventCode, setIhrEventCode] = useState("")
  const [cqmPreview, setCqmPreview] = useState("")
  const [cqmPackage, setCqmPackage] = useState<any>(null)
  const [cqmSubmissions, setCqmSubmissions] = useState<any[]>([])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sRes, aRes, eRes, shRes, wRes, mohRes, ihrCat, ihrLinkRes, cqmSubRes] = await Promise.all([
        fetch("/api/integrations/phase4/settings", { headers: authHeaders() }),
        fetch("/api/integrations/idsr/alerts?limit=15", { headers: authHeaders() }),
        fetch("/api/integrations/dhis2/exports?limit=10", { headers: authHeaders() }),
        fetch("/api/integrations/sha/submissions?limit=10", { headers: authHeaders() }),
        fetch("/api/integrations/idsr/weekly-reports?limit=8", { headers: authHeaders() }),
        fetch("/api/moh-reports/exports?limit=8", { headers: authHeaders() }),
        ihrApi.getCatalog().catch(() => ({ events: [] })),
        ihrApi.getLinks(10).catch(() => ({ links: [] })),
        cqmApi.listSubmissions(10).catch(() => ({ submissions: [] })),
      ])
      if (!sRes.ok) throw new Error("Failed to load reporting settings")
      const s = await sRes.json()
      setSettings(s)
      setIdsrMode(s.idsr?.mode || "sandbox")
      setDhis2Mode(s.dhis2?.mode || "sandbox")
      setShaMode(s.sha?.mode || "sandbox")
      setAutoSha(Boolean(s.sha?.autoSubmitShaClaims))
      setOrgUnit(s.dhis2?.orgUnit || "")
      if (aRes.ok) setAlerts((await aRes.json()).alerts || [])
      if (eRes.ok) setExports((await eRes.json()).exports || [])
      if (shRes.ok) setSubmissions((await shRes.json()).submissions || [])
      if (wRes.ok) setWeeklyReports((await wRes.json()).reports || [])
      if (mohRes.ok) setMohExports((await mohRes.json()).exports || [])
      setIhrEvents(ihrCat?.events || [])
      setIhrLinks(ihrLinkRes?.links || [])
      setCqmSubmissions(cqmSubRes?.submissions || [])
    } catch (err: any) {
      toast({ title: "Reporting panel failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/integrations/phase4/settings", {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          idsrMode,
          dhis2Mode,
          dhis2OrgUnit: orgUnit || null,
          shaMode,
          autoSubmitShaClaims: autoSha,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Reporting settings saved" })
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const runMohScheduledExport = async () => {
    try {
      setBusy("moh-export")
      const res = await fetch("/api/moh-reports/scheduled-export", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "MOH export failed")
      setPreview(JSON.stringify(data.exports || data, null, 2))
      toast({
        title: "MOH routine exports generated",
        description: `${data.periodLabel} · 717/705/710 · SHA-256 logged`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "MOH export failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const runIdsrWeeklyExport = async () => {
    try {
      setBusy("idsr-week")
      const res = await fetch("/api/integrations/idsr/weekly-export", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Weekly export failed")
      setPreview(JSON.stringify(data.package || data, null, 2))
      toast({
        title: "IDSR weekly package generated",
        description: `${data.weekLabel} · ${data.alertCount} alert(s) · outbox idsr.weekly.report`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "IDSR weekly export failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const runIdsr = async () => {
    try {
      setBusy("idsr")
      const res = await fetch("/api/integrations/idsr/evaluate", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ text: evalText, sourceType: "manual", summary: "Manual IDSR check" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Evaluate failed")
      toast({
        title: data.matched ? "IDSR alert(s) raised" : "No notifiable match",
        description: `${(data.alerts || []).length} alert(s) · mode ${data.mode}`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "IDSR failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const runDhis2 = async (format: "json" | "sdmx-hd") => {
    try {
      setBusy(`dhis2-${format}`)
      const res = await fetch("/api/integrations/dhis2/export", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ period, format }),
      })
      const data = await res.json()
      if (!res.ok && data.status === "failed") throw new Error(data.error || data.message)
      setPreview(
        format === "sdmx-hd"
          ? data.sdmxHdXml || JSON.stringify(data.package, null, 2)
          : JSON.stringify(data.package || data.metrics, null, 2)
      )
      toast({
        title: "DHIS2 package built",
        description: `${data.period} · ${data.status} · ${format}`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "DHIS2 export failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const runCqmSummary = async () => {
    try {
      setBusy("cqm")
      const data = await cqmApi.getSummary()
      setCqmPackage(data)
      setCqmPreview(JSON.stringify(data, null, 2))
      toast({ title: "CQM indicators calculated", description: data.period?.label || "Current period" })
    } catch (err: any) {
      toast({ title: "CQM failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const downloadCqmCsv = async () => {
    try {
      setBusy("cqm-csv")
      const res = await fetch("/api/reporting/cqm/export.csv", { headers: authHeaders() })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "cqm-indicators.csv"
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "CQM CSV downloaded" })
    } catch (err: any) {
      toast({ title: "CQM export failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const downloadCqmPdf = async () => {
    try {
      setBusy("cqm-pdf")
      let pkg = cqmPackage
      if (!pkg?.indicators?.length) {
        pkg = await cqmApi.getSummary()
        setCqmPackage(pkg)
      }
      await downloadCqmAssessorPdf(pkg)
      toast({ title: "CQM report PDF downloaded" })
    } catch (err: any) {
      toast({ title: "CQM PDF failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const registerCqmSubmission = async () => {
    try {
      setBusy("cqm-submit")
      const result = await cqmApi.createSubmission({})
      toast({
        title: "CQM submission registered",
        description: `${result.submissionRef} · ${result.indicatorCount} indicators · SHA256 logged`,
      })
      const res = await fetch(cqmApi.submissionDownloadUrl(result.submissionId), {
        headers: authHeaders(),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${result.submissionRef}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      await load()
    } catch (err: any) {
      toast({ title: "CQM submission failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const downloadCqmJson = async () => {
    try {
      setBusy("cqm-json")
      const res = await fetch("/api/reporting/cqm/export.json", { headers: authHeaders() })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "cqm-indicators.json"
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "CQM JSON downloaded" })
    } catch (err: any) {
      toast({ title: "CQM JSON export failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const linkIhrAlert = async () => {
    const alertId = Number(ihrAlertId)
    if (!alertId || !ihrEventCode) {
      toast({ title: "Enter alert ID and IHR event", variant: "destructive" })
      return
    }
    try {
      setBusy("ihr")
      await ihrApi.linkAlert({ idsrAlertId: alertId, eventCode: ihrEventCode })
      toast({ title: "IHR event linked to IDSR alert" })
      setIhrAlertId("")
      await load()
    } catch (err: any) {
      toast({ title: "IHR link failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  const runSha = async () => {
    if (!claimId) {
      toast({ title: "Enter claim ID", variant: "destructive" })
      return
    }
    try {
      setBusy("sha")
      const res = await fetch(`/api/integrations/sha/submit/${claimId}`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ force: true }),
      })
      const data = await res.json()
      if (!res.ok && data.status === "failed") throw new Error(data.error || data.message)
      setPreview(JSON.stringify(data.payload || data, null, 2))
      toast({
        title: data.skipped ? "SHA skipped" : "SHA submitted",
        description: data.externalReference || data.reason || data.status,
      })
      await load()
    } catch (err: any) {
      toast({ title: "SHA submit failed", description: err.message, variant: "destructive" })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card id="reporting-claims">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Reporting & claims (IDSR / DHIS2 / SHA)</CardTitle>
          <CardDescription>
            Notifiable disease alerts, monthly DHIS2 / SDMX-HD aggregate packages, and Social
            Health Authority claim submissions.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !settings ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <ModeCard
                title="IDSR"
                mode={idsrMode}
                setMode={setIdsrMode}
                configured={settings?.idsr?.baseUrlConfigured}
                counts={settings?.idsr?.byStatus}
              />
              <ModeCard
                title="DHIS2"
                mode={dhis2Mode}
                setMode={setDhis2Mode}
                configured={settings?.dhis2?.baseUrlConfigured}
                counts={settings?.dhis2?.byStatus}
              />
              <div className="space-y-3 rounded-md border p-4">
                <Label>SHA claims</Label>
                <Select value={shaMode} onValueChange={setShaMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Auto-submit on claim submit</span>
                  <Switch checked={autoSha} onCheckedChange={setAutoSha} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(settings?.sha?.byStatus || {}).map(([k, v]) => (
                    <Badge key={k} variant="outline">
                      {k}: {String(v)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">DHIS2 org unit</Label>
                <Input
                  className="mt-1 max-w-[160px]"
                  value={orgUnit}
                  onChange={(e) => setOrgUnit(e.target.value)}
                  placeholder="MFL / OU id"
                />
              </div>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save modes
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <Label>IDSR evaluate (manual)</Label>
                <Textarea value={evalText} onChange={(e) => setEvalText(e.target.value)} rows={3} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void runIdsr()} disabled={busy === "idsr"}>
                    {busy === "idsr" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Raise alerts if notifiable
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void runIdsrWeeklyExport()}
                    disabled={busy === "idsr-week"}
                  >
                    {busy === "idsr-week" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Weekly IDSR export
                  </Button>
                </div>
              </div>
              <div className="space-y-3 rounded-md border p-4">
                <Label>DHIS2 / SDMX-HD export</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="max-w-[120px]"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="YYYYMM"
                  />
                  <Button size="sm" variant="secondary" onClick={() => void runDhis2("json")} disabled={!!busy}>
                    Export JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void runDhis2("sdmx-hd")} disabled={!!busy}>
                    Export SDMX-HD
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void runMohScheduledExport()}
                    disabled={busy === "moh-export"}
                  >
                    {busy === "moh-export" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    MOH 717/705/710 export
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="max-w-[120px]"
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    placeholder="Claim ID"
                  />
                  <Button size="sm" onClick={() => void runSha()} disabled={busy === "sha"}>
                    Submit to SHA
                  </Button>
                </div>
              </div>
            </div>

            {preview ? (
              <pre className="max-h-56 overflow-auto rounded bg-muted p-2 text-[10px] leading-snug">{preview}</pre>
            ) : null}

            <MiniTable
              title="Recent IDSR alerts"
              headers={["ID", "Disease", "Urgency", "Source", "Status"]}
              rows={alerts.map((a) => [
                a.alertId,
                a.diseaseName,
                a.urgency,
                `${a.sourceType}/${a.sourceId}`,
                a.status,
              ])}
              empty="No alerts yet"
            />

            <div className="space-y-3 rounded-md border p-4">
              <Label>IHR event catalog (stub — link to IDSR alert)</Label>
              <p className="text-xs text-muted-foreground">
                Partial IHR readiness: new IDSR alerts auto-link to IHR catalog when{" "}
                <code className="text-[10px]">idsrDiseaseCode</code> matches (e.g. MEASLES → IHR-MEASLES-OUTBREAK).
                Manual link below for other events.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  className="max-w-[100px]"
                  placeholder="Alert ID"
                  value={ihrAlertId}
                  onChange={(e) => setIhrAlertId(e.target.value)}
                />
                <Select value={ihrEventCode} onValueChange={setIhrEventCode}>
                  <SelectTrigger className="max-w-[280px]">
                    <SelectValue placeholder="IHR event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ihrEvents.map((ev) => (
                      <SelectItem key={ev.eventCode} value={ev.eventCode}>
                        {ev.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" onClick={() => void linkIhrAlert()} disabled={busy === "ihr"}>
                  Link alert
                </Button>
              </div>
              <MiniTable
                title="IHR ↔ IDSR links"
                headers={["Alert", "Event", "Disease", "When"]}
                rows={ihrLinks.map((l) => [
                  l.idsrAlertId,
                  l.eventTitle || l.eventCode,
                  l.diseaseCode || "—",
                  l.createdAt ? String(l.createdAt).slice(0, 10) : "—",
                ])}
                empty="No IHR links yet"
              />
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <Label>Clinical quality measures (HMIS-CQM-001…010)</Label>
              <p className="text-xs text-muted-foreground">
                Ten facility indicators (HMIS-CQM-001…010). Register a submission to audit hand-off to county/national
                quality office until a live CQM API is available.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void runCqmSummary()} disabled={busy === "cqm"}>
                  {busy === "cqm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Calculate indicators
                </Button>
                <Button size="sm" variant="outline" onClick={() => void downloadCqmCsv()} disabled={busy === "cqm-csv"}>
                  Download CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void downloadCqmJson()}
                  disabled={busy === "cqm-json"}
                >
                  Download JSON
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void downloadCqmPdf()}
                  disabled={busy === "cqm-pdf"}
                >
                  {busy === "cqm-pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() => void registerCqmSubmission()}
                  disabled={busy === "cqm-submit"}
                >
                  {busy === "cqm-submit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Register submission bundle
                </Button>
              </div>
              <MiniTable
                title="CQM submission register"
                headers={["Ref", "Period", "Status", "Submitted"]}
                rows={cqmSubmissions.map((s) => [
                  s.submissionRef,
                  `${s.periodStart} → ${s.periodEnd}`,
                  s.status,
                  s.submittedAt ? String(s.submittedAt).slice(0, 16).replace("T", " ") : "—",
                ])}
                empty="No submissions yet — use Register submission bundle"
              />
              {cqmPreview ? (
                <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-[10px] leading-snug">
                  {cqmPreview}
                </pre>
              ) : null}
            </div>
            <MiniTable
              title="IDSR weekly reports"
              headers={["Week", "Alerts", "Mode", "Status"]}
              rows={weeklyReports.map((r) => [
                r.weekLabel,
                String(r.alertCount),
                r.mode,
                r.status,
              ])}
              empty="No weekly packages yet — run Weekly IDSR export"
            />
            <MiniTable
              title="MOH report exports (checksum)"
              headers={["Report", "Period", "SHA-256", "Generated"]}
              rows={mohExports.map((e) => [
                e.reportCode,
                e.periodLabel,
                `${String(e.sha256 || "").slice(0, 12)}…`,
                e.generatedAt ? String(e.generatedAt).slice(0, 10) : "—",
              ])}
              empty="No MOH export packages yet"
            />
            <MiniTable
              title="DHIS2 exports"
              headers={["Period", "Format", "Org unit", "Status"]}
              rows={exports.map((e) => [e.period, e.format, e.orgUnit || "—", e.status])}
              empty="No exports yet"
            />
            <MiniTable
              title="SHA submissions"
              headers={["Claim", "Reference", "Mode", "Status"]}
              rows={submissions.map((s) => [
                s.claimNumber || s.claimId,
                s.externalReference || "—",
                s.mode,
                s.status,
              ])}
              empty="No SHA submissions yet"
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ModeCard({
  title,
  mode,
  setMode,
  configured,
  counts,
}: {
  title: string
  mode: string
  setMode: (v: string) => void
  configured?: boolean
  counts?: Record<string, number>
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Badge variant="outline">{configured ? "URL set" : "sandbox"}</Badge>
      </div>
      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sandbox">Sandbox</SelectItem>
          <SelectItem value="live">Live</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1">
        {Object.entries(counts || {}).map(([k, v]) => (
          <Badge key={k} variant="secondary">
            {k}: {v}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function MiniTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string
  headers: string[]
  rows: (string | number)[][]
  empty: string
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length} className="h-14 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>
                  {r.map((c, j) => (
                    <TableCell key={j} className="text-xs">
                      {c}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
