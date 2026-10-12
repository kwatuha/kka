"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileText, Loader2, Play, RefreshCw } from "lucide-react"
import { evidenceApi } from "@/lib/api"
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
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

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

type EvidenceItem = {
  itemId: number
  domain: string
  code: string
  title: string
  description?: string
  evidencePath?: string
  demoStep?: string
  status: string
  notes?: string | null
  evidenceUrl?: string | null
}

const STATUS_OPTIONS = [
  "not_started",
  "in_progress",
  "met",
  "partial",
  "not_applicable",
] as const

export function EvidencePackPanel() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [documents, setDocuments] = useState<{ title: string; path: string }[]>([])
  const [docOpen, setDocOpen] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docBody, setDocBody] = useState("")
  const [portalRows, setPortalRows] = useState<
    { field: string; recommended: string; section: string; evidence: { code: string; status: string }[] }[]
  >([])
  const [drafts, setDrafts] = useState<
    Record<number, { status: string; notes: string; evidenceUrl: string }>
  >({})
  const [readiness, setReadiness] = useState<{
    productReadyForAssessorDemo?: boolean
    scores?: {
      implementedCoveragePct?: number
      checklistPct?: number
      implementedNotMarked?: number
    }
    implementedNotMarked?: { code: string; title: string }[]
    operationalBlockers?: { id: string; label: string; category: string }[]
    recommendedActions?: string[]
    sandboxSmoke?: { passed?: boolean }
    messagingCompliance?: {
      smtpConfigured?: boolean
      idsrAlertEmail?: { deliverable?: boolean; recipientCount?: number }
    }
    preHieCompliance?: {
      idsrEmailReady?: boolean
      productSandboxReady?: boolean
      reviewDoc?: string
    }
    liveHie?: {
      readyCount?: number
      totalScored?: number
      modes?: { fhir?: string; clientRegistry?: string }
      items?: { id: string; label: string; ready: boolean | null; manual?: boolean }[]
      runbookPath?: string
      disclaimer?: string
    }
  } | null>(null)
  const [smokeRunning, setSmokeRunning] = useState(false)
  const [smtpTestTo, setSmtpTestTo] = useState("")
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smokeResult, setSmokeResult] = useState<{
    passed: boolean
    passedCount: number
    totalChecks: number
    checks: { id: string; label: string; ready: boolean; detail?: string }[]
    generatedAt: string
  } | null>(null)

  const runSmtpTest = async () => {
    const to = smtpTestTo.trim()
    if (!to.includes("@")) {
      toast({ title: "Enter a valid email", variant: "destructive" })
      return
    }
    try {
      setSmtpTesting(true)
      const res = await fetch("/api/security/smtp-test", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || "SMTP test failed")
      toast({ title: "Test email sent", description: `Message ID: ${data.messageId || "ok"}` })
    } catch (err: any) {
      toast({ title: "SMTP test failed", description: err.message, variant: "destructive" })
    } finally {
      setSmtpTesting(false)
    }
  }

  const runSandboxSmoke = async () => {
    try {
      setSmokeRunning(true)
      const data = await evidenceApi.getSandboxSmoke()
      setSmokeResult(data)
      toast({
        title: data.passed ? "Sandbox smoke passed" : "Sandbox smoke needs review",
        description: `${data.passedCount}/${data.totalChecks} checks ready`,
      })
    } catch (err: any) {
      toast({ title: "Sandbox smoke failed", description: err.message, variant: "destructive" })
    } finally {
      setSmokeRunning(false)
    }
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/integrations/evidence/checklist", { headers: authHeaders() })
      if (!res.ok) throw new Error("Failed to load checklist")
      const data = await res.json()
      setSummary(data.summary || {})
      setItems(data.items || [])
      setDocuments(data.documents || [])
      try {
        const pRes = await fetch("/api/integrations/evidence/portal-corrections", {
          headers: authHeaders(),
        })
        if (pRes.ok) {
          const pData = await pRes.json()
          setPortalRows(pData.corrections || [])
        } else {
          setPortalRows([])
        }
      } catch {
        setPortalRows([])
      }
      try {
        const rRes = await fetch("/api/integrations/evidence/attestation-readiness", {
          headers: authHeaders(),
        })
        if (rRes.ok) {
          setReadiness(await rRes.json())
        } else {
          setReadiness(null)
        }
      } catch {
        setReadiness(null)
      }
      const next: Record<number, { status: string; notes: string; evidenceUrl: string }> = {}
      for (const it of data.items || []) {
        next[it.itemId] = {
          status: it.status || "not_started",
          notes: it.notes || "",
          evidenceUrl: it.evidenceUrl || "",
        }
      }
      setDrafts(next)
    } catch (err: any) {
      toast({ title: "Evidence pack failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pct = useMemo(() => {
    const total = summary.total || 0
    if (!total) return 0
    return Math.round(((summary.met || 0) / total) * 100)
  }, [summary])

  const saveItem = async (itemId: number) => {
    const draft = drafts[itemId]
    if (!draft) return
    try {
      setSavingId(itemId)
      const res = await fetch(`/api/integrations/evidence/items/${itemId}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          status: draft.status,
          notes: draft.notes,
          evidenceUrl: draft.evidenceUrl?.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Attestation updated" })
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  const markAllImplemented = async () => {
    try {
      setSavingId(-1)
      const res = await fetch("/api/integrations/evidence/mark-implemented", {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Mark failed")
      const data = await res.json()
      const by = data.byStatus
        ? Object.entries(data.byStatus)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")
        : `${data.affected || 0} updated`
      toast({ title: "Checklist synced", description: by || `${data.affected || 0} rows updated` })
      await load()
    } catch (err: any) {
      toast({ title: "Mark failed", description: err.message, variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  const exportAuditCsv = async () => {
    try {
      const res = await fetch("/api/audit/logs/export.csv?limit=500", { headers: authHeaders() })
      if (!res.ok) throw new Error("Audit export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hmis-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Audit log CSV downloaded" })
    } catch (err: any) {
      toast({ title: "Audit export failed", description: err.message, variant: "destructive" })
    }
  }

  const exportPortalGuide = async () => {
    try {
      const res = await fetch("/api/integrations/evidence/portal-corrections", {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Portal guide failed")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `dha-portal-corrections-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Portal corrections JSON downloaded" })
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" })
    }
  }

  const downloadRegistrationProfile = async () => {
    try {
      const res = await fetch("/api/integrations/evidence/registration-profile", {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Registration profile failed")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `dha-registration-profile-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Registration profile downloaded" })
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" })
    }
  }

  const downloadClarificationLetter = async () => {
    try {
      const res = await fetch("/api/integrations/evidence/clarification-letter", {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Clarification letter failed")
      const text = await res.text()
      const blob = new Blob([text], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DHA_clarification_letter_${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Clarification letter downloaded", description: "Convert to PDF and sign for portal." })
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" })
    }
  }

  const exportPack = async () => {
    try {
      const res = await fetch("/api/integrations/evidence/export", { headers: authHeaders() })
      if (!res.ok) throw new Error("Export failed")
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `dha-evidence-pack-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Evidence pack exported" })
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" })
    }
  }

  const openDoc = async (docPath: string, title: string) => {
    const name = docPath.split("/").pop() || ""
    try {
      setDocTitle(title)
      setDocBody("Loading…")
      setDocOpen(true)
      const res = await fetch(`/api/integrations/evidence/documents/${encodeURIComponent(name)}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setDocBody(data.message || "Document unavailable in API image. See repository docs/ folder.")
        return
      }
      setDocBody(data.content || "")
    } catch (err: any) {
      setDocBody(err.message || "Failed to load document")
    }
  }

  return (
    <Card id="dha-evidence-pack">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Compliance &amp; security exports</CardTitle>
          <CardDescription>
            Internal checklist, policy documents, and JSON export for ICT or audit use. Progress:{" "}
            {summary.met || 0}/{summary.total || 0} met ({pct}%). For encryption at rest, attach host screenshots per{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() =>
                void openDoc("docs/DHA_ENCRYPTION_EVIDENCE_CHECKLIST.md", "Encryption evidence checklist")
              }
            >
              encryption evidence checklist
            </button>
            .
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void markAllImplemented()} disabled={savingId === -1}>
            Sync checklist (met + partial)
          </Button>
          <Button size="sm" variant="outline" onClick={() => void exportAuditCsv()}>
            <Download className="mr-2 h-4 w-4" />
            Audit CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => void exportPortalGuide()}>
            Portal guide JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => void downloadRegistrationProfile()}>
            Registration profile
          </Button>
          <Button size="sm" variant="outline" onClick={() => void downloadClarificationLetter()}>
            Clarification letter
          </Button>
          <Button size="sm" onClick={() => void exportPack()}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !items.length ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary)
                .filter(([k]) => k !== "total")
                .map(([k, v]) => (
                  <Badge key={k} variant={k === "met" ? "default" : "outline"}>
                    {k}: {v}
                  </Badge>
                ))}
            </div>

            {readiness ? (
              <div className="rounded-md border border-blue-200/80 bg-blue-50/40 p-4 dark:bg-blue-950/20">
                <h3 className="mb-2 text-sm font-medium">Registration &amp; readiness summary</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  In-code coverage: {readiness.scores?.implementedCoveragePct ?? "—"}% · Checklist met:{" "}
                  {readiness.scores?.checklistPct ?? "—"}% · Sandbox smoke:{" "}
                  {readiness.sandboxSmoke?.passed ? "pass" : "review"} · Demo-ready:{" "}
                  {readiness.productReadyForAssessorDemo ? "yes" : "needs review"}
                </p>
                {readiness.implementedNotMarked && readiness.implementedNotMarked.length > 0 ? (
                  <p className="mb-2 text-xs text-amber-900 dark:text-amber-200">
                    {readiness.implementedNotMarked.length} implemented evidence code(s) still not marked — use
                    &quot;Mark implemented (auto list)&quot;.
                  </p>
                ) : null}
                {readiness.operationalBlockers && readiness.operationalBlockers.length > 0 ? (
                  <ul className="mb-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {readiness.operationalBlockers.map((b) => (
                      <li key={b.id}>{b.label}</li>
                    ))}
                  </ul>
                ) : null}
                {readiness.recommendedActions?.map((a) => (
                  <p key={a} className="text-xs text-muted-foreground">
                    • {a}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="rounded-md border p-4">
              <h3 className="mb-2 text-sm font-medium">Facility email (REP-IDSR-EMAIL)</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                IDSR immediate alerts use SMTP + IDSR_ALERT_EMAIL on the server. Sandbox smoke includes this check.
              </p>
              <p className="mb-2 text-xs">
                SMTP:{" "}
                <span className={readiness?.messagingCompliance?.smtpConfigured ? "text-emerald-700" : "text-amber-800"}>
                  {readiness?.messagingCompliance?.smtpConfigured ? "configured" : "not configured"}
                </span>
                {" · "}
                IDSR recipients: {readiness?.messagingCompliance?.idsrAlertEmail?.recipientCount ?? 0}
                {" · "}
                Deliverable:{" "}
                {readiness?.preHieCompliance?.idsrEmailReady || readiness?.messagingCompliance?.idsrAlertEmail?.deliverable
                  ? "yes"
                  : "no"}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <Label htmlFor="smtp-test-to" className="text-xs">
                    Admin SMTP test
                  </Label>
                  <Input
                    id="smtp-test-to"
                    type="email"
                    placeholder="duty@facility.co.ke"
                    value={smtpTestTo}
                    onChange={(e) => setSmtpTestTo(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="outline" disabled={smtpTesting} onClick={() => void runSmtpTest()}>
                  {smtpTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send test
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Sandbox smoke (OPS-SBX-AUTO)</h3>
                <Button size="sm" variant="outline" onClick={() => void runSandboxSmoke()} disabled={smokeRunning}>
                  {smokeRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run now
                </Button>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Validates evidence catalog, IDSR, registry settings, and sandbox interop activity — no live HIE
                credentials required.
              </p>
              {smokeResult ? (
                <ul className="space-y-1 text-xs">
                  {smokeResult.checks.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-start gap-2">
                      <span className={c.ready ? "text-emerald-700" : "text-amber-800"}>
                        {c.ready ? "✓" : "✗"}
                      </span>
                      <span className="font-medium">{c.label}</span>
                      {c.detail ? <span className="text-muted-foreground">({c.detail})</span> : null}
                    </li>
                  ))}
                  <li className="pt-1 text-muted-foreground">
                    {smokeResult.passedCount}/{smokeResult.totalChecks} passed ·{" "}
                    {new Date(smokeResult.generatedAt).toLocaleString()}
                  </li>
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Last cached readiness status:{" "}
                  {readiness?.sandboxSmoke?.passed ? "pass" : "review"} — run for live checklist.
                </p>
              )}
            </div>

            {readiness?.liveHie ? (
              <div className="rounded-md border border-amber-200/80 bg-amber-50/40 p-4 dark:bg-amber-950/20">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">AfyaConnect / live HIE prep (awaiting credentials)</h3>
                  <Badge variant="outline">
                    {readiness.liveHie.readyCount ?? 0}/{readiness.liveHie.totalScored ?? 0} checks
                  </Badge>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  FHIR mode: {readiness.liveHie.modes?.fhir ?? "—"} · Client Registry:{" "}
                  {readiness.liveHie.modes?.clientRegistry ?? "—"}. Full checklist: Administration → System Config →
                  FHIR R4 clinical exchange.
                </p>
                <ul className="mb-2 space-y-1 text-xs text-muted-foreground">
                  {(readiness.liveHie.items || []).map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className={item.ready === true ? "text-emerald-700" : "text-amber-800"}>
                        {item.manual ? "○" : item.ready ? "✓" : "✗"}
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
                {readiness.liveHie.disclaimer ? (
                  <p className="text-[10px] text-muted-foreground">{readiness.liveHie.disclaimer}</p>
                ) : null}
              </div>
            ) : null}

            {portalRows.length > 0 ? (
              <div className="rounded-md border p-4">
                <h3 className="mb-2 text-sm font-medium">Portal field recommendations</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Reference when updating national portal registration fields.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Portal field</TableHead>
                        <TableHead>Set to</TableHead>
                        <TableHead>Evidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portalRows.map((row) => (
                        <TableRow key={row.field}>
                          <TableCell className="text-xs font-medium">{row.field}</TableCell>
                          <TableCell className="text-xs">{row.recommended}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {row.evidence.map((e) => `${e.code}:${e.status}`).join(" · ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-medium">Documents</h3>
              <div className="flex flex-wrap gap-2">
                {documents.map((d) => (
                  <Button
                    key={d.path}
                    size="sm"
                    variant="outline"
                    onClick={() => void openDoc(d.path, d.title)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {d.title}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes / evidence URL</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const draft = drafts[it.itemId] || {
                      status: it.status,
                      notes: "",
                      evidenceUrl: it.evidenceUrl || "",
                    }
                    const wantsUrl =
                      it.code.startsWith("SEC-") ||
                      it.code === "OPS-CRON-RUNBOOK" ||
                      it.code === "GOV-REATTEST" ||
                      it.code === "GOV-EVID-URL"
                    return (
                      <TableRow key={it.itemId}>
                        <TableCell className="text-xs">{it.domain}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{it.title}</div>
                          <div className="text-[10px] text-muted-foreground">{it.code}</div>
                          {it.demoStep ? (
                            <div className="mt-1 text-[10px] text-muted-foreground">Demo: {it.demoStep}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft.status}
                            onValueChange={(v) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.itemId]: { ...prev[it.itemId], ...draft, status: v },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="space-y-1">
                          <Input
                            className="h-8 text-xs"
                            value={draft.notes}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.itemId]: { ...draft, notes: e.target.value },
                              }))
                            }
                            placeholder="Notes"
                          />
                          {wantsUrl ? (
                            <Input
                              className="h-8 text-xs"
                              value={draft.evidenceUrl}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [it.itemId]: { ...draft, evidenceUrl: e.target.value },
                                }))
                              }
                              placeholder="https://… screenshot or doc link (SEC / ops evidence)"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={savingId === it.itemId}
                            onClick={() => void saveItem(it.itemId)}
                          >
                            {savingId === it.itemId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              <Label className="text-foreground">Export tip</Label>
              <p className="mt-1 text-xs">
                Complete the integration walkthrough end-to-end, then export this checklist JSON with your policy and
                architecture documents for audit archives.
              </p>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{docTitle}</DialogTitle>
          </DialogHeader>
          <Textarea readOnly value={docBody} className="min-h-[60vh] font-mono text-[11px]" />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
