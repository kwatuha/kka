"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { patientApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PedsGrowthPanel } from "@/components/peds-growth-panel"

type VitalRecord = {
  id: string
  recordedAt: Date
  date: string
  time: string
  label: string
  temperature: number
  heartRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  respiratoryRate: number
  oxygenSaturation: number
  pain: number
  weight: number
  height: number
  bmi: number
  notes: string
  recordedBy: string
}

function formatVitalLabel(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function mapApiVitalsToRecords(vitalsData: any[]): VitalRecord[] {
  const records: VitalRecord[] = vitalsData.map((vital: any, index: number) => {
    const recordDate = new Date(vital.recordedDate || vital.recordedAt || new Date())
    const systolicBP = vital.systolicBP || vital.bloodPressureSystolic || null
    const diastolicBP = vital.diastolicBP || vital.bloodPressureDiastolic || null
    const weight = vital.weight || 0
    const height = vital.height || 0
    const bmi = height > 0 ? Number((weight / (height / 100) ** 2).toFixed(1)) : 0

    return {
      id: `vital-${vital.vitalSignId || index}`,
      recordedAt: recordDate,
      date: recordDate.toISOString().split("T")[0],
      time: recordDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      label: formatVitalLabel(recordDate),
      temperature: vital.temperature || 0,
      heartRate: vital.heartRate || 0,
      bloodPressureSystolic: systolicBP || 0,
      bloodPressureDiastolic: diastolicBP || 0,
      respiratoryRate: vital.respiratoryRate || vital.respRate || 0,
      oxygenSaturation: vital.oxygenSaturation || vital.spO2 || 0,
      pain: vital.pain || vital.painScore || 0,
      weight: weight,
      height: height,
      bmi: bmi,
      notes: vital.notes || "",
      recordedBy:
        [vital.recordedByFirstName, vital.recordedByLastName].filter(Boolean).join(" ") ||
        vital.recordedByName ||
        "Unknown",
    }
  })
  records.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
  return records
}

type ChartDatum = {
  label: string
  date: string
  systolic: number | null
  diastolic: number | null
  heartRate: number | null
  temperature: number | null
  oxygenSaturation: number | null
  respiratoryRate: number | null
  weight: number | null
}

function VitalsChartsContent({ chartData }: { chartData: ChartDatum[] }) {
  const hasBp = chartData.some((d) => d.systolic != null && d.diastolic != null)
  const hasHrTemp = chartData.some((d) => d.heartRate != null || d.temperature != null)
  const hasSpo2Rr = chartData.some((d) => d.oxygenSaturation != null || d.respiratoryRate != null)

  if (chartData.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">No chart data available</div>
  }

  return (
    <>
      {hasBp && (
        <div>
          <h3 className="text-sm font-medium mb-2">Blood pressure (mmHg)</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Systolic and diastolic over time (multiple readings on the same day appear as separate points).
          </p>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(l) => `Recorded: ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="systolic" stroke="#ef4444" name="Systolic" connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic" connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasHrTemp && (
        <div>
          <h3 className="text-sm font-medium mb-2">Heart rate & temperature</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  domain={[35, 42]}
                  label={{ value: "°C", angle: -90, position: "insideRight" }}
                />
                <Tooltip labelFormatter={(l) => `Recorded: ${l}`} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#8b5cf6"
                  name="Heart rate (bpm)"
                  connectNulls
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  name="Temperature (°C)"
                  connectNulls
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasSpo2Rr && (
        <div>
          <h3 className="text-sm font-medium mb-2">Oxygen saturation & respiratory rate</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip labelFormatter={(l) => `Recorded: ${l}`} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="oxygenSaturation"
                  stroke="#0ea5e9"
                  name="SpO₂ (%)"
                  connectNulls
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="respiratoryRate"
                  stroke="#22c55e"
                  name="Resp. rate (/min)"
                  connectNulls
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {chartData.some((d) => d.weight != null) && (
        <div>
          <h3 className="text-sm font-medium mb-2">Weight (kg)</h3>
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(l) => `Recorded: ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="#10b981" name="Weight (kg)" connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!hasBp && !hasHrTemp && !hasSpo2Rr && !chartData.some((d) => d.weight != null) && (
        <div className="text-center py-4 text-muted-foreground">Not enough numeric vitals to plot yet</div>
      )}
    </>
  )
}

export type PatientVitalsProps = {
  patientId: string
  /** When provided, skip GET /patients/:id/vitals and use these rows (e.g. admission-scoped vitals). */
  vitals?: any[] | null
  /** When true, only show trend charts (for inpatient alongside the full vitals table). */
  chartsOnly?: boolean
  dateOfBirth?: string | null
}

export function PatientVitals({ patientId, vitals: vitalsProp, chartsOnly = false, dateOfBirth }: PatientVitalsProps) {
  const [loading, setLoading] = useState(() => vitalsProp === undefined)
  const [error, setError] = useState<string | null>(null)
  const [vitalRecords, setVitalRecords] = useState<VitalRecord[]>([])

  useEffect(() => {
    if (vitalsProp !== undefined && vitalsProp !== null) {
      setVitalRecords(mapApiVitalsToRecords(vitalsProp))
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const loadVitals = async () => {
      try {
        setLoading(true)
        setError(null)

        const vitalsData = await patientApi.getVitals(patientId)
        if (cancelled) return
        setVitalRecords(mapApiVitalsToRecords(vitalsData))
      } catch (err: any) {
        console.error("Error loading vitals:", err)
        if (!cancelled) setError(err.message || "Failed to load vital signs")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadVitals()
    return () => {
      cancelled = true
    }
  }, [patientId, vitalsProp])

  /** Chronological (oldest → newest) for trend lines */
  const chartData = useMemo(() => {
    const chronological = [...vitalRecords].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
    return chronological.map((record) => ({
      label: record.label,
      date: record.date,
      systolic: record.bloodPressureSystolic > 0 ? record.bloodPressureSystolic : null,
      diastolic: record.bloodPressureDiastolic > 0 ? record.bloodPressureDiastolic : null,
      heartRate: record.heartRate > 0 ? record.heartRate : null,
      temperature: record.temperature > 0 ? record.temperature : null,
      oxygenSaturation: record.oxygenSaturation > 0 ? record.oxygenSaturation : null,
      respiratoryRate: record.respiratoryRate > 0 ? record.respiratoryRate : null,
      weight: record.weight > 0 ? record.weight : null,
    }))
  }, [vitalRecords])

  const latestGrowthVitals = useMemo(() => {
    const withBoth = vitalRecords.find((r) => r.weight > 0 && r.height > 0)
    if (withBoth) return { weightKg: withBoth.weight, heightCm: withBoth.height }
    const w = vitalRecords.find((r) => r.weight > 0)
    const h = vitalRecords.find((r) => r.height > 0)
    return { weightKg: w?.weight ?? null, heightCm: h?.height ?? null }
  }, [vitalRecords])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartsOnly ? "Vital trends" : "Vital Signs"}</CardTitle>
          <CardDescription>
            {chartsOnly
              ? "Loading charts…"
              : "Historical record of patient vital signs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartsOnly ? "Vital trends" : "Vital Signs"}</CardTitle>
          <CardDescription>
            {chartsOnly ? "Could not load vitals for charts" : "Historical record of patient vital signs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (chartsOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vital trends</CardTitle>
          <CardDescription>
            Admission vitals over time (same charts as on the patient profile). Data updates when you record or edit vitals
            below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <VitalsChartsContent chartData={chartData} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {!chartsOnly && dateOfBirth ? (
        <PedsGrowthPanel
          dateOfBirth={dateOfBirth}
          weightKg={latestGrowthVitals.weightKg}
          heightCm={latestGrowthVitals.heightCm}
        />
      ) : null}
    <Card>
      <CardHeader>
        <CardTitle>Vital Signs</CardTitle>
        <CardDescription>
          Recent measurements (up to 200 records). Use charts to follow trends over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            {vitalRecords.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>BP (mmHg)</TableHead>
                      <TableHead>HR (bpm)</TableHead>
                      <TableHead>Temp (°C)</TableHead>
                      <TableHead>RR</TableHead>
                      <TableHead>SpO₂ (%)</TableHead>
                      <TableHead>Weight (kg)</TableHead>
                      <TableHead>BMI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vitalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.time}</TableCell>
                        <TableCell>
                          {record.bloodPressureSystolic > 0 && record.bloodPressureDiastolic > 0
                            ? `${record.bloodPressureSystolic}/${record.bloodPressureDiastolic}`
                            : "—"}
                        </TableCell>
                        <TableCell>{record.heartRate > 0 ? record.heartRate : "—"}</TableCell>
                        <TableCell>{record.temperature > 0 ? record.temperature : "—"}</TableCell>
                        <TableCell>{record.respiratoryRate > 0 ? record.respiratoryRate : "—"}</TableCell>
                        <TableCell>{record.oxygenSaturation > 0 ? `${record.oxygenSaturation}%` : "—"}</TableCell>
                        <TableCell>{record.weight > 0 ? record.weight : "—"}</TableCell>
                        <TableCell>{record.bmi > 0 ? record.bmi : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No vital signs recorded for this patient</div>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-8">
            <VitalsChartsContent chartData={chartData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}
