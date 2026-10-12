"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { telemedicineApi } from "@/lib/api"
import { getTelemedicineProviderLabel } from "@/lib/telemedicine-providers"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, History, Loader2, RefreshCw } from "lucide-react"

const PAGE_SIZE = 15

function formatWhen(v: string | null | undefined) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleString()
  } catch {
    return String(v)
  }
}

function formatDuration(createdAt: string | null | undefined, updatedAt: string | null | undefined) {
  if (!createdAt || !updatedAt) return "—"
  const a = new Date(createdAt).getTime()
  const b = new Date(updatedAt).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return "—"
  const mins = Math.round((b - a) / 60000)
  if (mins < 1) return "<1 min"
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function humanizeOrigin(origin: string | undefined) {
  if (!origin) return "—"
  return origin.replace(/_/g, " ")
}

function countBy<T extends string>(items: T[]): { key: T; n: number }[] {
  const m = new Map<T, number>()
  for (const k of items) {
    const key = (k || "unknown") as T
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => b.n - a.n)
}

type Props = {
  /** Increment after an active visit ends so history refetches immediately. */
  refreshTrigger?: number
  className?: string
  /** Omit outer Card — use inside a parent tab or panel. */
  embedded?: boolean
}

/**
 * Ended telemedicine sessions with utilization-style summaries (origin, platform, duration).
 */
export function TelemedicineVisitsHistory({ refreshTrigger = 0, className, embedded = false }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sessions, setSessions] = useState<any[]>([])
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await telemedicineApi.listSessions({
        page,
        limit: PAGE_SIZE,
        scope: "facility",
        statusGroup: "ended",
      })
      setSessions(res.sessions || [])
      setTotal(res.total ?? 0)
    } catch (e: any) {
      console.error(e)
      toast({
        title: "Could not load visit history",
        description: e?.message || "Failed to list ended sessions",
        variant: "destructive",
      })
      setSessions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [toast, page])

  useEffect(() => {
    void load()
  }, [load, refreshTrigger])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageStats = useMemo(() => {
    const origins = countBy(sessions.map((s) => String(s.originType || "unknown")))
    const providers = countBy(sessions.map((s) => String(s.provider || "unknown")))
    const durationsMin = sessions
      .map((s) => {
        const a = new Date(s.createdAt).getTime()
        const b = new Date(s.updatedAt).getTime()
        if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null
        return (b - a) / 60000
      })
      .filter((x): x is number => x != null)
    const avgMin =
      durationsMin.length > 0 ? Math.round(durationsMin.reduce((x, y) => x + y, 0) / durationsMin.length) : null
    return { origins, providers, avgMin }
  }, [sessions])

  const statsBlock =
    !loading && total > 0 ? (
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span>
            <strong className="text-foreground">{total}</strong>{" "}
            <span className="text-muted-foreground">ended visit{total === 1 ? "" : "s"} (facility)</span>
          </span>
          {pageStats.avgMin != null && (
            <span className="text-muted-foreground">
              Avg. session window on this page: <strong className="text-foreground">{pageStats.avgMin} min</strong>
            </span>
          )}
        </div>
        {pageStats.origins.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Origin (this page)</span>
            {pageStats.origins.map(({ key, n }) => (
              <Badge key={key} variant="secondary" className="font-normal">
                {humanizeOrigin(key)} · {n}
              </Badge>
            ))}
          </div>
        )}
        {pageStats.providers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform (this page)</span>
            {pageStats.providers.map(({ key, n }) => (
              <Badge key={key} variant="outline" className="font-normal">
                {getTelemedicineProviderLabel(key)} · {n}
              </Badge>
            ))}
          </div>
        )}
      </div>
    ) : null

  const tableBlock = loading ? (
    <div className="flex justify-center py-10 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ) : sessions.length === 0 ? (
    <p className="rounded-md border bg-muted/20 py-6 text-center text-sm text-muted-foreground">
      No ended visits yet. When you end an active visit, it appears here for utilization tracking.
    </p>
  ) : (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="whitespace-nowrap">Started</TableHead>
              <TableHead className="whitespace-nowrap">Ended</TableHead>
              <TableHead>Window</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.sessionId}>
                <TableCell className="font-mono text-sm">
                  <Link href={`/telemedicine/${s.sessionId}`} className="text-primary hover:underline">
                    #{s.sessionId}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {s.patientFirstName || s.patientLastName
                      ? `${s.patientFirstName || ""} ${s.patientLastName || ""}`.trim()
                      : "—"}
                  </div>
                  {s.patientNumber && <div className="text-xs text-muted-foreground">{s.patientNumber}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  {s.doctorFirstName || s.doctorLastName
                    ? `${s.doctorFirstName || ""} ${s.doctorLastName || ""}`.trim()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {getTelemedicineProviderLabel(s.provider)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {humanizeOrigin(s.originType)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatWhen(s.createdAt)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatWhen(s.updatedAt)}</TableCell>
                <TableCell className="text-sm">{formatDuration(s.createdAt, s.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )

  const topRow = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        {!embedded && (
          <>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Visits history
            </CardTitle>
            <CardDescription className="text-sm">
              Ended telemedicine sessions — use totals and origin mix to see how video visits are used (queue, inpatient, etc.).
            </CardDescription>
          </>
        )}
        {embedded && (
          <p className="text-sm text-muted-foreground">
            Ended telemedicine sessions — use totals and origin mix to see how video visits are used (queue, inpatient, etc.).
          </p>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="shrink-0">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  )

  if (embedded) {
    return (
      <div className={`space-y-4 ${className ?? ""}`}>
        {topRow}
        {statsBlock}
        {tableBlock}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        {topRow}
        {statsBlock && <div className="mt-3">{statsBlock}</div>}
      </CardHeader>
      <CardContent>{tableBlock}</CardContent>
    </Card>
  )
}
