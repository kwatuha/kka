"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, ArrowUpRight, ArrowDownLeft, Loader2, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useTheme } from "next-themes"
import { cashApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { AddTransactionForm } from "@/components/add-transaction-form"

export default function CashManagementPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [openAddTransactionForm, setOpenAddTransactionForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadTransactions()
      loadAccounts()
      loadStats()
    }
  }, [isMounted, typeFilter])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await cashApi.getTransactions(typeFilter || undefined)
      setTransactions(data || [])
    } catch (error: any) {
      console.error("Error loading transactions:", error)
      toast({
        title: "Error loading transactions",
        description: error.message || "Failed to load transactions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      setAccountsLoading(true)
      const data = await cashApi.getAccounts()
      setAccounts(data || [])
    } catch (error: any) {
      console.error("Error loading accounts:", error)
      toast({
        title: "Error loading accounts",
        description: error.message || "Failed to load accounts",
        variant: "destructive",
      })
    } finally {
      setAccountsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await cashApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleView = async (transaction: any) => {
    try {
      const details = await cashApi.getTransactionById(transaction.cashTransactionId.toString())
      setSelectedTransaction(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load transaction details",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction)
    setOpenAddTransactionForm(true)
  }

  const handleDeleteClick = (transaction: any) => {
    setDeletingTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return

    try {
      setDeleteLoading(true)
      await cashApi.deleteTransaction(deletingTransaction.cashTransactionId.toString())
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingTransaction(null)
      loadTransactions()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleTransactionSaved = () => {
    loadTransactions()
    loadStats()
    setEditingTransaction(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "receipt":
        return "Income"
      case "payment":
        return "Expense"
      case "transfer":
        return "Transfer"
      case "adjustment":
        return "Adjustment"
      default:
        return type
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      transaction.transactionNumber?.toLowerCase().includes(query) ||
      transaction.referenceNumber?.toLowerCase().includes(query) ||
      transaction.notes?.toLowerCase().includes(query) ||
      transaction.cashRegister?.toLowerCase().includes(query)
    )
  })

  // Calculate summary stats from transactions
  const calculatedStats = useMemo(() => {
    const totalReceipts = transactions
      .filter((t) => t.transactionType === "receipt")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    const totalPayments = transactions
      .filter((t) => t.transactionType === "payment")
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    const netCashFlow = totalReceipts - totalPayments
    const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

    return {
      totalBalance,
      totalReceipts,
      totalPayments,
      netCashFlow,
    }
  }, [transactions, accounts])

  // Prepare data for chart (last 6 months)
  const cashFlowData = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = format(date, "MMM")
      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.transactionDate)
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear()
      })
      const income = monthTransactions
        .filter((t) => t.transactionType === "receipt")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      const expenses = monthTransactions
        .filter((t) => t.transactionType === "payment")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      months.push({
        name: monthKey,
        Income: income,
        Expenses: expenses,
        Balance: income - expenses,
      })
    }
    return months
  }, [transactions])

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Management</h1>
          <p className="text-muted-foreground">Manage cash flow and bank accounts</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AddTransactionForm
        open={openAddTransactionForm}
        setOpen={(open: boolean) => {
          setOpenAddTransactionForm(open)
          if (!open) {
            setEditingTransaction(null)
          }
        }}
        onSuccess={handleTransactionSaved}
        editData={editingTransaction}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Management</h1>
          <p className="text-muted-foreground">Manage cash flow and bank accounts</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (filteredTransactions.length === 0) return null
              return {
                filenamePrefix: "cash-transactions",
                pdfTitle: "Cash Transactions",
                pdfSubtitle: "Cash register activity",
                pdfLandscape: true,
                numberColumns: [3],
                headers: ["Date", "Transaction #", "Type", "Amount", "Register", "Reference", "Notes"],
                rows: filteredTransactions.map((t) => [
                  t.transactionDate ? format(new Date(t.transactionDate), "yyyy-MM-dd") : "",
                  t.transactionNumber || "",
                  t.transactionType || "",
                  parseFloat(String(t.amount ?? 0)) || 0,
                  t.cashRegister || "",
                  t.referenceNumber || "",
                  t.notes || "",
                ]),
              }
            }}
          />
          <Button
            onClick={() => {
              setEditingTransaction(null)
              setOpenAddTransactionForm(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(calculatedStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Income (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(calculatedStats.totalReceipts)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalReceipts ? `${stats.totalReceipts} transactions` : "Last 30 days"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(calculatedStats.totalPayments)}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalPayments ? `${stats.totalPayments} transactions` : "Last 30 days"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${calculatedStats.netCashFlow >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatCurrency(calculatedStats.netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">For current period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trend</CardTitle>
          <CardDescription>Monthly income, expenses, and balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                  <XAxis dataKey="name" stroke={isDark ? "#888" : "#333"} tick={{ fill: isDark ? "#888" : "#333" }} />
                  <YAxis
                    stroke={isDark ? "#888" : "#333"}
                    tick={{ fill: isDark ? "#888" : "#333" }}
                    tickFormatter={(value) => formatCurrency(value).replace("KES", "")}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1f2937" : "#fff",
                      color: isDark ? "#fff" : "#000",
                      border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                    }}
                    formatter={(value) => [formatCurrency(value as number), ""]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No transaction data to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Transactions</CardTitle>
              <CardDescription>View and manage cash transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={typeFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={typeFilter === "receipt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter("receipt")}
                  >
                    Income
                  </Button>
                  <Button
                    variant={typeFilter === "payment" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter("payment")}
                  >
                    Expenses
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Cash Register</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Handled By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => {
                        const isIncome = transaction.transactionType === "receipt"
                        const isExpense = transaction.transactionType === "payment"
                        return (
                          <TableRow key={transaction.cashTransactionId}>
                            <TableCell className="font-medium">{transaction.transactionNumber || "-"}</TableCell>
                            <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {isIncome ? (
                                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                                ) : isExpense ? (
                                  <ArrowDownLeft className="mr-1 h-4 w-4 text-red-500" />
                                ) : null}
                                <span className={isIncome ? "text-green-600" : isExpense ? "text-red-600" : ""}>
                                  {getTransactionTypeLabel(transaction.transactionType)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell
                              className={isIncome ? "text-green-600" : isExpense ? "text-red-600" : "font-medium"}
                            >
                              {isIncome ? "+" : isExpense ? "-" : ""}
                              {formatCurrency(parseFloat(transaction.amount))}
                            </TableCell>
                            <TableCell>{transaction.cashRegister || "-"}</TableCell>
                            <TableCell>{transaction.referenceNumber || "-"}</TableCell>
                            <TableCell>
                              {transaction.firstName && transaction.lastName
                                ? `${transaction.firstName} ${transaction.lastName}`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleView(transaction)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(transaction)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>View and manage bank accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    All
                  </Button>
                  <Button variant="outline" size="sm">
                    Active
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search accounts..." className="w-full pl-8" />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading accounts...</p>
                        </TableCell>
                      </TableRow>
                    ) : accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((account) => (
                        <TableRow key={account.accountId}>
                          <TableCell className="font-medium">{account.accountCode || "-"}</TableCell>
                          <TableCell>{account.accountName || "-"}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(account.balance || 0))}</TableCell>
                          <TableCell>
                            <Badge variant={account.isActive ? "default" : "secondary"}>
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedTransaction && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription>View complete transaction information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction Number</p>
                  <p className="text-sm font-semibold">{selectedTransaction.transactionNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">{formatDate(selectedTransaction.transactionDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm font-semibold">{getTransactionTypeLabel(selectedTransaction.transactionType)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm font-semibold">{formatCurrency(parseFloat(selectedTransaction.amount))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Register</p>
                  <p className="text-sm">{selectedTransaction.cashRegister || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                  <p className="text-sm">{selectedTransaction.referenceNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference Type</p>
                  <p className="text-sm">{selectedTransaction.referenceType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Handled By</p>
                  <p className="text-sm">
                    {selectedTransaction.firstName && selectedTransaction.lastName
                      ? `${selectedTransaction.firstName} ${selectedTransaction.lastName}`
                      : "—"}
                  </p>
                </div>
              </div>
              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              {deletingTransaction && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Transaction: {deletingTransaction.transactionNumber}</p>
                  <p className="text-sm">Amount: {formatCurrency(parseFloat(deletingTransaction.amount))}</p>
                  <p className="text-sm">Date: {formatDate(deletingTransaction.transactionDate)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
