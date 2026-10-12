"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import { AddJournalEntryForm } from "@/components/add-journal-entry-form"
import { ledgerApi } from "@/lib/api"
import { format } from "date-fns"
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

interface Account {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  balance?: number
  lastTransaction?: string
  isActive?: boolean
}

interface Transaction {
  transactionId: number
  transactionNumber: string
  transactionDate: string
  description: string
  referenceNumber?: string
  referenceType?: string
  debitAccountId: number
  creditAccountId: number
  debitAccountCode?: string
  debitAccountName?: string
  creditAccountCode?: string
  creditAccountName?: string
  amount: number
  notes?: string
}

export default function GeneralLedgerPage() {
  const [openAddJournalForm, setOpenAddJournalForm] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("")
  const [accountSearch, setAccountSearch] = useState("")
  const [transactionSearch, setTransactionSearch] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("")
  
  // View/Edit/Delete states
  const [viewAccountOpen, setViewAccountOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [viewTransactionOpen, setViewTransactionOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [deletingAccountLoading, setDeletingAccountLoading] = useState(false)
  const [ledgerTab, setLedgerTab] = useState("accounts")
  const [deleteTransactionOpen, setDeleteTransactionOpen] = useState(false)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [deletingTransactionLoading, setDeletingTransactionLoading] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true)
      setError(null)
      const data = await ledgerApi.getAccounts(
        accountSearch || undefined,
        accountTypeFilter || undefined
      )
      setAccounts(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts')
      console.error('Error loading accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true)
      setError(null)
      
      let startDate: string | undefined
      let endDate: string | undefined
      
      if (dateFilter === "thisMonth") {
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      } else if (dateFilter === "lastMonth") {
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      }
      
      const data = await ledgerApi.getTransactions(
        transactionSearch || undefined,
        startDate,
        endDate
      )
      setTransactions(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions')
      console.error('Error loading transactions:', err)
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [accountTypeFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (accountSearch !== undefined) {
        loadAccounts()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [accountSearch])

  useEffect(() => {
    loadTransactions()
  }, [dateFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (transactionSearch !== undefined) {
        loadTransactions()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [transactionSearch])

  const filteredAccounts = accounts.filter((account) => {
    if (accountSearch) {
      const searchLower = accountSearch.toLowerCase()
      return (
        account.accountCode.toLowerCase().includes(searchLower) ||
        account.accountName.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const filteredTransactions = transactions.filter((transaction) => {
    if (transactionSearch) {
      const searchLower = transactionSearch.toLowerCase()
      return (
        transaction.transactionNumber.toLowerCase().includes(searchLower) ||
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.referenceNumber?.toLowerCase().includes(searchLower) ||
        transaction.debitAccountCode?.toLowerCase().includes(searchLower) ||
        transaction.creditAccountCode?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleViewAccount = async (account: Account) => {
    try {
      const details = await ledgerApi.getAccountById(account.accountId.toString())
      setSelectedAccount(details)
      setViewAccountOpen(true)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load account details",
        variant: "destructive",
      })
    }
  }

  const handleViewTransaction = async (transaction: Transaction) => {
    try {
      const details = await ledgerApi.getTransactionById(transaction.transactionId.toString())
      setSelectedTransaction(details)
      setViewTransactionOpen(true)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load transaction details",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccountClick = (account: Account) => {
    setDeletingAccount(account)
    setDeleteAccountOpen(true)
  }

  const handleDeleteAccountConfirm = async () => {
    if (!deletingAccount) return

    try {
      setDeletingAccountLoading(true)
      await ledgerApi.deleteAccount(deletingAccount.accountId.toString())
      toast({
        title: "Success",
        description: "Account deleted successfully",
      })
      setDeleteAccountOpen(false)
      setDeletingAccount(null)
      loadAccounts()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete account",
        variant: "destructive",
      })
    } finally {
      setDeletingAccountLoading(false)
    }
  }

  const handleDeleteTransactionClick = (transaction: Transaction) => {
    setDeletingTransaction(transaction)
    setDeleteTransactionOpen(true)
  }

  const handleDeleteTransactionConfirm = async () => {
    if (!deletingTransaction) return

    try {
      setDeletingTransactionLoading(true)
      await ledgerApi.deleteTransaction(deletingTransaction.transactionId.toString())
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
      setDeleteTransactionOpen(false)
      setDeletingTransaction(null)
      loadTransactions()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setDeletingTransactionLoading(false)
    }
  }

  const handleJournalEntrySaved = () => {
    loadTransactions()
    loadAccounts()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground">Manage chart of accounts and financial transactions</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (ledgerTab === "accounts") {
                if (filteredAccounts.length === 0) return null
                return {
                  filenamePrefix: "chart-of-accounts",
                  pdfTitle: "Chart of Accounts",
                  pdfSubtitle: "General ledger account listing",
                  numberColumns: [3],
                  headers: ["Account Code", "Account Name", "Type", "Balance", "Last Transaction", "Active"],
                  rows: filteredAccounts.map((a) => [
                    a.accountCode,
                    a.accountName,
                    a.accountType,
                    parseFloat(String(a.balance ?? 0)) || 0,
                    a.lastTransaction ? formatDate(a.lastTransaction) : "",
                    a.isActive === false ? "No" : "Yes",
                  ]),
                }
              }
              if (filteredTransactions.length === 0) return null
              return {
                filenamePrefix: "general-ledger-transactions",
                pdfTitle: "General Ledger Transactions",
                pdfSubtitle: "Journal entries",
                pdfLandscape: true,
                numberColumns: [5],
                headers: ["Date", "Transaction #", "Description", "Debit Account", "Credit Account", "Amount", "Reference", "Reference Type"],
                rows: filteredTransactions.map((t) => [
                  formatDate(t.transactionDate),
                  t.transactionNumber,
                  t.description,
                  t.debitAccountCode ? `${t.debitAccountCode} ${t.debitAccountName || ""}`.trim() : String(t.debitAccountId),
                  t.creditAccountCode ? `${t.creditAccountCode} ${t.creditAccountName || ""}`.trim() : String(t.creditAccountId),
                  parseFloat(String(t.amount ?? 0)) || 0,
                  t.referenceNumber || "",
                  t.referenceType || "",
                ]),
              }
            }}
          />
          <Button onClick={() => setOpenAddJournalForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      <Tabs value={ledgerTab} onValueChange={setLedgerTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>Manage financial accounts and their balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={accountTypeFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("")}
                  >
                    All
                  </Button>
                  <Button
                    variant={accountTypeFilter === "Asset" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("Asset")}
                  >
                    Assets
                  </Button>
                  <Button
                    variant={accountTypeFilter === "Liability" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("Liability")}
                  >
                    Liabilities
                  </Button>
                  <Button
                    variant={accountTypeFilter === "Equity" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("Equity")}
                  >
                    Equity
                  </Button>
                  <Button
                    variant={accountTypeFilter === "Revenue" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("Revenue")}
                  >
                    Revenue
                  </Button>
                  <Button
                    variant={accountTypeFilter === "Expense" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAccountTypeFilter("Expense")}
                  >
                    Expenses
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search accounts..."
                    className="w-full pl-8"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingAccounts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No accounts found</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Last Transaction</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.accountId}>
                          <TableCell className="font-medium">{account.accountCode}</TableCell>
                          <TableCell>{account.accountName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.accountType}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(account.balance || 0)}</TableCell>
                          <TableCell>
                            {account.lastTransaction ? formatDate(account.lastTransaction) : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewAccount(account)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteAccountClick(account)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>View and manage financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={dateFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("")}
                  >
                    All
                  </Button>
                  <Button
                    variant={dateFilter === "thisMonth" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("thisMonth")}
                  >
                    This Month
                  </Button>
                  <Button
                    variant={dateFilter === "lastMonth" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("lastMonth")}
                  >
                    Last Month
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search transactions..."
                    className="w-full pl-8"
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit Account</TableHead>
                        <TableHead>Credit Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.transactionId}>
                          <TableCell className="font-medium">{transaction.transactionNumber}</TableCell>
                          <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.debitAccountCode} - {transaction.debitAccountName}
                          </TableCell>
                          <TableCell>
                            {transaction.creditAccountCode} - {transaction.creditAccountName}
                          </TableCell>
                          <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                          <TableCell>{transaction.referenceNumber || "-"}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTransaction(transaction)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTransactionClick(transaction)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Transaction
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddJournalEntryForm
        open={openAddJournalForm}
        onOpenChange={(open) => {
          setOpenAddJournalForm(open)
          if (!open) {
            handleJournalEntrySaved()
          }
        }}
        onSuccess={handleJournalEntrySaved}
      />

      {/* View Account Dialog */}
      <Dialog open={viewAccountOpen} onOpenChange={setViewAccountOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>View complete account information</DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Code</label>
                  <p className="text-sm font-medium">{selectedAccount.accountCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Name</label>
                  <p className="text-sm">{selectedAccount.accountName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                  <p className="text-sm">
                    <Badge variant="outline">{selectedAccount.accountType}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Balance</label>
                  <p className="text-sm font-medium">{formatCurrency(selectedAccount.balance || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Transaction</label>
                  <p className="text-sm">
                    {selectedAccount.lastTransaction ? formatDate(selectedAccount.lastTransaction) : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm">
                    <Badge variant={selectedAccount.isActive ? "default" : "secondary"}>
                      {selectedAccount.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={viewTransactionOpen} onOpenChange={setViewTransactionOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>View complete transaction information</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transaction Number</label>
                  <p className="text-sm font-medium">{selectedTransaction.transactionNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p className="text-sm">{formatDate(selectedTransaction.transactionDate)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{selectedTransaction.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Debit Account</label>
                  <p className="text-sm">
                    {selectedTransaction.debitAccountCode} - {selectedTransaction.debitAccountName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Credit Account</label>
                  <p className="text-sm">
                    {selectedTransaction.creditAccountCode} - {selectedTransaction.creditAccountName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-sm font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reference</label>
                  <p className="text-sm">{selectedTransaction.referenceNumber || "-"}</p>
                </div>
                {selectedTransaction.notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm whitespace-pre-wrap">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
              {deletingAccount && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-sm font-medium">{deletingAccount.accountCode} - {deletingAccount.accountName}</p>
                  <p className="text-xs text-muted-foreground">Type: {deletingAccount.accountType}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccountLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccountConfirm}
              disabled={deletingAccountLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccountLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={deleteTransactionOpen} onOpenChange={setDeleteTransactionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              {deletingTransaction && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-sm font-medium">{deletingTransaction.transactionNumber}</p>
                  <p className="text-xs text-muted-foreground">{deletingTransaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Amount: {formatCurrency(deletingTransaction.amount)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTransactionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransactionConfirm}
              disabled={deletingTransactionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTransactionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
