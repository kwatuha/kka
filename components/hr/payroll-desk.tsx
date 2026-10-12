"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Banknote,
  Calculator,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { payrollApi } from "@/lib/api"
import { PayrollPayslipDialog } from "@/components/hr/payroll-payslip-dialog"
import { PayrollPayslipEmailDialog } from "@/components/hr/payroll-payslip-email-dialog"
import { PayrollStatutoryRatesPanel } from "@/components/hr/payroll-statutory-rates-panel"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import { getPayrollExportPayload } from "@/lib/payroll-export"

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const fmt = (d: Date) => d.toISOString().split("T")[0]
  return { start: fmt(start), end: fmt(end) }
}

function defaultPaymentDate(year: number, month: number) {
  const d = new Date(year, month + 1, 5)
  return d.toISOString().split("T")[0]
}

function kes(n: number | string | undefined) {
  return parseFloat(String(n || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function PayrollDesk() {
  const now = new Date()
  const [periodYear, setPeriodYear] = useState(now.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(now.getMonth())
  const period = useMemo(() => monthBounds(periodYear, periodMonth), [periodYear, periodMonth])

  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate(now.getFullYear(), now.getMonth()))
  const [applyStatutory, setApplyStatutory] = useState(true)
  const [includeOnLeave, setIncludeOnLeave] = useState(true)
  const [batchNotes, setBatchNotes] = useState("")

  const [summary, setSummary] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const [preview, setPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [payslip, setPayslip] = useState<any>(null)
  const [payslipOpen, setPayslipOpen] = useState(false)
  const [emailPayslipsOpen, setEmailPayslipsOpen] = useState(false)
  const [activeRateLabel, setActiveRateLabel] = useState<string>("")
  const [activeTab, setActiveTab] = useState("register")

  useEffect(() => {
    setPaymentDate(defaultPaymentDate(periodYear, periodMonth))
  }, [periodYear, periodMonth])

  const loadRegister = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, tx, runList, activeRate] = await Promise.all([
        payrollApi.getSummary({ startDate: period.start, endDate: period.end }),
        payrollApi.listTransactions({
          startDate: period.start,
          endDate: period.end,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: search || undefined,
          limit: 200,
        }),
        payrollApi.listRuns(1, 15),
        payrollApi.getActiveStatutoryRate(period.end).catch(() => null),
      ])
      setSummary(sum)
      setTransactions(tx.transactions || [])
      setRuns(runList.runs || [])
      setActiveRateLabel(activeRate?.rateSet?.label || "")
    } catch (e: any) {
      toast({ title: "Failed to load payroll", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [period.start, period.end, statusFilter, search])

  useEffect(() => {
    loadRegister()
  }, [loadRegister])

  const handlePreviewBatch = async () => {
    setPreviewLoading(true)
    setPreview(null)
    try {
      const data = await payrollApi.batchPreview({
        payPeriodStart: period.start,
        payPeriodEnd: period.end,
        paymentDate,
        applyStatutory,
        includeOnLeave,
        notes: batchNotes || undefined,
      })
      setPreview(data)
      toast({
        title: "Batch preview ready",
        description: `${data.readyCount} payslips to create, ${data.skipped.length} skipped.`,
      })
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleRunBatch = async () => {
    if (!preview || preview.readyCount === 0) {
      toast({ title: "Preview first", description: "Run preview before committing the batch.", variant: "destructive" })
      return
    }
    setRunLoading(true)
    try {
      const result = await payrollApi.batchRun({
        payPeriodStart: period.start,
        payPeriodEnd: period.end,
        paymentDate,
        applyStatutory,
        includeOnLeave,
        notes: batchNotes || undefined,
      })
      toast({
        title: "Month-end payroll posted",
        description: `Run ${result.run?.runNumber}: ${result.created?.length || 0} transactions created.`,
      })
      setPreview(null)
      await loadRegister()
    } catch (e: any) {
      toast({ title: "Batch run failed", description: e.message, variant: "destructive" })
    } finally {
      setRunLoading(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const markSelectedPaid = async () => {
    if (selectedIds.length === 0) return
    try {
      await payrollApi.bulkStatus(selectedIds, "paid")
      toast({ title: "Updated", description: `${selectedIds.length} payroll(s) marked paid.` })
      setSelectedIds([])
      loadRegister()
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" })
    }
  }

  const downloadBank = async () => {
    try {
      const { blob, filename } = await payrollApi.downloadBankExport({
        startDate: period.start,
        endDate: period.end,
        status: statusFilter === "all" ? "pending" : statusFilter,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" })
    }
  }

  const openPayslip = async (payrollId: number) => {
    try {
      const row = await payrollApi.getTransaction(String(payrollId))
      setPayslip(row)
      setPayslipOpen(true)
    } catch (e: any) {
      toast({ title: "Could not load payslip", description: e.message, variant: "destructive" })
    }
  }

  const markRunPaid = async (runId: number) => {
    try {
      await payrollApi.markRunPaid(String(runId))
      toast({ title: "Run marked paid", description: "All pending lines in this run are now paid." })
      loadRegister()
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" })
    }
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">
            Month-end batch, payslip PDF, bulk email, bank export, and statutory totals.{" "}
            <Link href="/hr/employees" className="text-primary underline-offset-2 hover:underline">
              Employee salaries
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Period</Label>
            <div className="flex gap-2">
              <Select value={String(periodMonth)} onValueChange={(v) => setPeriodMonth(parseInt(v, 10))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(parseInt(v, 10))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="default"
            disabled={loading}
            onClick={() => setEmailPayslipsOpen(true)}
            title="Send PDF payslips by email (editable addresses for testing)"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email payslips
          </Button>
          <FinanceExportMenu
            disabled={loading}
            getPayload={async () => {
              const periodLabel = `${months[periodMonth]} ${periodYear}`
              if (activeTab === "tax-tables") {
                const list = await payrollApi.listStatutoryRates(true)
                return getPayrollExportPayload("tax-tables", {
                  periodLabel,
                  periodStart: period.start,
                  periodEnd: period.end,
                  statusFilter,
                  summary,
                  activeRateLabel,
                  transactions,
                  runs,
                  preview,
                  rateSets: list.rateSets || [],
                })
              }
              return getPayrollExportPayload(activeTab, {
                periodLabel,
                periodStart: period.start,
                periodEnd: period.end,
                statusFilter,
                summary,
                activeRateLabel,
                transactions,
                runs,
                preview,
              })
            }}
          />
          <Button variant="outline" size="icon" onClick={() => loadRegister()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gross (period)</CardDescription>
            <CardTitle className="text-2xl">KES {kes(summary?.totalGross)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net pay</CardDescription>
            <CardTitle className="text-2xl">KES {kes(summary?.totalNet)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PAYE / NSSF / SHA</CardDescription>
            <CardTitle className="text-lg">
              {kes(summary?.totalPaye)} / {kes(summary?.totalNssf)} / {kes(summary?.totalShif)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending vs paid</CardDescription>
            <CardTitle className="text-lg">
              {summary?.pendingCount ?? 0} pending · {summary?.paidCount ?? 0} paid
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="register">Pay register</TabsTrigger>
          <TabsTrigger value="batch">Month-end batch</TabsTrigger>
          <TabsTrigger value="runs">Run history</TabsTrigger>
          <TabsTrigger value="tax-tables">Tax tables</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  {period.start} to {period.end}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Search name or payroll #"
                  className="w-[180px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={markSelectedPaid} disabled={selectedIds.length === 0}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark paid ({selectedIds.length})
                </Button>
                <FinanceExportMenu
                  disabled={loading || transactions.length === 0}
                  getPayload={() =>
                    getPayrollExportPayload("register", {
                      periodLabel: `${months[periodMonth]} ${periodYear}`,
                      periodStart: period.start,
                      periodEnd: period.end,
                      statusFilter,
                      summary,
                      activeRateLabel,
                      transactions,
                      runs,
                      preview,
                    })
                  }
                />
                <Button variant="outline" onClick={downloadBank} title="Bank payment file (CSV format for upload)">
                  <Banknote className="h-4 w-4 mr-1" />
                  Bank file
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEmailPayslipsOpen(true)}
                  title="Email PDF payslips (editable addresses for testing)"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email payslips
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No payroll for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Payroll #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((row) => (
                      <TableRow key={row.payrollId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(row.payrollId)}
                            onCheckedChange={() => toggleSelect(row.payrollId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.payrollNumber}</TableCell>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className="text-right">KES {kes(row.grossSalary)}</TableCell>
                        <TableCell className="text-right">KES {kes(row.netSalary)}</TableCell>
                        <TableCell>
                          <Badge variant={row.paymentStatus === "paid" ? "default" : "outline"}>{row.paymentStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openPayslip(row.payrollId)}>
                            Payslip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Month-end payroll batch
              </CardTitle>
              <CardDescription>
                Creates pending payroll rows for every active employee with a salary record. Skips anyone already paid for
                this period. Statutory table for period end ({period.end}):{" "}
                <strong>{activeRateLabel || preview?.statutoryRateSet?.label || "loading…"}</strong>. Verify on{" "}
                <a
                  href="https://ecitizen.kra.go.ke/calculators/tax-calculators"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  KRA calculators
                  <ExternalLink className="h-3 w-3" />
                </a>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Pay period</Label>
                  <p className="text-sm font-medium mt-1">
                    {period.start} → {period.end}
                  </p>
                </div>
                <div>
                  <Label htmlFor="paymentDate">Payment date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-3 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={applyStatutory} onCheckedChange={(c) => setApplyStatutory(c === true)} />
                    Auto-calculate statutory deductions
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={includeOnLeave} onCheckedChange={(c) => setIncludeOnLeave(c === true)} />
                    Include staff on leave
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="batchNotes">Batch notes (optional)</Label>
                <Textarea id="batchNotes" value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex flex-wrap gap-2">
                {preview?.lines?.length > 0 && (
                  <FinanceExportMenu
                    getPayload={() =>
                      getPayrollExportPayload("batch", {
                        periodLabel: `${months[periodMonth]} ${periodYear}`,
                        periodStart: period.start,
                        periodEnd: period.end,
                        statusFilter,
                        summary,
                        activeRateLabel,
                        transactions,
                        runs,
                        preview,
                      })
                    }
                  />
                )}
                <Button onClick={handlePreviewBatch} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                  Preview batch
                </Button>
                <Button onClick={handleRunBatch} disabled={runLoading || !preview?.readyCount} variant="default">
                  {runLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Post batch ({preview?.readyCount ?? 0})
                </Button>
              </div>

              {preview && (
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      <strong>{preview.readyCount}</strong> to create
                    </span>
                    <span>
                      <strong>{preview.skipped.length}</strong> skipped
                    </span>
                    <span>
                      Gross KES {kes(preview.totals?.totalGross)} · Net KES {kes(preview.totals?.totalNet)}
                    </span>
                  </div>
                  {preview.skipped.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Skipped: {preview.skipped.map((s: any) => s.employeeName).join(", ")}
                    </p>
                  )}
                  {preview.lines?.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">PAYE</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.lines.slice(0, 50).map((line: any) => (
                          <TableRow key={line.employeeId}>
                            <TableCell>{line.employeeName}</TableCell>
                            <TableCell className="text-right">KES {kes(line.grossSalary)}</TableCell>
                            <TableCell className="text-right">KES {kes(line.tax)}</TableCell>
                            <TableCell className="text-right">KES {kes(line.netSalary)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {preview.lines?.length > 50 && (
                    <p className="text-xs text-muted-foreground">Showing first 50 of {preview.lines.length} employees.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Batch run history
                </CardTitle>
                <CardDescription>Month-end runs posted from this desk</CardDescription>
              </div>
              <FinanceExportMenu
                disabled={runs.length === 0}
                getPayload={() =>
                  getPayrollExportPayload("runs", {
                    periodLabel: `${months[periodMonth]} ${periodYear}`,
                    periodStart: period.start,
                    periodEnd: period.end,
                    statusFilter,
                    summary,
                    activeRateLabel,
                    transactions,
                    runs,
                    preview,
                  })
                }
              />
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No batch runs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Net total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.runId}>
                        <TableCell className="font-medium">{run.runNumber}</TableCell>
                        <TableCell>
                          {String(run.payPeriodStart).slice(0, 10)} – {String(run.payPeriodEnd).slice(0, 10)}
                        </TableCell>
                        <TableCell>{String(run.createdAt).slice(0, 10)}</TableCell>
                        <TableCell className="text-right">{run.createdCount}</TableCell>
                        <TableCell className="text-right">KES {kes(run.totalNet)}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === "paid" ? "default" : "secondary"}>{run.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {run.status !== "paid" && (
                            <Button variant="outline" size="sm" onClick={() => markRunPaid(run.runId)}>
                              Mark run paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-tables">
          <PayrollStatutoryRatesPanel />
        </TabsContent>
      </Tabs>

      <PayrollPayslipDialog open={payslipOpen} onOpenChange={setPayslipOpen} payroll={payslip} />
      <PayrollPayslipEmailDialog
        open={emailPayslipsOpen}
        onOpenChange={setEmailPayslipsOpen}
        periodLabel={`${months[periodMonth]} ${periodYear}`}
        transactions={transactions}
      />
    </div>
  )
}
