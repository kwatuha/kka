"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  MapPin,
  ClipboardList,
  Users,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { dashboardApi, pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const POINT_TYPE_LABELS: Record<string, string> = {
  registration: "Registration",
  triage: "Triage",
  consultation: "Consultation",
  cashier: "Cashier",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  radiology: "Radiology",
  billing: "Billing",
  telemedicine: "Telemedicine",
  procedure: "Procedure",
}

function typeLabel(type: string) {
  return POINT_TYPE_LABELS[type] || type
}

export default function ServicePointPerformancePage() {
  const [days, setDays] = useState("30")
  const [branchId, setBranchId] = useState("all")
  const [pointType, setPointType] = useState("all")
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    servicePoints: any[]
    unassignedQueues: any[]
    byType: any[]
    totals: Record<string, number>
    generatedAt?: string
    days?: number
  } | null>(null)

  useEffect(() => {
    pharmacyApi.getBranches(undefined, "true").then(setBranches).catch(() => setBranches([]))
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dashboardApi.getServicePointPerformance({
        days: Number(days),
        branchId: branchId !== "all" ? branchId : undefined,
        pointType: pointType !== "all" ? pointType : undefined,
      })
      setData(res)
    } catch (error: any) {
      toast({
        title: "Could not load service point performance",
        description: error.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [days, branchId, pointType])

  useEffect(() => {
    void load()
  }, [load])

  const points = data?.servicePoints || []
  const unassigned = data?.unassignedQueues || []
  const byType = data?.byType || []
  const totals = data?.totals || {}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Service Point Performance
          </h1>
          <p className="text-muted-foreground">
            Monitor queue load, throughput and wait times across registration desks, consultation rooms,
            cashier windows, pharmacy counters, and lab collection points.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[min(100%,12rem)]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.branchId} value={String(b.branchId)}>
                  {b.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pointType} onValueChange={setPointType}>
            <SelectTrigger className="w-[min(100%,10rem)]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(POINT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Configured points
                </CardDescription>
                <CardTitle className="text-2xl">{totals.configuredPoints ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Staff assigned: {totals.assignedStaff ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5" /> Active queue
                </CardDescription>
                <CardTitle className="text-2xl">{totals.activeQueue ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Arrivals today: {totals.queueToday ?? 0}
                {(totals.unassignedActive ?? 0) > 0 ? (
                  <span className="text-amber-700"> · {totals.unassignedActive} unassigned desk</span>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Queue tickets (period)
                </CardDescription>
                <CardTitle className="text-2xl">{totals.queuePeriod ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Patients served: {totals.patientsServedPeriod ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed (period)
                </CardDescription>
                <CardTitle className="text-2xl">{totals.completedPeriod ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Last {data?.days || days} days
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Avg wait (where tracked)
                </CardDescription>
                <CardTitle className="text-2xl">
                  {points.length
                    ? (
                        points.reduce((s, p) => s + (p.avgWaitMinutes || 0), 0) /
                        points.filter((p) => p.avgWaitMinutes > 0).length || 0
                      ).toFixed(0)
                    : 0}{" "}
                  min
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Mean across points with wait data
              </CardContent>
            </Card>
          </div>

          {byType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Summary by queue type</CardTitle>
                <CardDescription>Aggregated across all configured service points in the filter</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-right">Period tickets</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Patients served</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byType.map((row) => (
                      <TableRow key={row.pointType}>
                        <TableCell className="font-medium">{typeLabel(row.pointType)}</TableCell>
                        <TableCell className="text-right">{row.pointCount}</TableCell>
                        <TableCell className="text-right">{row.activeQueue}</TableCell>
                        <TableCell className="text-right">{row.queueToday}</TableCell>
                        <TableCell className="text-right">{row.queuePeriod}</TableCell>
                        <TableCell className="text-right">{row.completedPeriod}</TableCell>
                        <TableCell className="text-right">{row.patientsServedPeriod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Performance by service point</CardTitle>
              <CardDescription>
                Period: last {data?.days || days} days
                {data?.generatedAt ? ` · Generated ${String(data.generatedAt).replace("T", " ").slice(0, 19)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service point</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Staff</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Today</TableHead>
                    <TableHead className="text-right">Period</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Patients</TableHead>
                    <TableHead className="text-right">Avg wait</TableHead>
                    <TableHead className="text-right">Avg service</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No service points configured. Add desks and rooms under Settings → Service points.
                      </TableCell>
                    </TableRow>
                  ) : (
                    points.map((sp) => (
                      <TableRow key={sp.servicePointId}>
                        <TableCell>
                          <div className="font-medium">{sp.pointName}</div>
                          <div className="text-xs text-muted-foreground">
                            {sp.branchName} · {sp.pointCode}
                            {sp.location ? ` · ${sp.location}` : ""}
                            {sp.isDefault ? (
                              <Badge variant="secondary" className="ml-1">
                                Default
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{typeLabel(sp.pointType)}</TableCell>
                        <TableCell className="text-right">{sp.assignedStaff}</TableCell>
                        <TableCell className="text-right">
                          <span className={sp.activeQueue > 0 ? "font-semibold text-amber-700" : ""}>
                            {sp.activeQueue}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{sp.queueToday}</TableCell>
                        <TableCell className="text-right">{sp.queuePeriod}</TableCell>
                        <TableCell className="text-right">{sp.completedPeriod}</TableCell>
                        <TableCell className="text-right">{sp.patientsServedPeriod}</TableCell>
                        <TableCell className="text-right">
                          {sp.avgWaitMinutes > 0 ? `${sp.avgWaitMinutes} min` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {sp.avgServiceMinutes > 0 ? `${sp.avgServiceMinutes} min` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {unassigned.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  Queue activity without a assigned desk
                </CardTitle>
                <CardDescription>
                  Tickets created before service points were configured, or added without a physical desk. Consider
                  routing new entries through configured service points.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Queue type</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-right">Period</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unassigned.map((row, idx) => (
                      <TableRow key={`${row.branchId}-${row.servicePoint}-${idx}`}>
                        <TableCell>{row.branchName}</TableCell>
                        <TableCell>{typeLabel(row.servicePoint)}</TableCell>
                        <TableCell className="text-right">{row.activeQueue}</TableCell>
                        <TableCell className="text-right">{row.queueToday}</TableCell>
                        <TableCell className="text-right">{row.queuePeriod}</TableCell>
                        <TableCell className="text-right">{row.completedPeriod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
