"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import { budgetApi, departmentApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
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
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useTheme } from "next-themes"
import { AddBudgetForm } from "@/components/add-budget-form"
import { format } from "date-fns"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"

export default function BudgetingPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null)
  const [selectedBudget, setSelectedBudget] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBudget, setDeletingBudget] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [openAddBudgetForm, setOpenAddBudgetForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadBudgets()
      loadStats()
      loadDepartments()
    }
  }, [isMounted, statusFilter, departmentFilter])

  const loadBudgets = async () => {
    try {
      setLoading(true)
      const data = await budgetApi.getAll(statusFilter || undefined, departmentFilter || undefined)
      setBudgets(data || [])
    } catch (error: any) {
      console.error("Error loading budgets:", error)
      toast({
        title: "Error loading budgets",
        description: error.message || "Failed to load budgets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await budgetApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await departmentApi.getAll()
      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error loading departments:", error)
    }
  }

  const handleView = async (budget: any) => {
    try {
      const details = await budgetApi.getById(budget.budgetId.toString())
      setSelectedBudget(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load budget details",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (budget: any) => {
    setEditingBudget(budget)
    setOpenAddBudgetForm(true)
  }

  const handleDeleteClick = (budget: any) => {
    setDeletingBudget(budget)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingBudget) return

    try {
      setDeleteLoading(true)
      await budgetApi.delete(deletingBudget.budgetId.toString())
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingBudget(null)
      loadBudgets()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBudgetSaved = () => {
    loadBudgets()
    loadStats()
    setEditingBudget(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "approved":
        return "secondary"
      case "draft":
        return "outline"
      case "closed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const filteredBudgets = budgets.filter((budget) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      budget.budgetCode?.toLowerCase().includes(query) ||
      budget.budgetName?.toLowerCase().includes(query) ||
      budget.departmentName?.toLowerCase().includes(query) ||
      budget.budgetPeriod?.toLowerCase().includes(query)
    )
  })

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  // Prepare data for chart (only active budgets)
  const budgetData = budgets
    .filter((b) => b.status === "active")
    .slice(0, 10)
    .map((budget) => ({
      name: budget.departmentName || budget.budgetName || "Unknown",
      Budget: parseFloat(budget.allocatedAmount),
      Spent: parseFloat(budget.spentAmount || 0),
      Remaining: parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0),
    }))

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgeting</h1>
          <p className="text-muted-foreground">Manage departmental budgets and expenses</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgeting</h1>
          <p className="text-muted-foreground">Manage departmental budgets and expenses</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (filteredBudgets.length === 0) return null
              return {
                filenamePrefix: "budgets",
                pdfTitle: "Budgets",
                pdfSubtitle: `Fiscal year ${new Date().getFullYear()}`,
                pdfLandscape: true,
                numberColumns: [4, 5, 6],
                headers: ["Code", "Name", "Department", "Period", "Allocated", "Spent", "Remaining", "Status"],
                rows: filteredBudgets.map((b) => [
                  b.budgetCode || "",
                  b.budgetName || "",
                  b.departmentName || "",
                  b.budgetPeriod || "",
                  parseFloat(String(b.allocatedAmount ?? 0)) || 0,
                  parseFloat(String(b.spentAmount ?? 0)) || 0,
                  parseFloat(String(b.allocatedAmount || 0)) - parseFloat(String(b.spentAmount || 0)),
                  b.status || "",
                ]),
              }
            }}
          />
          <Button onClick={() => {
            setEditingBudget(null)
            setOpenAddBudgetForm(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Overview - Fiscal Year {new Date().getFullYear()}</CardTitle>
          <CardDescription>Departmental budget allocation and utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
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
                  <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Remaining" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No active budgets to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departmental Budgets</CardTitle>
          <CardDescription>View and manage departmental budgets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                Draft
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === "closed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("closed")}
              >
                Closed
              </Button>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search budgets..."
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
                  <TableHead>Budget Code</TableHead>
                  <TableHead>Budget Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading budgets...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredBudgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No budgets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBudgets.map((budget) => (
                    <TableRow key={budget.budgetId}>
                      <TableCell className="font-medium">{budget.budgetCode || "-"}</TableCell>
                      <TableCell>{budget.budgetName || "-"}</TableCell>
                      <TableCell>{budget.departmentName || "-"}</TableCell>
                      <TableCell>{budget.budgetPeriod || "-"}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(budget.allocatedAmount))}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(budget.spentAmount || 0))}</TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(budget.allocatedAmount) - parseFloat(budget.spentAmount || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(budget.status)}>
                          {budget.status?.charAt(0).toUpperCase() + budget.status?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(budget)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(budget)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {budget.status === "draft" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(budget)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedBudget && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Budget Details</DialogTitle>
              <DialogDescription>View complete budget information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Code</p>
                  <p className="text-sm font-semibold">{selectedBudget.budgetCode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Name</p>
                  <p className="text-sm font-semibold">{selectedBudget.budgetName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-sm font-semibold">{selectedBudget.departmentName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Period</p>
                  <p className="text-sm font-semibold">{selectedBudget.budgetPeriod || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-sm">{formatDate(selectedBudget.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-sm">{formatDate(selectedBudget.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Allocated Amount</p>
                  <p className="text-sm font-semibold">{formatCurrency(parseFloat(selectedBudget.allocatedAmount))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Spent Amount</p>
                  <p className="text-sm font-semibold">{formatCurrency(parseFloat(selectedBudget.spentAmount || 0))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remaining Amount</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(parseFloat(selectedBudget.allocatedAmount) - parseFloat(selectedBudget.spentAmount || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(selectedBudget.status)}>
                    {selectedBudget.status?.charAt(0).toUpperCase() + selectedBudget.status?.slice(1)}
                  </Badge>
                </div>
              </div>
              {selectedBudget.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedBudget.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action can only be performed on draft budgets and cannot be undone.
              {deletingBudget && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Budget: {deletingBudget.budgetCode}</p>
                  <p className="text-sm">{deletingBudget.budgetName}</p>
                  <p className="text-sm">Department: {deletingBudget.departmentName}</p>
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

      <AddBudgetForm
        open={openAddBudgetForm}
        onOpenChange={(open) => {
          setOpenAddBudgetForm(open)
          if (!open) {
            setEditingBudget(null)
          }
        }}
        onSuccess={handleBudgetSaved}
        editData={editingBudget}
      />
    </div>
  )
}
