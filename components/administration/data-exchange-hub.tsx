"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Loader2,
  Network,
  RefreshCw,
  RotateCcw,
  Share2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { branding } from "@/lib/branding"

type Destination = {
  id: string
  name: string
  shortName: string
  purpose: string
  dataTypes: string[]
  authority: string
  mode: string
  health: string
  statusLabel: string
  planned?: boolean
  baseUrlConfigured?: boolean
  configurePath: string
  stats: {
    total: number
    published: number
    failed: number
    pending: number
    lastSuccessAt?: string | null
  }
}

type Transmission = {
  transmissionId: string
  outboxId?: number
  destinationId: string
  destinationName: string
  eventType: string
  label: string
  status: string
  aggregateType?: string
  aggregateId?: string
  externalRef?: string | null
  lastError?: string | null
  createdAt?: string
  publishedAt?: string | null
  source?: string
}

type Overview = {
  generatedAt: string
  rabbitmqConfigured: boolean
  outboxCounts: Record<string, number>
  outboxEventTypes?: Record<string, number>
  destinations: Destination[]
  transmissions: Transmission[]
  flow: { steps: Array<{ id: string; title: string; detail: string }> }
}

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function healthBadge(health: string, label: string, onDark = false) {
  if (onDark) {
    return (
      <Badge
        variant="outline"
        className="border-white/40 bg-white/15 text-white shrink-0"
      >
        {label}
      </Badge>
    )
  }
  const variant =
    health === "connected"
      ? "default"
      : health === "planned"
        ? "secondary"
        : health === "degraded"
          ? "destructive"
          : "outline"
  return <Badge variant={variant as any}>{label}</Badge>
}

function statusBadge(status: string) {
  const s = String(status || "").toLowerCase()
  if (["published", "submitted", "accepted", "success", "completed"].includes(s)) {
    return <Badge variant="default">{status}</Badge>
  }
  if (["failed", "rejected", "error"].includes(s)) {
    return <Badge variant="destructive">{status}</Badge>
  }
  return <Badge variant="outline">{status}</Badge>
}

function formatWhen(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function DataExchangeHub() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [destinationFilter, setDestinationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [replaying, setReplaying] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: "60" })
      if (destinationFilter !== "all") params.set("destination", destinationFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/integrations/data-exchange/overview?${params}`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Failed to load data exchange overview")
      const data = await res.json()
      setOverview(data)
      setSelectedId((prev) => prev || data.destinations?.[0]?.id || null)
    } catch (err: any) {
      toast({
        title: "Could not load data exchange",
        description: err.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [destinationFilter, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => overview?.destinations.find((d) => d.id === selectedId) || overview?.destinations?.[0] || null,
    [overview, selectedId]
  )

  const replayOne = async (outboxId: number) => {
    try {
      setReplaying(outboxId)
      const res = await fetch(`/api/audit/outbox/${outboxId}/replay`, {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Replay failed")
      toast({ title: "Queued for republish", description: `Outbox #${outboxId}` })
      await load()
    } catch (err: any) {
      toast({ title: "Replay failed", description: err.message, variant: "destructive" })
    } finally {
      setReplaying(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Share2 className="h-6 w-6 text-emerald-800" />
            Data exchange
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Where facility data can go — national programmes, county systems, and payers — and proof of
            what was actually sent from this HMIS.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/administration?tab=system">
              Configure adapters
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Flow diagram */}
      <Card className="border-emerald-900/10 bg-gradient-to-br from-emerald-50/70 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4 text-emerald-800" />
            How data leaves this facility
          </CardTitle>
          <CardDescription>
            Clinical work stays in {branding.productName}; approved events are queued, then delivered to named
            partners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {(overview?.flow?.steps || [
              { id: "1", title: "This facility", detail: "Care & billing in HMIS" },
              { id: "2", title: "Secure outbox", detail: "Queued exchange events" },
              { id: "3", title: "Event bus", detail: "RabbitMQ when configured" },
              { id: "4", title: "Partners", detail: "NUPI, DHIS2, SHA, NASCOP…" },
            ]).map((step, index, arr) => (
              <div key={step.id} className="flex flex-1 items-stretch gap-3">
                <div className="flex-1 rounded-lg border bg-background/90 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </div>
                {index < arr.length - 1 ? (
                  <div className="hidden items-center lg:flex">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              Event bus:{" "}
              {overview?.rabbitmqConfigured ? (
                <Badge variant="default">configured</Badge>
              ) : (
                <Badge variant="outline">not configured</Badge>
              )}
            </span>
            <span>
              Outbox pending {overview?.outboxCounts?.pending || 0} · published{" "}
              {overview?.outboxCounts?.published || 0} · failed {overview?.outboxCounts?.failed || 0}
            </span>
            {overview?.outboxEventTypes?.["hl7.oru.sandbox"] ? (
              <span>
                HL7 ORU queued:{" "}
                <Badge variant="secondary">{overview.outboxEventTypes["hl7.oru.sandbox"]}</Badge>
              </span>
            ) : null}
            {(overview?.outboxEventTypes?.["cpoe.allied.order"] ||
              overview?.outboxEventTypes?.["cpoe.allied.completed"]) ? (
              <span>
                Allied CPOE:{" "}
                <Badge variant="secondary">
                  {(overview?.outboxEventTypes?.["cpoe.allied.order"] || 0) +
                    (overview?.outboxEventTypes?.["cpoe.allied.completed"] || 0)}
                </Badge>
              </span>
            ) : null}
            {overview?.generatedAt ? <span>Updated {formatWhen(overview.generatedAt)}</span> : null}
          </div>
        </CardContent>
      </Card>

      {/* Destination directory */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Destinations</h2>
          <p className="text-sm text-muted-foreground">
            Every place this system can send data. Click a card to see purpose, data types, and activity.
          </p>
        </div>
        {loading && !overview ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading destinations…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(overview?.destinations || []).map((dest) => {
              const active = selected?.id === dest.id
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setSelectedId(dest.id)}
                  className={`rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    active
                      ? "border-emerald-900 bg-emerald-900 text-white shadow-sm ring-1 ring-emerald-950"
                      : "bg-background hover:border-emerald-700/50 hover:bg-emerald-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-semibold leading-snug ${active ? "text-white" : "text-foreground"}`}>
                        {dest.shortName}
                      </p>
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 ${
                          active ? "text-emerald-50/90" : "text-muted-foreground"
                        }`}
                      >
                        {dest.name}
                      </p>
                    </div>
                    {healthBadge(dest.health, dest.statusLabel, active)}
                  </div>
                  <p
                    className={`mt-3 text-xs line-clamp-2 ${
                      active ? "text-emerald-50/85" : "text-muted-foreground"
                    }`}
                  >
                    {dest.purpose}
                  </p>
                  <div
                    className={`mt-3 flex flex-wrap gap-2 text-[11px] ${
                      active ? "text-emerald-100" : "text-muted-foreground"
                    }`}
                  >
                    <span className={active ? "font-medium text-white" : undefined}>
                      {dest.stats.published} sent
                    </span>
                    {dest.stats.failed > 0 ? (
                      <span className={active ? "text-amber-200 font-medium" : "text-red-700"}>
                        {dest.stats.failed} failed
                      </span>
                    ) : null}
                    {dest.planned ? (
                      <span className={active ? "text-emerald-100" : undefined}>Roadmap</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected destination detail */}
      {selected ? (
        <Card id={selected.id === "nascop" ? "data-exchange-nascop" : undefined}>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-800" />
                {selected.name}
              </CardTitle>
              <CardDescription>
                {selected.authority} · {healthBadge(selected.health, selected.statusLabel)}
              </CardDescription>
            </div>
            {!selected.planned ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={
                    selected.configurePath?.includes("tab=system")
                      ? selected.configurePath
                      : `/administration?tab=system${
                          selected.configurePath?.includes("#")
                            ? selected.configurePath.slice(selected.configurePath.indexOf("#"))
                            : ""
                        }`
                  }
                >
                  Open configuration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{selected.purpose}</p>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Data that can leave
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.dataTypes.map((t) => (
                  <Badge key={t} variant="secondary" className="font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Published / sent</p>
                <p className="text-xl font-semibold">{selected.stats.published}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">{selected.stats.pending}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-xl font-semibold text-red-700">{selected.stats.failed}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Last success</p>
                <p className="text-sm font-medium">{formatWhen(selected.stats.lastSuccessAt)}</p>
              </div>
            </div>
            {selected.planned ? (
              <div className="rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Planned destination.</strong> NASCOP is on the roadmap
                for HIV programme exchange (HTS, ART, viral load). It is listed here so stakeholders can see
                where HIV programme data will go once the national adapter is connected — it is not sending
                data yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Transmission ledger */}
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Recent transmissions</CardTitle>
            <CardDescription>
              Unified ledger of outbox events and partner submissions — proof of what left the facility.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All destinations</SelectItem>
                {(overview?.destinations || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !overview ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading transmissions…
            </div>
          ) : (overview?.transmissions || []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No transmissions yet. Register a patient, finalise a lab result, or run a DHIS2/FHIR export to
              see activity here.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>What was sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview?.transmissions || []).map((tx) => (
                    <TableRow key={tx.transmissionId}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatWhen(tx.publishedAt || tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{tx.destinationName}</div>
                        <div className="text-xs text-muted-foreground">{tx.source}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{tx.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{tx.eventType}</div>
                        {tx.lastError ? (
                          <div className="text-xs text-red-700 mt-1 line-clamp-2">{tx.lastError}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>{statusBadge(tx.status)}</TableCell>
                      <TableCell className="text-xs">
                        {tx.externalRef ||
                          (tx.aggregateType && tx.aggregateId
                            ? `${tx.aggregateType}:${tx.aggregateId}`
                            : "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.outboxId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={replaying === tx.outboxId}
                            onClick={() => void replayOne(tx.outboxId!)}
                          >
                            {replaying === tx.outboxId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            <span className="ml-1">Retry</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/administration?tab=system#integration-outbox">Full outbox panel</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/administration?tab=system#reporting-claims">DHIS2 / IDSR / SHA</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/administration?tab=system#fhir-exchange">FHIR exchange</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
