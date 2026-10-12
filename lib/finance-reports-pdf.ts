/**
 * Trial balance, income statement, and balance sheet PDF downloads.
 */

import { format } from "date-fns"
import {
  drawFinanceLetterhead,
  financeTableStyles,
  kes,
  loadFinancePdf,
  parseAmount,
  tableFinalY,
} from "@/lib/finance-pdf-utils"

export async function downloadTrialBalancePdf(trialBalance: Record<string, unknown>) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const reportDate = trialBalance.reportDate
    ? format(new Date(String(trialBalance.reportDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const startY = await drawFinanceLetterhead(pdf, "Trial Balance", `As of ${reportDate}`)

  const accounts = (trialBalance.accounts || []) as Array<Record<string, unknown>>
  const totals = (trialBalance.totals || {}) as Record<string, unknown>

  const body = accounts.map((account) => [
    String(account.accountCode || ""),
    String(account.accountName || ""),
    String(account.accountType || ""),
    parseAmount(account.totalDebits) > 0 ? kes(parseAmount(account.totalDebits)) : "-",
    parseAmount(account.totalCredits) > 0 ? kes(parseAmount(account.totalCredits)) : "-",
    kes(parseAmount(account.balance)),
  ])

  body.push([
    "TOTAL",
    "",
    "",
    kes(parseAmount(totals.totalDebits)),
    kes(parseAmount(totals.totalCredits)),
    kes(parseAmount(totals.totalDebits) - parseAmount(totals.totalCredits)),
  ])

  autoTable(pdf, {
    head: [["Code", "Account name", "Type", "Debit", "Credit", "Balance"]],
    body: body.length > 1 ? body : [["-", "No accounts", "-", "-", "-", "-"]],
    startY,
    ...financeTableStyles,
    footStyles: { fillColor: [229, 241, 248], textColor: 20, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 80 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
  })

  const balanced = Boolean(trialBalance.isBalanced)
  pdf.setFontSize(9)
  pdf.text(
    balanced ? "Status: Balanced" : "Status: Not balanced",
    14,
    tableFinalY(pdf) + 8
  )

  pdf.save(`trial-balance-${String(trialBalance.reportDate || format(new Date(), "yyyy-MM-dd")).slice(0, 10)}.pdf`)
}

export async function downloadIncomeStatementPdf(incomeStatement: Record<string, unknown>) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const start = incomeStatement.startDate
    ? format(new Date(String(incomeStatement.startDate)), "dd MMM yyyy")
    : " -"
  const end = incomeStatement.endDate ? format(new Date(String(incomeStatement.endDate)), "dd MMM yyyy") : " -"

  const startY = await drawFinanceLetterhead(pdf, "Income Statement", `Period: ${start} to ${end}`)

  const revenue = (incomeStatement.revenue || {}) as { accounts?: Array<Record<string, unknown>>; total?: unknown }
  const expenses = (incomeStatement.expenses || {}) as { accounts?: Array<Record<string, unknown>>; total?: unknown }

  const revenueRows = (revenue.accounts || []).map((a) => [
    String(a.accountCode || ""),
    String(a.accountName || ""),
    kes(parseAmount(a.amount)),
  ])
  if (revenueRows.length === 0) revenueRows.push([" -", "No revenue accounts", " -"])
  revenueRows.push(["", "Total revenue", kes(parseAmount(revenue.total))])

  autoTable(pdf, {
    head: [["Revenue  - Code", "Account name", "Amount"]],
    body: revenueRows,
    startY,
    ...financeTableStyles,
    columnStyles: { 2: { halign: "right" } },
  })

  let y = tableFinalY(pdf) + 10
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("Expenses", 14, y)
  pdf.setFont("helvetica", "normal")

  const expenseRows = (expenses.accounts || []).map((a) => [
    String(a.accountCode || ""),
    String(a.accountName || ""),
    kes(parseAmount(a.amount)),
  ])
  if (expenseRows.length === 0) expenseRows.push([" -", "No expense accounts", " -"])
  expenseRows.push(["", "Total expenses", kes(parseAmount(expenses.total))])

  autoTable(pdf, {
    head: [["Code", "Account name", "Amount"]],
    body: expenseRows,
    startY: y + 4,
    ...financeTableStyles,
    columnStyles: { 2: { halign: "right" } },
  })

  const net = parseAmount(incomeStatement.netIncome)
  y = tableFinalY(pdf) + 10
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "bold")
  pdf.text(`Net income: ${kes(net)}`, 14, y)

  pdf.save(`income-statement-${String(incomeStatement.endDate || format(new Date(), "yyyy-MM-dd")).slice(0, 10)}.pdf`)
}

export async function downloadBalanceSheetPdf(balanceSheet: Record<string, unknown>) {
  if (typeof window === "undefined") return

  const { jsPDF, autoTable } = await loadFinancePdf()
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const reportDate = balanceSheet.reportDate
    ? format(new Date(String(balanceSheet.reportDate)), "dd MMMM yyyy")
    : format(new Date(), "dd MMMM yyyy")

  const startY = await drawFinanceLetterhead(pdf, "Statement of Financial Position", `As of ${reportDate}`)

  const assets = (balanceSheet.assets || {}) as { accounts?: Array<Record<string, unknown>>; total?: unknown }
  const liabilities = (balanceSheet.liabilities || {}) as { accounts?: Array<Record<string, unknown>>; total?: unknown }
  const equity = (balanceSheet.equity || {}) as {
    accounts?: Array<Record<string, unknown>>
    total?: unknown
    retainedEarnings?: unknown
  }

  const assetRows = (assets.accounts || []).map((a) => [
    `${a.accountCode || ""}  - ${a.accountName || ""}`,
    kes(parseAmount(a.balance)),
  ])
  if (assetRows.length === 0) assetRows.push(["No asset accounts", " -"])
  assetRows.push(["Total assets", kes(parseAmount(assets.total))])

  autoTable(pdf, {
    head: [["Assets", "Amount"]],
    body: assetRows,
    startY,
    ...financeTableStyles,
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
  })

  let y = tableFinalY(pdf) + 10
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("Liabilities & equity", 14, y)
  pdf.setFont("helvetica", "normal")

  const liabEquityRows: string[][] = [[" - Liabilities  -", ""]]
  for (const a of liabilities.accounts || []) {
    liabEquityRows.push([`${a.accountCode || ""}  - ${a.accountName || ""}`, kes(parseAmount(a.balance))])
  }
  if ((liabilities.accounts || []).length === 0) liabEquityRows.push(["No liability accounts", " -"])
  liabEquityRows.push(["Total liabilities", kes(parseAmount(liabilities.total))])
  liabEquityRows.push([" - Equity  -", ""])
  for (const a of equity.accounts || []) {
    liabEquityRows.push([`${a.accountCode || ""}  - ${a.accountName || ""}`, kes(parseAmount(a.balance))])
  }
  if (parseAmount(equity.retainedEarnings) !== 0) {
    liabEquityRows.push(["Retained earnings", kes(parseAmount(equity.retainedEarnings))])
  }
  liabEquityRows.push(["Total equity", kes(parseAmount(equity.total))])
  liabEquityRows.push([
    "Total liabilities & equity",
    kes(parseAmount(balanceSheet.totalLiabilitiesAndEquity)),
  ])

  autoTable(pdf, {
    head: [["Account", "Amount"]],
    body: liabEquityRows,
    startY: y + 4,
    ...financeTableStyles,
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
  })

  const balanced = Boolean(balanceSheet.isBalanced)
  pdf.setFontSize(9)
  pdf.text(
    balanced ? "Status: Balanced" : "Status: Not balanced",
    14,
    tableFinalY(pdf) + 8
  )

  pdf.save(`balance-sheet-${String(balanceSheet.reportDate || format(new Date(), "yyyy-MM-dd")).slice(0, 10)}.pdf`)
}
