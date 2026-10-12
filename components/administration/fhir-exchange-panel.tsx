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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { HieSmokeRecorderPanel } from "@/components/administration/hie-smoke-recorder-panel"

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

type FhirSettings = {
  mode: string
  baseUrlConfigured: boolean
  autoPublishFhir: boolean
  exportsByStatus: Record<string, number>
  loincMapped: { mapped: number; total: number }
}

type LoincRow = {
  testTypeId: number
  testCode?: string
  testName: string
  category?: string
  loincCode?: string | null
}

type ExportRow = {
  exportId: number
  resourceType: string
  resourceId: string
  sourceType: string
  sourceId: string
  mode: string
  status: string
  createdAt?: string
}

export function FhirExchangePanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<FhirSettings | null>(null)
  const [mode, setMode] = useState("sandbox")
  const [autoPublish, setAutoPublish] = useState(true)
  const [tests, setTests] = useState<LoincRow[]>([])
  const [exports, setExports] = useState<ExportRow[]>([])
  const [previewId, setPreviewId] = useState("")
  const [previewKind, setPreviewKind] = useState<
    "patient" | "encounter" | "observation" | "composition" | "consent"
  >("patient")
  const [previewJson, setPreviewJson] = useState("")
  const [inboundReceipts, setInboundReceipts] = useState<any[]>([])
  const [kenhddPatientId, setKenhddPatientId] = useState("")
  const [hl7ResultId, setHl7ResultId] = useState("")
  const [standardsPreview, setStandardsPreview] = useState("")
  const [postingSampleInbound, setPostingSampleInbound] = useState(false)
  const [liveReadiness, setLiveReadiness] = useState<{
    readyCount: number
    totalScored: number
    items: { id: string; label: string; ready: boolean | null; manual?: boolean }[]
    runbookPath?: string
  } | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sRes, lRes, eRes, inRes, readyRes] = await Promise.all([
        fetch("/api/integrations/fhir/settings", { headers: authHeaders() }),
        fetch("/api/integrations/fhir/loinc-map", { headers: authHeaders() }),
        fetch("/api/integrations/fhir/exports?limit=20", { headers: authHeaders() }),
        fetch("/api/integrations/hie/inbound?limit=10", { headers: authHeaders() }),
        fetch("/api/integrations/fhir/live-readiness", { headers: authHeaders() }),
      ])
      if (!sRes.ok) throw new Error("Failed to load FHIR settings")
      const sData = await sRes.json()
      setSettings(sData)
      setMode(sData.mode || "sandbox")
      setAutoPublish(Boolean(sData.autoPublishFhir))
      if (lRes.ok) {
        const lData = await lRes.json()
        setTests(lData.tests || [])
      }
      if (eRes.ok) {
        const eData = await eRes.json()
        setExports(eData.exports || [])
      }
      if (inRes.ok) {
        const inData = await inRes.json()
        setInboundReceipts(inData.receipts || [])
      }
      if (readyRes.ok) {
        setLiveReadiness(await readyRes.json())
      } else {
        setLiveReadiness(null)
      }
    } catch (err: any) {
      toast({
        title: "FHIR panel failed",
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

  const save = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/integrations/fhir/settings", {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ fhirMode: mode, autoPublishFhir: autoPublish }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "FHIR settings saved" })
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveLoinc = async (testTypeId: number, loincCode: string) => {
    try {
      const res = await fetch(`/api/integrations/fhir/loinc-map/${testTypeId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ loincCode }),
      })
      if (!res.ok) throw new Error("LOINC update failed")
      toast({ title: "LOINC updated" })
      await load()
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    }
  }

  const preview = async () => {
    if (!previewId) {
      toast({ title: "Enter a source ID", variant: "destructive" })
      return
    }
    try {
      const previewUrl =
        previewKind === "composition"
          ? `/api/integrations/fhir/composition/${previewId}`
          : previewKind === "consent"
            ? `/api/integrations/fhir/consent/${previewId}`
            : `/api/integrations/fhir/${previewKind}/${previewId}`
      const res = await fetch(previewUrl, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Preview failed")
      setPreviewJson(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setPreviewJson("")
      toast({ title: "Preview failed", description: err.message, variant: "destructive" })
    }
  }

  const runKenhddValidate = async () => {
    if (!kenhddPatientId) {
      toast({ title: "Enter patient ID", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/integrations/kenhdd/validate/patient/${kenhddPatientId}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Validation failed")
      setStandardsPreview(JSON.stringify(data, null, 2))
      toast({
        title: "KENHDD report ready",
        description: `Score ${data.overallScore}% · ${data.demographics?.gaps?.length || 0} demographic gap(s)`,
      })
    } catch (err: any) {
      toast({ title: "KENHDD failed", description: err.message, variant: "destructive" })
    }
  }

  const downloadKenhddSample = async () => {
    try {
      const res = await fetch("/api/integrations/kenhdd/validate/sample?limit=30", {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Sample failed")
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "kenhdd-sample-validation.json"
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "KENHDD sample downloaded", description: `Avg ${data.averageScore}% · n=${data.sampleSize}` })
    } catch (err: any) {
      toast({ title: "Sample export failed", description: err.message, variant: "destructive" })
    }
  }

  const previewHl7Oru = async () => {
    if (!hl7ResultId) {
      toast({ title: "Enter lab result ID", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/integrations/hl7/oru/${hl7ResultId}`, { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "HL7 build failed")
      setStandardsPreview(data.hl7 || JSON.stringify(data, null, 2))
      toast({ title: "HL7 ORU^R01 generated", description: data.controlId })
    } catch (err: any) {
      toast({ title: "HL7 failed", description: err.message, variant: "destructive" })
    }
  }

  const postSampleInbound = async () => {
    try {
      setPostingSampleInbound(true)
      const res = await fetch("/api/integrations/hie/inbound/sample", {
        method: "POST",
        headers: authHeaders(true),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Sample inbound failed")
      toast({
        title: "Sample inbound Bundle accepted",
        description: `Receipt #${data.receiptId} · ${data.summary || data.resourceType}`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "Sample inbound failed", description: err.message, variant: "destructive" })
    } finally {
      setPostingSampleInbound(false)
    }
  }

  const publish = async () => {
    if (!previewId) return
    try {
      const publishUrl =
        previewKind === "composition"
          ? `/api/integrations/fhir/publish/composition/${previewId}`
          : previewKind === "consent"
            ? `/api/integrations/fhir/publish/consent/${previewId}`
            : `/api/integrations/fhir/publish/${previewKind}/${previewId}`
      const res = await fetch(publishUrl, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok && data.status === "failed") {
        throw new Error(data.error || data.message || "Publish failed")
      }
      toast({
        title: "FHIR published",
        description: `${data.count || 1} resource(s) via ${data.mode}`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" })
    }
  }

  return (
    <Card id="fhir-exchange">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>FHIR R4 clinical exchange</CardTitle>
          <CardDescription>
            Patient, Encounter, and Observation mediators (OpenHIM-compatible) with LOINC
            mapping for lab tests. Sandbox publishes locally + outbox; live posts to your FHIR channel URL.
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
            {liveReadiness ? (
              <div className="rounded-md border border-amber-200/80 bg-amber-50/50 p-4 dark:bg-amber-950/20">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <Label>AfyaConnect live readiness</Label>
                  <Badge variant={liveReadiness.readyCount === liveReadiness.totalScored ? "default" : "secondary"}>
                    {liveReadiness.readyCount}/{liveReadiness.totalScored} automated checks
                  </Badge>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {liveReadiness.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className={item.ready === true ? "text-emerald-700" : item.manual ? "" : "text-amber-800"}>
                        {item.manual ? "○" : item.ready ? "✓" : "✗"}
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Follow the integration runbook — flip to live only when MoH
                  credentials are issued.
                </p>
              </div>
            ) : null}

            <HieSmokeRecorderPanel />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Mediator mode</Label>
                  <Badge variant="outline">
                    {settings?.baseUrlConfigured ? "URL set" : "sandbox local"}
                  </Badge>
                </div>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live (OpenHIM)</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Auto-publish on register / encounter / lab final</Label>
                    <p className="text-xs text-muted-foreground">Builds R4 JSON and logs export</p>
                  </div>
                  <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                </div>
                <Button size="sm" onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save FHIR settings
                </Button>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    LOINC {settings?.loincMapped.mapped || 0}/{settings?.loincMapped.total || 0}
                  </Badge>
                  {Object.entries(settings?.exportsByStatus || {}).map(([k, v]) => (
                    <Badge key={k} variant="outline">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <Label>Preview / publish</Label>
                <div className="flex flex-wrap gap-2">
                  <Select value={previewKind} onValueChange={(v: any) => setPreviewKind(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="encounter">Encounter</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                      <SelectItem value="composition">Clinical summary</SelectItem>
                      <SelectItem value="consent">Consent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="max-w-[120px]"
                    placeholder="ID"
                    value={previewId}
                    onChange={(e) => setPreviewId(e.target.value)}
                  />
                  <Button size="sm" variant="outline" onClick={() => void preview()}>
                    Preview
                  </Button>
                  <Button size="sm" onClick={() => void publish()}>
                    Publish
                  </Button>
                </div>
                {previewJson ? (
                  <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-[10px] leading-snug">
                    {previewJson}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Patient = patientId · Encounter = recordId · Observation = lab resultId · Clinical
                    summary = patientId (Composition + DocumentReference bundle). Sandbox E2E:{" "}
                    the sandbox integration guide (ICT)
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <Label>KENHDD &amp; HL7</Label>
              <p className="text-xs text-muted-foreground">
                Validation report vs mapping v1 and sandbox HL7 ORU^R01 for lab results (national HIE remains
                FHIR-first).
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Patient ID (KENHDD)</Label>
                  <Input
                    className="w-[120px]"
                    value={kenhddPatientId}
                    onChange={(e) => setKenhddPatientId(e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => void runKenhddValidate()}>
                  Validate patient
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void downloadKenhddSample()}>
                  Sample JSON (30)
                </Button>
                <div className="space-y-1">
                  <Label className="text-xs">Lab result ID (HL7)</Label>
                  <Input
                    className="w-[120px]"
                    value={hl7ResultId}
                    onChange={(e) => setHl7ResultId(e.target.value)}
                    placeholder="resultId"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => void previewHl7Oru()}>
                  Build ORU^R01
                </Button>
              </div>
              {standardsPreview ? (
                <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-[10px] leading-snug whitespace-pre-wrap">
                  {standardsPreview}
                </pre>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">HIE inbound receipts (sandbox)</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void postSampleInbound()}
                  disabled={postingSampleInbound}
                >
                  {postingSampleInbound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Post sample Bundle
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inboundReceipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                          No inbound yet — use Post sample Bundle or follow the sandbox integration guide
                        </TableCell>
                      </TableRow>
                    ) : (
                      inboundReceipts.map((r) => (
                        <TableRow key={r.receiptId}>
                          <TableCell>{r.receiptId}</TableCell>
                          <TableCell>{r.resourceType}</TableCell>
                          <TableCell>{r.entryCount}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{r.payloadSummary}</TableCell>
                          <TableCell className="text-xs">{r.receivedAt}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">LOINC map (lab test types)</h3>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>LOINC</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.slice(0, 40).map((t) => (
                      <LoincEditRow key={t.testTypeId} row={t} onSave={saveLoinc} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Recent FHIR exports</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                          No exports yet — register a patient or publish from the preview box.
                        </TableCell>
                      </TableRow>
                    ) : (
                      exports.map((ex) => (
                        <TableRow key={ex.exportId}>
                          <TableCell className="font-mono text-xs">{ex.exportId}</TableCell>
                          <TableCell>
                            {ex.resourceType}/{ex.resourceId}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ex.sourceType}/{ex.sourceId}
                          </TableCell>
                          <TableCell>{ex.mode}</TableCell>
                          <TableCell>
                            <Badge variant={ex.status === "failed" ? "destructive" : "outline"}>
                              {ex.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function LoincEditRow({
  row,
  onSave,
}: {
  row: LoincRow
  onSave: (id: number, code: string) => Promise<void>
}) {
  const [code, setCode] = useState(row.loincCode || "")
  useEffect(() => {
    setCode(row.loincCode || "")
  }, [row.loincCode])
  return (
    <TableRow>
      <TableCell>
        <div className="text-sm">{row.testName}</div>
        <div className="text-[10px] text-muted-foreground">{row.category}</div>
      </TableCell>
      <TableCell className="font-mono text-xs">{row.testCode || "—"}</TableCell>
      <TableCell>
        <Input
          className="h-8 font-mono text-xs"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 58410-2"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          disabled={code === (row.loincCode || "")}
          onClick={() => void onSave(row.testTypeId, code)}
        >
          Save
        </Button>
      </TableCell>
    </TableRow>
  )
}
