"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Loader2, Eye, Calendar, RefreshCw } from "lucide-react"
import { ledgerApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function LedgerAccountsPage() {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("")
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Account details dialog
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false)
  const [accountTransactions, setAccountTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await ledgerApi.getAccounts(searchQuery || undefined, accountTypeFilter || undefined, asOfDate)
      setAccounts(data || [])
    } catch (error: any) {
      console.error("Error loading accounts:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [searchQuery, accountTypeFilter, asOfDate])

  const handleViewAccount = async (account: any) => {
    setSelectedAccount(account)
    setAccountDetailsOpen(true)
    setLoadingTransactions(true)

    try {
      const transactions = await ledgerApi.getAccountTransactions(account.accountId.toString(), undefined, undefined, asOfDate)
      setAccountTransactions(transactions || [])
    } catch (error: any) {
      console.error("Error loading account transactions:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load account transactions",
        variant: "destructive",
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleRefresh = () => {
    loadAccounts()
  }

  // Group accounts by type for summary
  const accountsByType = accounts.reduce((acc, account) => {
    const type = account.accountType || 'Unknown'
    if (!acc[type]) {
      acc[type] = { count: 0, totalBalance: 0 }
    }
    acc[type].count++
    acc[type].totalBalance += parseFloat(account.balance) || 0
    return acc
  }, {} as Record<string, { count: number; totalBalance: number }>)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ledger Accounts</h1>
          <p className="text-muted-foreground">Query account balances at any given time</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            disabled={loading || accounts.length === 0}
            getPayload={() => {
              if (accounts.length === 0) return null
              return {
                filenamePrefix: `ledger-accounts-asof-${asOfDate}`,
                pdfTitle: "Ledger Accounts",
                pdfSubtitle: `Balances as of ${asOfDate}`,
                pdfLandscape: true,
                numberColumns: [3, 4, 5],
                headers: ["Account Code", "Account Name", "Type", "Total Debits", "Total Credits", "Balance", "Last Transaction", "As Of Date"],
                rows: accounts.map((a) => [
                  a.accountCode,
                  a.accountName,
                  a.accountType,
                  parseFloat(String(a.totalDebits ?? 0)) || 0,
                  parseFloat(String(a.totalCredits ?? 0)) || 0,
                  parseFloat(String(a.balance ?? 0)) || 0,
                  a.lastTransaction ? format(new Date(a.lastTransaction), "yyyy-MM-dd") : "",
                  asOfDate,
                ]),
              }
            }}
          />
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Search Accounts</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={accountTypeFilter || "all"} onValueChange={(value) => setAccountTypeFilter(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Asset">Asset</SelectItem>
                    <SelectItem value="Liability">Liability</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Revenue">Revenue</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label>Balance As Of</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quick Date</Label>
              <Select
                onValueChange={(value) => {
                  const today = new Date()
                  if (value === "today") {
                    setAsOfDate(today.toISOString().split('T')[0])
                  } else if (value === "yesterday") {
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    setAsOfDate(yesterday.toISOString().split('T')[0])
                  } else if (value === "month-end") {
                    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                    setAsOfDate(monthEnd.toISOString().split('T')[0])
                  } else if (value === "year-end") {
                    setAsOfDate(`${today.getFullYear()}-12-31`)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Quick select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="month-end">Month End</SelectItem>
                  <SelectItem value="year-end">Year End</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Label className="text-sm text-muted-foreground self-center">Quick Search:</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("patient")
                  setAccountTypeFilter("")
                }}
              >
                Patient Accounts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("doctor")
                  setAccountTypeFilter("")
                }}
              >
                Doctor Accounts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("receivable")
                  setAccountTypeFilter("")
                }}
              >
                Receivables
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setAccountTypeFilter("Asset")
                }}
              >
                All Assets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setAccountTypeFilter("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(accountsByType).map(([type, data]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.count}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.totalBalance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                Showing balances as of {format(new Date(asOfDate), "MMMM dd, yyyy")}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {accounts.length} accounts
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accounts found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Last Transaction</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
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
                      <TableCell className={`text-right font-medium ${
                        parseFloat(account.balance) < 0 ? 'text-red-600' :
                        parseFloat(account.balance) > 0 ? 'text-green-600' : ''
                      }`}>
                        {formatCurrency(account.balance)}
                      </TableCell>
                      <TableCell>
                        {account.lastTransaction
                          ? format(new Date(account.lastTransaction), "MMM dd, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAccount(account)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Details Dialog */}
      <Dialog open={accountDetailsOpen} onOpenChange={setAccountDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              {selectedAccount?.accountName} ({selectedAccount?.accountCode})
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Account Type</Label>
                  <div className="mt-1">
                    <Badge>{selectedAccount.accountType}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Balance As Of</Label>
                  <div className="mt-1 text-sm">
                    {format(new Date(asOfDate), "MMMM dd, yyyy")}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Debits</Label>
                  <div className="mt-1 font-medium">
                    {formatCurrency(selectedAccount.totalDebits || 0)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Credits</Label>
                  <div className="mt-1 font-medium">
                    {formatCurrency(selectedAccount.totalCredits || 0)}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm text-muted-foreground">Current Balance</Label>
                  <div className={`mt-1 text-2xl font-bold ${
                    parseFloat(selectedAccount.balance) < 0 ? 'text-red-600' :
                    parseFloat(selectedAccount.balance) > 0 ? 'text-green-600' : ''
                  }`}>
                    {formatCurrency(selectedAccount.balance || 0)}
                  </div>
                </div>
              </div>

              {selectedAccount.description && (
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{selectedAccount.description}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-2 block">Transaction History</Label>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : accountTransactions.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No transactions found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Transaction #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Debit</TableHead>
                          <TableHead>Credit</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountTransactions.map((txn) => {
                          const isDebit = txn.debitAccountId === selectedAccount.accountId
                          return (
                            <TableRow key={txn.transactionId}>
                              <TableCell className="text-sm">
                                {format(new Date(txn.transactionDate), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {txn.transactionNumber}
                              </TableCell>
                              <TableCell className="text-sm">{txn.description}</TableCell>
                              <TableCell className="text-sm">
                                {isDebit ? formatCurrency(txn.amount) : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {!isDebit ? formatCurrency(txn.amount) : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {txn.referenceNumber || "-"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
