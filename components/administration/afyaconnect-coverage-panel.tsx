"use client"

import { useState } from "react"
import { Loader2, PlayCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { integrationFetch } from "@/lib/integration-api"

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

type Preflight = {
  ok?: boolean
  latencyMs?: number
  auth?: { ok?: boolean }
  cr?: {
    ok?: boolean
    error?: string | null
    nationalCrUnavailable?: boolean
    hmisConfiguredOk?: boolean
  }
  fr?: { ok?: boolean; error?: string | null }
  shr?: { ok?: boolean; error?: string | null; warnings?: string[] | null }
  fhir?: { ok?: boolean; error?: string | null }
  eligibility?: {
    ok?: boolean
    error?: string | null
    mode?: string
    sampleId?: string | null
    memberCrNumber?: string | null
    statusDesc?: string | null
  }
  eclaimsRead?: {
    ok?: boolean
    error?: string | null
    mode?: string
    patientCrId?: string | null
    parentBenefitsCount?: number | null
    subBenefitsCount?: number | null
    outpatientSubBenefitsCount?: number | null
    inpatientSubBenefitsCount?: number | null
    inpatientPackagesAvailable?: boolean | null
    parentBenefitCodes?: string[] | null
    witnessTracks?: Record<string, { status: string; label: string; detail: string }> | null
    uatSmokeNote?: string | null
  }
  contacts?: {
    ok?: boolean
    error?: string | null
    contactsCount?: number | null
  }
  biometrics?: {
    ok?: boolean
    skipped?: boolean
    configured?: boolean
    reason?: string | null
  }
  hwr?: { ok?: boolean; error?: string | null; practitionerName?: string | null }
  claimDoctor?: { ok?: boolean; error?: string | null; source?: string | null }
  nextSteps?: string[]
  witnessChartSteps?: string[]
  eclaimsConfig?: {
    mode?: string
    paths?: Record<string, unknown>
    biometrics?: { configured?: boolean }
  }
}

function rowError(row: { ok?: boolean; error?: string | null } | undefined): string | null {
  if (!row?.error) return null
  const e = String(row.error)
  if (e.trim().startsWith("<")) return "National gateway HTML error — retry or check DHA UAT status"
  return e.length > 120 ? `${e.slice(0, 120)}…` : e
}

const ROWS = [
  { key: "auth", label: "OAuth" },
  { key: "cr", label: "Client Registry" },
  { key: "fr", label: "Facility Registry" },
  { key: "hwr", label: "Health Worker Registry" },
  { key: "claimDoctor", label: "Claim doctor resolve" },
  { key: "shr", label: "SHR (open visits)" },
  { key: "fhir", label: "FHIR transmit" },
  { key: "eligibility", label: "SHA eligibility" },
  { key: "eclaimsRead", label: "eClaims read (benefits)" },
  { key: "contacts", label: "Claims contacts (CR)" },
  { key: "biometrics", label: "Biometrics env (optional)" },
] as const

export function AfyaConnectCoveragePanel() {
  const [running, setRunning] = useState(false)
  const [docBusy, setDocBusy] = useState(false)
  const [outstandingBusy, setOutstandingBusy] = useState(false)
  const [report, setReport] = useState<Preflight | null>(null)

  const downloadCoverageDoc = async () => {
    try {
      setDocBusy(true)
      const res = await integrationFetch("/api/integrations/afyaconnect/coverage-doc")
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message || "Coverage document not available on server")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "DHA_AFYACONNECT_INTEGRATION_COVERAGE.docx"
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Coverage document downloaded" })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed"
      toast({ title: "Coverage doc", description: msg, variant: "destructive" })
    } finally {
      setDocBusy(false)
    }
  }

  const downloadOutstandingDoc = async () => {
    try {
      setOutstandingBusy(true)
      const res = await integrationFetch("/api/integrations/afyaconnect/outstanding-doc")
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message || "Outstanding doc not available on server")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "DHA_INTEGRATION_OUTSTANDING.docx"
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Outstanding work document downloaded" })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed"
      toast({ title: "Outstanding doc", description: msg, variant: "destructive" })
    } finally {
      setOutstandingBusy(false)
    }
  }

  const runPreflight = async () => {
    try {
      setRunning(true)
      const res = await integrationFetch("/api/integrations/afyaconnect/preflight", {
        method: "POST",
        headers: authHeaders(true),
      })
      const data = (await res.json()) as Preflight
      setReport(data)
      toast({
        title: data.ok ? "Preflight PASS" : "Preflight issues",
        description: data.ok
          ? `All smokes OK (${data.latencyMs}ms). Record in HIE smoke log.`
          : "See failing rows below — fix before witness UAT.",
        variant: data.ok ? "default" : "destructive",
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Preflight failed"
      toast({ title: "Preflight error", description: msg, variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card id="afyaconnect-coverage">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>AfyaConnect integration coverage</CardTitle>
          <CardDescription>
            Run all HIE smokes in one step. Full matrix:{" "}
            <span className="font-mono text-muted-foreground">DHA_AFYACONNECT_INTEGRATION_COVERAGE</span>
            {" · Progress / effort: "}
            <span className="font-mono text-muted-foreground">DHA_INTEGRATION_OUTSTANDING</span>
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void runPreflight()} disabled={running}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Run preflight
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={docBusy}
            onClick={() => void downloadCoverageDoc()}
          >
            {docBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Full coverage (.docx)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={outstandingBusy}
            onClick={() => void downloadOutstandingDoc()}
          >
            {outstandingBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Outstanding (.docx)
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <a
              href="https://afyaconnect.dha.go.ke/hie-api"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              AfyaConnect HIE
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {ROWS.map(({ key, label }) => {
            const row = report?.[key as keyof Preflight] as {
              ok?: boolean
              error?: string | null
              nationalCrUnavailable?: boolean
              hmisConfiguredOk?: boolean
              skipped?: boolean
              configured?: boolean
            } | undefined
            const crDhaOutage =
              key === "cr" && row?.nationalCrUnavailable && row?.hmisConfiguredOk
            return (
              <li
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span>{label}</span>
                {!report ? (
                  <Badge variant="outline">—</Badge>
                ) : crDhaOutage ? (
                  <Badge
                    className="border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
                    title={rowError(row) || undefined}
                  >
                    DHA UAT
                  </Badge>
                ) : row?.ok &&
                  (key !== "biometrics" || row.skipped || row.configured) ? (
                  <Badge
                    className={
                      key === "biometrics" && row.skipped
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-600"
                    }
                  >
                    {key === "biometrics" && row.skipped ? "SKIP" : "PASS"}
                  </Badge>
                ) : (
                  <Badge variant="destructive" title={rowError(row) || undefined}>
                    FAIL
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
        {report?.cr?.nationalCrUnavailable ? (
          <p className="text-xs text-amber-900 dark:text-amber-200 rounded-md border border-amber-300/80 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2">
            <span className="font-medium">Client Registry search</span> is failing on{" "}
            <span className="font-medium">DHA UAT</span> (national{" "}
            <code className="text-[10px]">GET /patients</code> server error). HMIS OAuth and
            eligibility/eClaims smokes can still pass. Retry later or contact{" "}
            <span className="font-mono">afyaconnect.dha@gmail.com</span>. For preauth UAT, save a
            local patient with NUPI <span className="font-mono">CR0490482291444-0</span>.
          </p>
        ) : null}
        {report?.eclaimsRead?.witnessTracks ? (
          <div className="rounded-md border border-amber-200/80 bg-amber-50/60 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-medium text-foreground">Witness tracks (preflight member CR)</p>
            {report.eclaimsRead.uatSmokeNote ? (
              <p className="mt-1 text-muted-foreground">{report.eclaimsRead.uatSmokeNote}</p>
            ) : null}
            <ul className="mt-2 space-y-1.5">
              {Object.entries(report.eclaimsRead.witnessTracks).map(([key, track]) => (
                <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background/70 px-2 py-1">
                  <span>
                    <span className="font-medium">{track.label}</span>
                    <span className="text-muted-foreground"> — {track.detail}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      track.status === "ready"
                        ? "border-emerald-400 text-emerald-800"
                        : track.status === "awaiting_dha"
                          ? "border-amber-500 text-amber-900"
                          : ""
                    }
                  >
                    {track.status === "ready"
                      ? "READY"
                      : track.status === "awaiting_dha"
                        ? "AWAIT DHA"
                        : track.status.toUpperCase()}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              IP readiness CLI:{" "}
              <code className="text-[9px]">node scripts/test-afyaconnect-eclaims-ip-readiness.js</code>
            </p>
          </div>
        ) : null}
        {report?.witnessChartSteps?.length ? (
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <p className="font-medium text-foreground">Witness UAT — patient chart (eClaims)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              {report.witnessChartSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {report?.nextSteps?.length ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {report.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : null}
        {report?.eclaimsConfig?.paths ? (
          <details className="rounded-md border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              eClaims API paths (compare to Postman)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto text-[10px]">
              {JSON.stringify(report.eclaimsConfig.paths, null, 2)}
            </pre>
            <p className="mt-1 text-muted-foreground">
              CLI:{" "}
              <code className="text-[10px]">
                docker compose … exec api node scripts/test-afyaconnect-eclaims-config.js
              </code>
            </p>
          </details>
        ) : null}
        {report && !report.ok ? (
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : null}
        <p className="text-xs text-muted-foreground">
          <strong>Claims:</strong>{" "}
          <a href="/administration?tab=system#sha-sandbox-claims" className="underline">
            SHA sandbox submit
          </a>{" "}
          (Billing → invoice → create claim, then Claim ID here).           National path: chart → Submit national claim (stores ref in claim history). Sandbox is local
          evidence only.
        </p>
      </CardContent>
    </Card>
  )
}
