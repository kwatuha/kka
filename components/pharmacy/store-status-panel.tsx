"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  Package,
  Pill,
  RefreshCw,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { pharmacyApi } from "@/lib/api"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"

type Overview = {
  store?: {
    storeId: number
    storeName: string
    storeCode?: string
    isDispensingStore?: boolean
    branchName?: string
  } | null
  stock: {
    activeBatches: number
    distinctMedications: number
    totalUnits: number
    expiredBatches: number
    expiringIn30Days: number
  }
  alerts: { reorderCount: number }
  today: {
    dispensations: number
    quantityDispensed: number
    uniquePatients: number
  }
  pending: {
    prescriptionsPending: number
    queueWaiting: number
  }
  transfers: {
    inboundPending: number
    outboundPending: number
  }
  topDrugsToday: Array<{
    medicationId?: number
    medicationName: string
    quantityDispensed: number
    patientCount: number
  }>
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string | number
  hint?: string
  tone?: "default" | "warn" | "danger" | "ok"
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-800"
      : tone === "danger"
        ? "text-red-700"
        : tone === "ok"
          ? "text-emerald-800"
          : "text-foreground"
  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function PharmacyStoreStatusPanel() {
  const { currentStoreId, drugStores } = useFacilityUnits()
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!currentStoreId) {
      setOverview(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await pharmacyApi.getStoreOverview({ storeId: String(currentStoreId) })
      setOverview(data)
    } catch (err: any) {
      setError(err.message || "Could not load store status")
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId])

  if (!currentStoreId && drugStores.length === 0) return null

  const storeName =
    overview?.store?.storeName ||
    drugStores.find((s) => s.storeId === currentStoreId)?.storeName ||
    "Selected store"

  return (
    <Card className="border-emerald-900/10 bg-gradient-to-br from-emerald-50/80 via-background to-background">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-emerald-800" />
            Store status · {storeName}
          </CardTitle>
          <CardDescription>
            {overview?.store?.isDispensingStore ? (
              <Badge variant="outline" className="mr-2 border-emerald-700 text-emerald-900">
                Dispensing store
              </Badge>
            ) : null}
            What is happening in this pharmacy store right now
            {overview?.store?.branchName ? ` · ${overview.store.branchName}` : ""}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || !currentStoreId}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentStoreId ? (
          <p className="text-sm text-muted-foreground">Select a pharmacy store above to see stock and activity.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && !overview ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading store snapshot…
          </div>
        ) : overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="On shelf"
                value={overview.stock.totalUnits.toLocaleString()}
                hint={`${overview.stock.distinctMedications} drugs · ${overview.stock.activeBatches} batches`}
                tone="ok"
              />
              <Stat
                label="Today dispensed"
                value={overview.today.quantityDispensed.toLocaleString()}
                hint={`${overview.today.dispensations} issues · ${overview.today.uniquePatients} patients`}
              />
              <Stat
                label="Waiting / pending"
                value={overview.pending.queueWaiting}
                hint={`${overview.pending.prescriptionsPending} Rx lines still pending`}
                tone={overview.pending.queueWaiting > 0 ? "warn" : "default"}
              />
              <Stat
                label="Needs attention"
                value={overview.alerts.reorderCount + overview.stock.expiringIn30Days + overview.stock.expiredBatches}
                hint={`${overview.alerts.reorderCount} low stock · ${overview.stock.expiringIn30Days} expiring · ${overview.stock.expiredBatches} expired`}
                tone={
                  overview.alerts.reorderCount + overview.stock.expiredBatches > 0
                    ? "danger"
                    : overview.stock.expiringIn30Days > 0
                      ? "warn"
                      : "default"
                }
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Inbound transfers: {overview.transfers.inboundPending}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Outbound transfers: {overview.transfers.outboundPending}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
                <Clock className="h-3.5 w-3.5" />
                Queue waiting: {overview.pending.queueWaiting}
              </span>
              {overview.alerts.reorderCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overview.alerts.reorderCount} below reorder level
                </span>
              ) : null}
            </div>

            {overview.topDrugsToday.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top drugs dispensed today
                </p>
                <div className="flex flex-wrap gap-2">
                  {overview.topDrugsToday.map((d, i) => (
                    <Badge key={`${d.medicationId || d.medicationName}-${i}`} variant="secondary" className="font-normal">
                      <Pill className="mr-1 h-3 w-3" />
                      {d.medicationName}: {d.quantityDispensed} to {d.patientCount}{" "}
                      <Users className="ml-1 inline h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No dispensations recorded for this store today yet.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/pharmacy?tab=patients-by-drug">Find patients by drug</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pharmacy?tab=drug-inventory">Open inventory</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pharmacy/history">Drug history</Link>
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
