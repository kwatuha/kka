/**
 * Branded Excel / PDF / CSV payloads for HR payroll desk exports.
 */

import type { FinanceExportPayload } from "@/components/finance/finance-export-menu"
import { downloadPayrollRegisterPdf } from "@/lib/payroll-register-pdf"

function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0
}

function d(v: unknown): string {
  if (!v) return ""
  return String(v).slice(0, 10)
}

const REGISTER_HEADERS = [
  "Payroll #",
  "Employee #",
  "Employee",
  "Department",
  "Period start",
  "Period end",
  "Pay date",
  "Base salary",
  "Allowances",
  "Overtime",
  "Bonuses",
  "Gross",
  "PAYE",
  "NSSF",
  "NHIF/SHA",
  "Other deductions",
  "Total deductions",
  "Net pay",
  "Status",
  "Bank",
  "Account",
]

const REGISTER_NUM_COLS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

function registerRows(transactions: any[]): (string | number)[][] {
  return transactions.map((row) => [
    row.payrollNumber || "",
    row.employeeNumber || "",
    row.employeeName || "",
    row.departmentName || "",
    d(row.payPeriodStart),
    d(row.payPeriodEnd),
    d(row.paymentDate),
    num(row.baseSalary),
    num(row.allowances),
    num(row.overtime),
    num(row.bonuses),
    num(row.grossSalary),
    num(row.tax),
    num(row.nssf),
    num(row.nhif),
    num(row.otherDeductions),
    num(row.deductions),
    num(row.netSalary),
    row.paymentStatus || "",
    row.bankName || "",
    row.bankAccount || "",
  ])
}

function appendRegisterTotals(rows: (string | number)[][], transactions: any[]): (string | number)[][] {
  if (transactions.length === 0) return rows
  const sum = (key: string) => transactions.reduce((s, t) => s + num(t[key]), 0)
  return [
    ...rows,
    [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      sum("baseSalary"),
      sum("allowances"),
      sum("overtime"),
      sum("bonuses"),
      sum("grossSalary"),
      sum("tax"),
      sum("nssf"),
      sum("nhif"),
      sum("otherDeductions"),
      sum("deductions"),
      sum("netSalary"),
      "",
      "",
      "",
    ],
  ]
}

export type PayrollExportContext = {
  periodLabel: string
  periodStart: string
  periodEnd: string
  statusFilter: string
  summary: any | null
  activeRateLabel?: string
  transactions: any[]
  runs: any[]
  preview: any | null
  rateSets?: any[]
}

export function getPayrollExportPayload(
  tab: string,
  ctx: PayrollExportContext
): FinanceExportPayload | null {
  const periodSubtitle = `${ctx.periodLabel} (${ctx.periodStart} to ${ctx.periodEnd})`
  const summaryNote = ctx.summary
    ? `Gross KES ${num(ctx.summary.totalGross).toLocaleString()} · Net KES ${num(ctx.summary.totalNet).toLocaleString()}`
    : ""

  if (tab === "register") {
    if (ctx.transactions.length === 0) return null
    const statusPart = ctx.statusFilter === "all" ? "All statuses" : ctx.statusFilter
    const subtitle = `${periodSubtitle} - ${statusPart}${summaryNote ? ` - ${summaryNote}` : ""}`
    const filenameBase = `payroll-register-${ctx.periodStart}-${new Date().toISOString().slice(0, 10)}`
    return {
      filenamePrefix: `payroll-register-${ctx.periodStart}`,
      pdfTitle: "Payroll Register",
      pdfSubtitle: subtitle,
      pdfLandscape: true,
      numberColumns: REGISTER_NUM_COLS,
      headers: REGISTER_HEADERS,
      rows: appendRegisterTotals(registerRows(ctx.transactions), ctx.transactions),
      pdfExportFn: async () => {
        await downloadPayrollRegisterPdf({
          filename: `${filenameBase}.pdf`,
          title: "Payroll Register",
          subtitle,
          transactions: ctx.transactions,
        })
      },
    }
  }

  if (tab === "batch") {
    const lines = ctx.preview?.lines || []
    if (lines.length === 0) return null
    const headers = [
      "Employee #",
      "Employee",
      "Base",
      "Allowances",
      "Overtime",
      "Bonuses",
      "Gross",
      "PAYE",
      "NSSF",
      "NHIF/SHA",
      "Net pay",
    ]
    const rows: (string | number)[][] = lines.map((line: any) => [
      line.employeeNumber || "",
      line.employeeName || "",
      num(line.baseSalary),
      num(line.allowances),
      num(line.overtime),
      num(line.bonuses),
      num(line.grossSalary),
      num(line.tax),
      num(line.nssf),
      num(line.nhif),
      num(line.netSalary),
    ])
    const totals = ctx.preview?.totals
    if (totals) {
      rows.push([
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        num(totals.totalGross),
        num(totals.totalPaye),
        num(totals.totalNssf),
        num(totals.totalShif),
        num(totals.totalNet),
      ])
    }
    return {
      filenamePrefix: `payroll-batch-preview-${ctx.periodStart}`,
      pdfTitle: "Payroll Batch Preview",
      pdfSubtitle: `${periodSubtitle} · Payment ${ctx.preview?.paymentDate || ""} · ${ctx.activeRateLabel || "Statutory rates"}`,
      pdfLandscape: true,
      numberColumns: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      headers,
      rows,
    }
  }

  if (tab === "runs") {
    if (ctx.runs.length === 0) return null
    return {
      filenamePrefix: "payroll-batch-runs",
      pdfTitle: "Payroll Batch Run History",
      pdfSubtitle: periodSubtitle,
      pdfLandscape: true,
      numberColumns: [3, 4],
      headers: ["Run #", "Period start", "Period end", "Created", "Employees", "Net total", "Status", "Notes"],
      rows: ctx.runs.map((run) => [
        run.runNumber || "",
        d(run.payPeriodStart),
        d(run.payPeriodEnd),
        d(run.createdAt),
        num(run.createdCount),
        num(run.totalNet),
        run.status || "",
        run.notes || "",
      ]),
    }
  }

  if (tab === "tax-tables") {
    const sets = ctx.rateSets || []
    if (sets.length === 0) return null
    return {
      filenamePrefix: "payroll-statutory-rate-sets",
      pdfTitle: "Payroll Statutory Rate Sets",
      pdfSubtitle: `Active: ${ctx.activeRateLabel || "-"}`,
      pdfLandscape: true,
      numberColumns: [4, 5, 6, 7, 8, 9],
      headers: [
        "Code",
        "Label",
        "Effective from",
        "Effective to",
        "Personal relief",
        "NSSF rate",
        "NSSF tier 1 cap",
        "NSSF tier 2 cap",
        "SHA rate",
        "Housing levy rate",
        "Archived",
      ],
      rows: sets.map((r) => [
        r.code || "",
        r.label || "",
        d(r.effectiveFrom),
        r.effectiveTo ? d(r.effectiveTo) : "",
        num(r.personalReliefMonthly),
        num(r.nssfRate),
        num(r.nssfTier1Ceiling),
        num(r.nssfTier2Ceiling),
        num(r.shifRate),
        num(r.housingLevyRate),
        r.isArchived ? "Yes" : "No",
      ]),
    }
  }

  return null
}
