"use client"

import { useEffect, useMemo, useState, Fragment } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Pill,
  Search,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { pharmacyApi } from "@/lib/api"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"

type PatientDrugRow = {
  patientId: number
  patientNumber?: string
  firstName?: string
  lastName?: string
  phone?: string
  medicationId?: number
  medicationName?: string
  medicationCode?: string
  genericName?: string
  totalQuantity: number
  dispensationCount: number
  prescriptionCount: number
  firstDispensedAt?: string
  lastDispensedAt?: string
  storeNames?: string
  prescriptionNumbers?: string
  events?: any[]
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
}

export function PatientsByDrugSearch() {
  const { toast } = useToast()
  const { drugStores, currentStoreId } = useFacilityUnits()

  const [medications, setMedications] = useState<any[]>([])
  const [medicationId, setMedicationId] = useState("all")
  const [drugSearch, setDrugSearch] = useState("")
  const [patientSearch, setPatientSearch] = useState("")
  const [storeId, setStoreId] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [rows, setRows] = useState<PatientDrugRow[]>([])
  const [summary, setSummary] = useState({ patientCount: 0, dispensationCount: 0, totalQuantity: 0 })
  const [totalPages, setTotalPages] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await pharmacyApi.getMedications(undefined, 1, 300)
        if (!cancelled) setMedications(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setMedications([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (currentStoreId) setStoreId(String(currentStoreId))
  }, [currentStoreId])

  const medicationOptions = useMemo(
    () => [
      { value: "all", label: "Any matching drug name" },
      ...medications.map((m) => ({
        value: String(m.medicationId),
        label: [m.name || m.medicationName, m.strength, m.dosageForm, m.medicationCode]
          .filter(Boolean)
          .join(" · "),
      })),
    ],
    [medications]
  )

  const storeOptions = useMemo(
    () => [
      { value: "all", label: "All stores" },
      ...drugStores.map((s) => ({
        value: String(s.storeId),
        label: `${s.storeName}${s.isDispensingStore ? " (Dispensing)" : ""}`,
      })),
    ],
    [drugStores]
  )

  const runSearch = async (nextPage = 1) => {
    if (medicationId === "all" && !drugSearch.trim()) {
      toast({
        title: "Choose a drug",
        description: "Select a medication or type a drug name to search.",
        variant: "destructive",
      })
      return
    }
    try {
      setLoading(true)
      setSearched(true)
      setPage(nextPage)
      const data = await pharmacyApi.getPatientsByDrug({
        medicationId: medicationId !== "all" ? medicationId : undefined,
        drugSearch: drugSearch.trim() || undefined,
        patientSearch: patientSearch.trim() || undefined,
        storeId: storeId !== "all" ? storeId : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: nextPage,
        limit: 50,
        includeEvents: true,
      })
      setRows(data.patients || [])
      setSummary(data.summary || { patientCount: 0, dispensationCount: 0, totalQuantity: 0 })
      setTotalPages(data.pagination?.totalPages || 0)
    } catch (err: any) {
      toast({
        title: "Search failed",
        description: err.message || "Could not search patients by drug",
        variant: "destructive",
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const exportCsv = () => {
    if (!rows.length) return
    const header = [
      "Patient number",
      "Patient name",
      "Phone",
      "Drug",
      "Total qty",
      "Dispensations",
      "Prescriptions",
      "First dispensed",
      "Last dispensed",
      "Stores",
      "Rx numbers",
    ]
    const lines = rows.map((r) =>
      [
        r.patientNumber || "",
        `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        r.phone || "",
        r.medicationName || "",
        r.totalQuantity,
        r.dispensationCount,
        r.prescriptionCount,
        r.firstDispensedAt || "",
        r.lastDispensedAt || "",
        r.storeNames || "",
        r.prescriptionNumbers || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `patients-by-drug-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-800" />
            Patients by drug
          </CardTitle>
          <CardDescription>
            Find everyone who was dispensed a specific medication — useful for recalls, audits, and follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Medication</Label>
              <SearchableSelect
                value={medicationId}
                onValueChange={setMedicationId}
                options={medicationOptions}
                placeholder="Select medication…"
                emptyMessage="No medication found"
              />
            </div>
            <div className="space-y-2">
              <Label>Or drug name contains</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="e.g. Amoxicillin, ARV…"
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void runSearch(1)
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pharmacy store</Label>
              <SearchableSelect
                value={storeId}
                onValueChange={setStoreId}
                options={storeOptions}
                placeholder="All stores"
              />
            </div>
            <div className="space-y-2">
              <Label>Patient filter</Label>
              <Input
                placeholder="Name, number, or phone"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>From date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runSearch(1)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search patients
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={!rows.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Patients</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {summary.patientCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Dispensations</CardDescription>
              <CardTitle className="text-2xl">{summary.dispensationCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total quantity issued</CardDescription>
              <CardTitle className="text-2xl">{summary.totalQuantity.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Searching dispensations…
            </div>
          ) : !searched ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a drug and search to see which patients received it.
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No patients found for this drug and filters.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Patient</TableHead>
                    <TableHead>Drug</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Last given</TableHead>
                    <TableHead>Store(s)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const key = `${r.patientId}-${r.medicationId || 0}`
                    const open = expanded.has(key)
                    return (
                      <Fragment key={key}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleExpand(key)}
                              aria-label={open ? "Hide details" : "Show details"}
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {r.firstName} {r.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.patientNumber || `ID ${r.patientId}`}
                              {r.phone ? ` · ${r.phone}` : ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.medicationName}</div>
                            <div className="text-xs text-muted-foreground">
                              {[r.genericName, r.medicationCode].filter(Boolean).join(" · ")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-semibold">{r.totalQuantity}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.dispensationCount} issue{r.dispensationCount === 1 ? "" : "s"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{formatDate(r.lastDispensedAt)}</div>
                            <div className="text-xs text-muted-foreground">
                              First {formatDate(r.firstDispensedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{r.storeNames || "—"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/patients/${r.patientId}`}>Open</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {open ? (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={7}>
                              <div className="space-y-2 py-2 pl-4">
                                {r.prescriptionNumbers ? (
                                  <div className="text-xs text-muted-foreground">
                                    Prescriptions: {r.prescriptionNumbers}
                                  </div>
                                ) : null}
                                {(r.events || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No line details.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {(r.events || []).map((ev) => (
                                      <Badge key={ev.dispensationId} variant="outline" className="font-normal">
                                        {formatDate(ev.dispensationDate)} · qty {ev.quantityDispensed}
                                        {ev.batchNumber ? ` · batch ${ev.batchNumber}` : ""}
                                        {ev.storeName ? ` · ${ev.storeName}` : ""}
                                        {ev.dispensedByFirstName
                                          ? ` · ${ev.dispensedByFirstName} ${ev.dispensedByLastName || ""}`
                                          : ""}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void runSearch(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void runSearch(page + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
