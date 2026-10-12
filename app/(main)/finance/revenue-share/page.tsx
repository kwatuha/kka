"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, Edit, Trash2 } from "lucide-react"
import { revenueShareApi, departmentApi } from "@/lib/api"
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
import { AddRevenueShareRuleForm } from "@/components/add-revenue-share-rule-form"
import { format } from "date-fns"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"

export default function RevenueSharePage() {
  const [isMounted, setIsMounted] = useState(false)
  const [rules, setRules] = useState<any[]>([])
  const [distributions, setDistributions] = useState<any[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [distributionsLoading, setDistributionsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [rulesStatusFilter, setRulesStatusFilter] = useState<string | null>(null)
  const [distributionsStatusFilter, setDistributionsStatusFilter] = useState<string | null>(null)
  const [selectedRule, setSelectedRule] = useState<any>(null)
  const [selectedDistribution, setSelectedDistribution] = useState<any>(null)
  const [viewRuleDialogOpen, setViewRuleDialogOpen] = useState(false)
  const [viewDistributionDialogOpen, setViewDistributionDialogOpen] = useState(false)
  const [deleteRuleDialogOpen, setDeleteRuleDialogOpen] = useState(false)
  const [deleteDistributionDialogOpen, setDeleteDistributionDialogOpen] = useState(false)
  const [deletingRule, setDeletingRule] = useState<any>(null)
  const [deletingDistribution, setDeletingDistribution] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [openAddRuleForm, setOpenAddRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [revenueTab, setRevenueTab] = useState("rules")

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadRules()
      loadDistributions()
      loadStats()
    }
  }, [isMounted, rulesStatusFilter, distributionsStatusFilter])

  const loadRules = async () => {
    try {
      setRulesLoading(true)
      const status = rulesStatusFilter === "active" ? "active" : rulesStatusFilter === "inactive" ? "inactive" : undefined
      const data = await revenueShareApi.getRules(undefined, undefined, status)
      setRules(data || [])
    } catch (error: any) {
      console.error("Error loading rules:", error)
      toast({
        title: "Error loading rules",
        description: error.message || "Failed to load revenue share rules",
        variant: "destructive",
      })
    } finally {
      setRulesLoading(false)
    }
  }

  const loadDistributions = async () => {
    try {
      setDistributionsLoading(true)
      const data = await revenueShareApi.getDistributions(distributionsStatusFilter || undefined)
      setDistributions(data || [])
    } catch (error: any) {
      console.error("Error loading distributions:", error)
      toast({
        title: "Error loading distributions",
        description: error.message || "Failed to load revenue share distributions",
        variant: "destructive",
      })
    } finally {
      setDistributionsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await revenueShareApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleViewRule = async (rule: any) => {
    try {
      const details = await revenueShareApi.getRuleById(rule.ruleId.toString())
      setSelectedRule(details)
      setViewRuleDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load rule details",
        variant: "destructive",
      })
    }
  }

  const handleViewDistribution = async (distribution: any) => {
    try {
      const details = await revenueShareApi.getDistributionById(distribution.distributionId.toString())
      setSelectedDistribution(details)
      setViewDistributionDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load distribution details",
        variant: "destructive",
      })
    }
  }

  const handleEditRule = (rule: any) => {
    setEditingRule(rule)
    setOpenAddRuleForm(true)
  }

  const handleDeleteRuleClick = (rule: any) => {
    setDeletingRule(rule)
    setDeleteRuleDialogOpen(true)
  }

  const handleDeleteRuleConfirm = async () => {
    if (!deletingRule) return

    try {
      setDeleteLoading(true)
      await revenueShareApi.deleteRule(deletingRule.ruleId.toString())
      toast({
        title: "Success",
        description: "Revenue share rule deleted successfully",
      })
      setDeleteRuleDialogOpen(false)
      setDeletingRule(null)
      loadRules()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteDistributionClick = (distribution: any) => {
    setDeletingDistribution(distribution)
    setDeleteDistributionDialogOpen(true)
  }

  const handleDeleteDistributionConfirm = async () => {
    if (!deletingDistribution) return

    try {
      setDeleteLoading(true)
      await revenueShareApi.deleteDistribution(deletingDistribution.distributionId.toString())
      toast({
        title: "Success",
        description: "Revenue share distribution deleted successfully",
      })
      setDeleteDistributionDialogOpen(false)
      setDeletingDistribution(null)
      loadDistributions()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete distribution",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRuleSaved = () => {
    loadRules()
    loadStats()
    setEditingRule(null)
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(num)
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "distributed":
        return "default"
      case "approved":
        return "secondary"
      case "pending":
        return "outline"
      case "draft":
        return "outline"
      default:
        return "outline"
    }
  }

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return rule.ruleName?.toLowerCase().includes(query) || rule.description?.toLowerCase().includes(query)
  })

  const filteredDistributions = distributions.filter((distribution) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return distribution.distributionNumber?.toLowerCase().includes(query) || distribution.notes?.toLowerCase().includes(query)
  })

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Share</h1>
          <p className="text-muted-foreground">Manage revenue allocation rules and distributions</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Revenue Share</h1>
          <p className="text-muted-foreground">Manage revenue allocation rules and distributions</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (revenueTab === "distributions") {
                if (filteredDistributions.length === 0) return null
                return {
                  filenamePrefix: "revenue-share-distributions",
                  pdfTitle: "Revenue Share Distributions",
                  pdfSubtitle: "Allocation runs",
                  pdfLandscape: true,
                  numberColumns: [4, 5],
                  headers: ["Distribution #", "Date", "Period Start", "Period End", "Total Revenue", "Total Distributed", "Status"],
                  rows: filteredDistributions.map((d) => [
                    d.distributionNumber || "",
                    d.distributionDate ? format(new Date(d.distributionDate), "yyyy-MM-dd") : "",
                    d.periodStart ? format(new Date(d.periodStart), "yyyy-MM-dd") : "",
                    d.periodEnd ? format(new Date(d.periodEnd), "yyyy-MM-dd") : "",
                    parseFloat(String(d.totalRevenue ?? 0)) || 0,
                    parseFloat(String(d.totalDistributed ?? 0)) || 0,
                    d.status || "",
                  ]),
                }
              }
              if (filteredRules.length === 0) return null
              return {
                filenamePrefix: "revenue-share-rules",
                pdfTitle: "Revenue Share Rules",
                pdfSubtitle: "Allocation rules",
                numberColumns: [3],
                headers: ["Rule Name", "Type", "Department", "Allocation %", "Effective From", "Effective To", "Active"],
                rows: filteredRules.map((r) => [
                  r.ruleName || "",
                  r.ruleType || "",
                  r.departmentName || "",
                  parseFloat(String(r.allocationPercentage ?? 0)) || 0,
                  r.effectiveFrom ? format(new Date(r.effectiveFrom), "yyyy-MM-dd") : "",
                  r.effectiveTo ? format(new Date(r.effectiveTo), "yyyy-MM-dd") : "",
                  r.isActive ? "Yes" : "No",
                ]),
              }
            }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.activeRules || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active allocation rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.draftDistributions || 0}</div>
            <p className="text-xs text-muted-foreground">Distributions in draft status</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "..." : stats?.approvedDistributions || 0}</div>
            <p className="text-xs text-muted-foreground">Approved but not distributed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatCurrency(parseFloat(stats?.totalRevenue || 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total revenue distributed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={revenueTab} onValueChange={setRevenueTab} className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Revenue Share Rules</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Share Rules</CardTitle>
                  <CardDescription>Define how revenue is allocated to departments or categories</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRule(null)
                    setOpenAddRuleForm(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={rulesStatusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRulesStatusFilter(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={rulesStatusFilter === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRulesStatusFilter("active")}
                  >
                    Active
                  </Button>
                  <Button
                    variant={rulesStatusFilter === "inactive" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRulesStatusFilter("inactive")}
                  >
                    Inactive
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search rules..."
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
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading rules...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No rules found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRules.map((rule) => (
                        <TableRow key={rule.ruleId}>
                          <TableCell className="font-medium">{rule.ruleName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rule.ruleType}</Badge>
                          </TableCell>
                          <TableCell>{rule.departmentName || "-"}</TableCell>
                          <TableCell>{rule.allocationPercentage}%</TableCell>
                          <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                          <TableCell>{rule.effectiveTo ? formatDate(rule.effectiveTo) : "Ongoing"}</TableCell>
                          <TableCell>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Active" : "Inactive"}
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
                                <DropdownMenuItem onClick={() => handleViewRule(rule)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditRule(rule)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteRuleClick(rule)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
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
        </TabsContent>

        <TabsContent value="distributions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Share Distributions</CardTitle>
              <CardDescription>View and manage revenue share distributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={distributionsStatusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDistributionsStatusFilter(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={distributionsStatusFilter === "draft" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDistributionsStatusFilter("draft")}
                  >
                    Draft
                  </Button>
                  <Button
                    variant={distributionsStatusFilter === "approved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDistributionsStatusFilter("approved")}
                  >
                    Approved
                  </Button>
                  <Button
                    variant={distributionsStatusFilter === "distributed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDistributionsStatusFilter("distributed")}
                  >
                    Distributed
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search distributions..."
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
                      <TableHead>Distribution Number</TableHead>
                      <TableHead>Distribution Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Total Distributed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading distributions...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredDistributions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No distributions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDistributions.map((distribution) => (
                        <TableRow key={distribution.distributionId}>
                          <TableCell className="font-medium">{distribution.distributionNumber}</TableCell>
                          <TableCell>{formatDate(distribution.distributionDate)}</TableCell>
                          <TableCell>
                            {formatDate(distribution.periodStart)} - {formatDate(distribution.periodEnd)}
                          </TableCell>
                          <TableCell>{formatCurrency(distribution.totalRevenue)}</TableCell>
                          <TableCell>{formatCurrency(distribution.totalDistributed)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(distribution.status)}>
                              {distribution.status?.charAt(0).toUpperCase() + distribution.status?.slice(1)}
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
                                <DropdownMenuItem onClick={() => handleViewDistribution(distribution)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {distribution.status === "draft" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteDistributionClick(distribution)}
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
        </TabsContent>
      </Tabs>

      {/* View Rule Dialog */}
      {selectedRule && (
        <Dialog open={viewRuleDialogOpen} onOpenChange={setViewRuleDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Revenue Share Rule Details</DialogTitle>
              <DialogDescription>View complete rule information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rule Name</p>
                  <p className="text-sm font-semibold">{selectedRule.ruleName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rule Type</p>
                  <p className="text-sm font-semibold">{selectedRule.ruleType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-sm font-semibold">{selectedRule.departmentName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Allocation Percentage</p>
                  <p className="text-sm font-semibold">{selectedRule.allocationPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Effective From</p>
                  <p className="text-sm">{formatDate(selectedRule.effectiveFrom)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Effective To</p>
                  <p className="text-sm">{selectedRule.effectiveTo ? formatDate(selectedRule.effectiveTo) : "Ongoing"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedRule.isActive ? "default" : "secondary"}>
                    {selectedRule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {selectedRule.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedRule.description}</p>
                </div>
              )}
              {selectedRule.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedRule.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Distribution Dialog */}
      {selectedDistribution && (
        <Dialog open={viewDistributionDialogOpen} onOpenChange={setViewDistributionDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Revenue Share Distribution Details</DialogTitle>
              <DialogDescription>View complete distribution information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Distribution Number</p>
                  <p className="text-sm font-semibold">{selectedDistribution.distributionNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Distribution Date</p>
                  <p className="text-sm">{formatDate(selectedDistribution.distributionDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Period Start</p>
                  <p className="text-sm">{formatDate(selectedDistribution.periodStart)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Period End</p>
                  <p className="text-sm">{formatDate(selectedDistribution.periodEnd)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-sm font-semibold">{formatCurrency(selectedDistribution.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Distributed</p>
                  <p className="text-sm font-semibold">{formatCurrency(selectedDistribution.totalDistributed)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(selectedDistribution.status)}>
                    {selectedDistribution.status?.charAt(0).toUpperCase() + selectedDistribution.status?.slice(1)}
                  </Badge>
                </div>
              </div>
              {selectedDistribution.items && selectedDistribution.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Distribution Items</p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Revenue Amount</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Distributed Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDistribution.items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{item.departmentName || "-"}</TableCell>
                            <TableCell>{formatCurrency(item.revenueAmount)}</TableCell>
                            <TableCell>{item.allocationPercentage}%</TableCell>
                            <TableCell>{formatCurrency(item.distributedAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {selectedDistribution.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedDistribution.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Rule Dialog */}
      <AlertDialog open={deleteRuleDialogOpen} onOpenChange={setDeleteRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Share Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this revenue share rule? This action cannot be undone.
              {deletingRule && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Rule: {deletingRule.ruleName}</p>
                  <p className="text-sm">Type: {deletingRule.ruleType}</p>
                  <p className="text-sm">Percentage: {deletingRule.allocationPercentage}%</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRuleConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Distribution Dialog */}
      <AlertDialog open={deleteDistributionDialogOpen} onOpenChange={setDeleteDistributionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Share Distribution?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this revenue share distribution? This action can only be performed on draft
              distributions and cannot be undone.
              {deletingDistribution && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Distribution: {deletingDistribution.distributionNumber}</p>
                  <p className="text-sm">Total Revenue: {formatCurrency(deletingDistribution.totalRevenue)}</p>
                  <p className="text-sm">Status: {deletingDistribution.status}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDistributionConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddRevenueShareRuleForm
        open={openAddRuleForm}
        onOpenChange={(open) => {
          setOpenAddRuleForm(open)
          if (!open) {
            setEditingRule(null)
          }
        }}
        onSuccess={handleRuleSaved}
        editData={editingRule}
      />
    </div>
  )
}
