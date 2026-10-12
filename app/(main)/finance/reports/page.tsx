"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, FileText, TrendingUp, Building2, Printer } from "lucide-react"
import {
  downloadBalanceSheetPdf,
  downloadIncomeStatementPdf,
  downloadTrialBalancePdf,
} from "@/lib/finance-reports-pdf"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import { ledgerApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [activeTab, setActiveTab] = useState("trial-balance")

  // Trial Balance
  const [trialBalance, setTrialBalance] = useState<any>(null)
  const [trialBalanceDate, setTrialBalanceDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Income Statement
  const [incomeStatement, setIncomeStatement] = useState<any>(null)
  const [incomeStartDate, setIncomeStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`)
  const [incomeEndDate, setIncomeEndDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Balance Sheet
  const [balanceSheet, setBalanceSheet] = useState<any>(null)
  const [balanceSheetDate, setBalanceSheetDate] = useState<string>(new Date().toISOString().split('T')[0])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const loadTrialBalance = async () => {
    try {
      setLoading(true)
      const data = await ledgerApi.getTrialBalance(trialBalanceDate)
      setTrialBalance(data)
    } catch (error: any) {
      console.error("Error loading trial balance:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load trial balance",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadIncomeStatement = async () => {
    try {
      setLoading(true)
      const data = await ledgerApi.getIncomeStatement(incomeStartDate, incomeEndDate)
      setIncomeStatement(data)
    } catch (error: any) {
      console.error("Error loading income statement:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load income statement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBalanceSheet = async () => {
    try {
      setLoading(true)
      const data = await ledgerApi.getBalanceSheet(balanceSheetDate)
      setBalanceSheet(data)
    } catch (error: any) {
      console.error("Error loading balance sheet:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load balance sheet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "trial-balance" && !trialBalance) {
      loadTrialBalance()
    } else if (activeTab === "income-statement" && !incomeStatement) {
      loadIncomeStatement()
    } else if (activeTab === "balance-sheet" && !balanceSheet) {
      loadBalanceSheet()
    }
  }, [activeTab])

  const handleExportPDF = async () => {
    try {
      setPdfExporting(true)
      if (activeTab === "trial-balance") {
        if (!trialBalance) {
          toast({ title: "No data", description: "Load the trial balance first.", variant: "destructive" })
          return
        }
        await downloadTrialBalancePdf(trialBalance)
      } else if (activeTab === "income-statement") {
        if (!incomeStatement) {
          toast({ title: "No data", description: "Load the income statement first.", variant: "destructive" })
          return
        }
        await downloadIncomeStatementPdf(incomeStatement)
      } else if (activeTab === "balance-sheet") {
        if (!balanceSheet) {
          toast({ title: "No data", description: "Load the balance sheet first.", variant: "destructive" })
          return
        }
        await downloadBalanceSheetPdf(balanceSheet)
      }
    } catch (error) {
      console.error("Finance report PDF:", error)
      toast({
        title: "Export failed",
        description: "Could not generate the PDF.",
        variant: "destructive",
      })
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">Standard financial reports and statements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print page
          </Button>
          <FinanceExportMenu
            disabled={loading}
            getPayload={() => {
              if (activeTab === "trial-balance" && trialBalance?.accounts?.length) {
                return {
                  filenamePrefix: "trial-balance",
                  pdfTitle: "Trial Balance",
                  pdfSubtitle: `As of ${trialBalanceDate}`,
                  pdfLandscape: true,
                  numberColumns: [3, 4, 5],
                  headers: ["Account Code", "Account Name", "Type", "Debit", "Credit", "Balance"],
                  rows: trialBalance.accounts.map((a: any) => [
                    a.accountCode,
                    a.accountName,
                    a.accountType,
                    parseFloat(a.totalDebits) || 0,
                    parseFloat(a.totalCredits) || 0,
                    parseFloat(a.balance) || 0,
                  ]),
                }
              }
              if (activeTab === "income-statement" && incomeStatement) {
                const rows: (string | number)[][] = []
                for (const a of incomeStatement.revenue?.accounts || []) {
                  rows.push(["Revenue", a.accountCode, a.accountName, parseFloat(a.amount) || 0])
                }
                for (const a of incomeStatement.expenses?.accounts || []) {
                  rows.push(["Expense", a.accountCode, a.accountName, parseFloat(a.amount) || 0])
                }
                if (rows.length === 0) return null
                return {
                  filenamePrefix: "income-statement",
                  pdfTitle: "Income Statement",
                  pdfSubtitle: `${incomeStartDate} to ${incomeEndDate}`,
                  numberColumns: [3],
                  headers: ["Section", "Account Code", "Account Name", "Amount"],
                  rows,
                }
              }
              if (activeTab === "balance-sheet" && balanceSheet) {
                const rows: (string | number)[][] = []
                for (const a of balanceSheet.assets?.accounts || []) {
                  rows.push(["Asset", `${a.accountCode} ${a.accountName}`, parseFloat(a.balance) || 0])
                }
                for (const a of balanceSheet.liabilities?.accounts || []) {
                  rows.push(["Liability", `${a.accountCode} ${a.accountName}`, parseFloat(a.balance) || 0])
                }
                for (const a of balanceSheet.equity?.accounts || []) {
                  rows.push(["Equity", `${a.accountCode} ${a.accountName}`, parseFloat(a.balance) || 0])
                }
                if (balanceSheet.equity?.retainedEarnings) {
                  rows.push(["Equity", "Retained earnings", parseFloat(balanceSheet.equity.retainedEarnings) || 0])
                }
                if (rows.length === 0) return null
                return {
                  filenamePrefix: "balance-sheet",
                  pdfTitle: "Balance Sheet",
                  pdfSubtitle: `As of ${balanceSheetDate}`,
                  numberColumns: [2],
                  headers: ["Section", "Account", "Amount"],
                  rows,
                }
              }
              return null
            }}
          />
          <Button variant="outline" onClick={handleExportPDF} disabled={pdfExporting || loading}>
            {pdfExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trial-balance" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>List of all accounts with their debit and credit balances</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="trial-date" className="text-sm">As of:</Label>
                    <Input
                      id="trial-date"
                      type="date"
                      value={trialBalanceDate}
                      onChange={(e) => setTrialBalanceDate(e.target.value)}
                      className="w-40"
                    />
                    <Button onClick={loadTrialBalance} disabled={loading} size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !trialBalance ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : trialBalance ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Report Date: {format(new Date(trialBalance.reportDate), "MMMM dd, yyyy")}
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.accounts.map((account: any) => (
                          <TableRow key={account.accountId}>
                            <TableCell className="font-medium">{account.accountCode}</TableCell>
                            <TableCell>{account.accountName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{account.accountType}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {parseFloat(account.totalDebits) > 0 ? formatCurrency(account.totalDebits) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseFloat(account.totalCredits) > 0 ? formatCurrency(account.totalCredits) : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(account.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted">
                          <TableCell colSpan={3}>TOTAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(trialBalance.totals.totalDebits)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(trialBalance.totals.totalCredits)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(trialBalance.totals.totalDebits - trialBalance.totals.totalCredits)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trialBalance.isBalanced ? "default" : "destructive"}>
                      {trialBalance.isBalanced ? "Balanced" : "Not Balanced"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Difference: {formatCurrency(Math.abs(trialBalance.totals.totalDebits - trialBalance.totals.totalCredits))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>Profit & Loss Statement showing revenue and expenses</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="income-start" className="text-sm">From:</Label>
                    <Input
                      id="income-start"
                      type="date"
                      value={incomeStartDate}
                      onChange={(e) => setIncomeStartDate(e.target.value)}
                      className="w-40"
                    />
                    <Label htmlFor="income-end" className="text-sm">To:</Label>
                    <Input
                      id="income-end"
                      type="date"
                      value={incomeEndDate}
                      onChange={(e) => setIncomeEndDate(e.target.value)}
                      className="w-40"
                    />
                    <Button onClick={loadIncomeStatement} disabled={loading} size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !incomeStatement ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : incomeStatement ? (
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Period: {format(new Date(incomeStatement.startDate), "MMMM dd, yyyy")} to {format(new Date(incomeStatement.endDate), "MMMM dd, yyyy")}
                  </div>

                  {/* Revenue Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Revenue</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomeStatement.revenue.accounts.length > 0 ? (
                            incomeStatement.revenue.accounts.map((account: any) => (
                              <TableRow key={account.accountId}>
                                <TableCell className="font-medium">{account.accountCode}</TableCell>
                                <TableCell>{account.accountName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(account.amount)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">No revenue accounts</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="font-bold bg-muted">
                            <TableCell colSpan={2}>Total Revenue</TableCell>
                            <TableCell className="text-right">{formatCurrency(incomeStatement.revenue.total)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Expenses</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomeStatement.expenses.accounts.length > 0 ? (
                            incomeStatement.expenses.accounts.map((account: any) => (
                              <TableRow key={account.accountId}>
                                <TableCell className="font-medium">{account.accountCode}</TableCell>
                                <TableCell>{account.accountName}</TableCell>
                                <TableCell className="text-right">{formatCurrency(account.amount)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">No expense accounts</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="font-bold bg-muted">
                            <TableCell colSpan={2}>Total Expenses</TableCell>
                            <TableCell className="text-right">{formatCurrency(incomeStatement.expenses.total)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Net Income</span>
                      <span className={`text-lg font-bold ${incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(incomeStatement.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Statement of Financial Position</CardTitle>
                  <CardDescription>Balance Sheet showing assets, liabilities, and equity</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="balance-date" className="text-sm">As of:</Label>
                    <Input
                      id="balance-date"
                      type="date"
                      value={balanceSheetDate}
                      onChange={(e) => setBalanceSheetDate(e.target.value)}
                      className="w-40"
                    />
                    <Button onClick={loadBalanceSheet} disabled={loading} size="sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !balanceSheet ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : balanceSheet ? (
                <div className="space-y-6">
                  <div className="text-sm text-muted-foreground">
                    Report Date: {format(new Date(balanceSheet.reportDate), "MMMM dd, yyyy")}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Assets</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {balanceSheet.assets.accounts.length > 0 ? (
                              balanceSheet.assets.accounts.map((account: any) => (
                                <TableRow key={account.accountId}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{account.accountCode}</div>
                                      <div className="text-sm text-muted-foreground">{account.accountName}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">No asset accounts</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="font-bold bg-muted">
                              <TableCell>Total Assets</TableCell>
                              <TableCell className="text-right">{formatCurrency(balanceSheet.assets.total)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Liabilities & Equity</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Liabilities */}
                            <TableRow>
                              <TableCell colSpan={2} className="font-semibold bg-muted/50">Liabilities</TableCell>
                            </TableRow>
                            {balanceSheet.liabilities.accounts.length > 0 ? (
                              balanceSheet.liabilities.accounts.map((account: any) => (
                                <TableRow key={account.accountId}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{account.accountCode}</div>
                                      <div className="text-sm text-muted-foreground">{account.accountName}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">No liability accounts</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="font-bold bg-muted">
                              <TableCell>Total Liabilities</TableCell>
                              <TableCell className="text-right">{formatCurrency(balanceSheet.liabilities.total)}</TableCell>
                            </TableRow>

                            {/* Equity */}
                            <TableRow>
                              <TableCell colSpan={2} className="font-semibold bg-muted/50 pt-4">Equity</TableCell>
                            </TableRow>
                            {balanceSheet.equity.accounts.length > 0 ? (
                              balanceSheet.equity.accounts.map((account: any) => (
                                <TableRow key={account.accountId}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{account.accountCode}</div>
                                      <div className="text-sm text-muted-foreground">{account.accountName}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">No equity accounts</TableCell>
                              </TableRow>
                            )}
                            {balanceSheet.equity.retainedEarnings !== 0 && (
                              <TableRow>
                                <TableCell>Retained Earnings</TableCell>
                                <TableCell className="text-right">{formatCurrency(balanceSheet.equity.retainedEarnings)}</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="font-bold bg-muted">
                              <TableCell>Total Equity</TableCell>
                              <TableCell className="text-right">{formatCurrency(balanceSheet.equity.total)}</TableCell>
                            </TableRow>
                            <TableRow className="font-bold bg-primary/10">
                              <TableCell>Total Liabilities & Equity</TableCell>
                              <TableCell className="text-right">{formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={balanceSheet.isBalanced ? "default" : "destructive"}>
                      {balanceSheet.isBalanced ? "Balanced" : "Not Balanced"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Difference: {formatCurrency(Math.abs(balanceSheet.assets.total - balanceSheet.totalLiabilitiesAndEquity))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
