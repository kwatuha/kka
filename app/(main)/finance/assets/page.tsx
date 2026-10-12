"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Loader2, MoreVertical, Eye, Edit, Trash2, ClipboardCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { assetApi } from "@/lib/api"
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
import { AddAssetForm } from "@/components/add-asset-form"
import { CriticalAssetsDailyLog } from "@/components/critical-assets-daily-log"
import { AssetQRLabels } from "@/components/asset-qr-labels"
import { MaintenanceRecordsList } from "@/components/maintenance-records-list"
import { AssetAssignmentsList } from "@/components/asset-assignments-list"
import { format } from "date-fns"

export default function FixedAssetsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [openAddAssetForm, setOpenAddAssetForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingAsset, setDeletingAsset] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [criticalAssets, setCriticalAssets] = useState<any[]>([])
  const [criticalStats, setCriticalStats] = useState<any>(null)
  const [criticalLoading, setCriticalLoading] = useState(false)
  const [dailyLogOpen, setDailyLogOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadAssets()
      loadStats()
      loadCriticalAssets()
      loadCriticalStats()
    }
  }, [isMounted, statusFilter, categoryFilter])

  const loadCriticalAssets = async () => {
    try {
      setCriticalLoading(true)
      const data = await assetApi.getCriticalAssets()
      setCriticalAssets(data || [])
    } catch (error: any) {
      console.error("Error loading critical assets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load critical assets",
        variant: "destructive",
      })
    } finally {
      setCriticalLoading(false)
    }
  }

  const loadCriticalStats = async () => {
    try {
      const data = await assetApi.getCriticalStats()
      setCriticalStats(data)
    } catch (error: any) {
      console.error("Error loading critical stats:", error)
      // Don't show toast for stats errors as they're not critical
    }
  }

  const loadAssets = async () => {
    try {
      setLoading(true)
      const data = await assetApi.getAll(statusFilter || undefined, categoryFilter || undefined)
      setAssets(data || [])
    } catch (error: any) {
      console.error("Error loading assets:", error)
      toast({
        title: "Error loading assets",
        description: error.message || "Failed to load assets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const data = await assetApi.getStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleView = async (asset: any) => {
    try {
      const details = await assetApi.getById(asset.assetId.toString())
      setSelectedAsset(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load asset details",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (asset: any) => {
    setEditingAsset(asset)
    setOpenAddAssetForm(true)
  }

  const handleDeleteClick = (asset: any) => {
    setDeletingAsset(asset)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingAsset) return

    try {
      setDeleteLoading(true)
      await assetApi.delete(deletingAsset.assetId.toString())
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingAsset(null)
      loadAssets()
      loadStats()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleAssetSaved = () => {
    loadAssets()
    loadStats()
    setEditingAsset(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "maintenance":
        return "secondary"
      case "disposed":
        return "destructive"
      case "retired":
        return "outline"
      default:
        return "outline"
    }
  }

  const filteredAssets = assets.filter((asset) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      asset.assetName?.toLowerCase().includes(query) ||
      asset.assetCode?.toLowerCase().includes(query) ||
      asset.serialNumber?.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query) ||
      asset.manufacturer?.toLowerCase().includes(query)
    )
  })

  // Prepare data for chart
  const assetCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    assets.forEach((asset) => {
      const category = asset.category || "Other"
      const currentValue = parseFloat(asset.currentValue || asset.purchaseCost || 0)
      categoryMap.set(category, (categoryMap.get(category) || 0) + currentValue)
    })
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }, [assets])

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fixed Assets</h1>
          <p className="text-muted-foreground">Manage hospital fixed assets and maintenance</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Fixed Assets</h1>
          <p className="text-muted-foreground">Manage hospital fixed assets and maintenance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDailyLogOpen(true)}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Daily Verification
          </Button>
          <FinanceExportMenu
            getPayload={() => {
              if (filteredAssets.length === 0) return null
              return {
                filenamePrefix: "fixed-assets",
                pdfTitle: "Fixed Assets",
                pdfSubtitle: "Asset register",
                pdfLandscape: true,
                numberColumns: [4, 5],
                headers: ["Asset Code", "Name", "Category", "Location", "Purchase Cost", "Current Value", "Status", "Critical"],
                rows: filteredAssets.map((a) => [
                  a.assetCode || "",
                  a.assetName || "",
                  a.category || "",
                  a.location || "",
                  parseFloat(String(a.purchaseCost ?? 0)) || 0,
                  parseFloat(String(a.currentValue ?? a.purchaseCost ?? 0)) || 0,
                  a.status || "",
                  a.isCritical ? "Yes" : "No",
                ]),
              }
            }}
          />
          <Button
            onClick={() => {
              setEditingAsset(null)
              setOpenAddAssetForm(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.totalCurrentValue || stats?.totalPurchaseCost || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Current book value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCount || 0} active, {stats?.maintenanceCount || 0} in maintenance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Purchase Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.totalPurchaseCost || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Original purchase value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Depreciation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(parseFloat(stats?.totalDepreciation || 0))
              )}
            </div>
            <p className="text-xs text-muted-foreground">Accumulated depreciation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
            <CardDescription>Distribution of assets by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {assetCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {assetCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No asset data to display</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Asset Status Summary</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active</span>
                <Badge>{stats?.activeCount || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Maintenance</span>
                <Badge variant="secondary">{stats?.maintenanceCount || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Disposed</span>
                <Badge variant="destructive">{stats?.disposedCount || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Retired</span>
                <Badge variant="outline">{stats?.retiredCount || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assets" className="w-full" onValueChange={(value) => {
        if (value === "critical") {
          loadCriticalAssets()
          loadCriticalStats()
        }
      }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="critical">Critical Assets</TabsTrigger>
          <TabsTrigger value="labels">Asset Labels</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Asset Registry</CardTitle>
                  <CardDescription>View and manage fixed assets</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingAsset(null)
                    setOpenAddAssetForm(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Asset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={categoryFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(null)}
                  >
                    All Categories
                  </Button>
                  <Button
                    variant={categoryFilter === "Equipment" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("Equipment")}
                  >
                    Equipment
                  </Button>
                  <Button
                    variant={categoryFilter === "Furniture" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("Furniture")}
                  >
                    Furniture
                  </Button>
                  <Button
                    variant={categoryFilter === "Vehicle" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("Vehicle")}
                  >
                    Vehicles
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search assets..."
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
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Purchase Value</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading assets...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No assets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.map((asset) => (
                        <TableRow key={asset.assetId}>
                          <TableCell className="font-medium">{asset.assetCode || "-"}</TableCell>
                          <TableCell>{asset.assetName || "-"}</TableCell>
                          <TableCell>{asset.category || "-"}</TableCell>
                          <TableCell>{asset.location || "-"}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(asset.purchaseCost || 0))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(asset.currentValue || asset.purchaseCost || 0))}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusBadge(asset.status)}>
                                {asset.status?.charAt(0).toUpperCase() + asset.status?.slice(1)}
                              </Badge>
                              {asset.isCritical && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(asset)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(asset)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteClick(asset)} className="text-destructive">
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

        <TabsContent value="critical" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Critical Assets Registry</CardTitle>
                  <CardDescription>Assets requiring daily presence verification</CardDescription>
                </div>
                <Button onClick={() => setDailyLogOpen(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Daily Verification
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {criticalStats && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Critical</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{criticalStats.today?.totalCritical || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Verified Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{criticalStats.today?.verified || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Missing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{criticalStats.today?.missing || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">{criticalStats.today?.pending || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Today's Verification</TableHead>
                      <TableHead>Verified By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading critical assets...</p>
                        </TableCell>
                      </TableRow>
                    ) : criticalAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No critical assets registered. Mark assets as critical when creating or editing them.
                        </TableCell>
                      </TableRow>
                    ) : (
                      criticalAssets.map((asset) => (
                        <TableRow key={asset.assetId}>
                          <TableCell className="font-medium">{asset.assetCode || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {asset.assetName || "-"}
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            </div>
                          </TableCell>
                          <TableCell>{asset.category || "-"}</TableCell>
                          <TableCell>{asset.location || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(asset.status)}>
                              {asset.status?.charAt(0).toUpperCase() + asset.status?.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {asset.verifiedToday === null ? (
                              <Badge variant="outline" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Pending
                              </Badge>
                            ) : asset.verifiedToday ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Missing
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {asset.verifiedByFirstName && asset.verifiedByLastName ? (
                              <div className="text-sm">
                                {asset.verifiedByFirstName} {asset.verifiedByLastName}
                                {asset.verifiedAt && (
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(asset.verifiedAt), "HH:mm")}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(asset)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(asset)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
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

        <TabsContent value="labels" className="space-y-4 mt-4">
          <AssetQRLabels />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-4">
          <MaintenanceRecordsList />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4 mt-4">
          <AssetAssignmentsList />
        </TabsContent>
      </Tabs>

      {selectedAsset && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Asset Details</DialogTitle>
              <DialogDescription>View complete asset information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset Code</p>
                  <p className="text-sm font-semibold">{selectedAsset.assetCode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset Name</p>
                  <p className="text-sm font-semibold">{selectedAsset.assetName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="text-sm">{selectedAsset.category || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Asset Type</p>
                  <p className="text-sm">{selectedAsset.assetType || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-sm">{selectedAsset.location || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(selectedAsset.status)}>
                    {selectedAsset.status?.charAt(0).toUpperCase() + selectedAsset.status?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Date</p>
                  <p className="text-sm">{formatDate(selectedAsset.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purchase Cost</p>
                  <p className="text-sm font-semibold">{formatCurrency(parseFloat(selectedAsset.purchaseCost || 0))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Value</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(parseFloat(selectedAsset.currentValue || selectedAsset.purchaseCost || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Depreciation</p>
                  <p className="text-sm">{formatCurrency(parseFloat(selectedAsset.accumulatedDepreciation || 0))}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Depreciation Method</p>
                  <p className="text-sm">{selectedAsset.depreciationMethod || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Depreciation Rate</p>
                  <p className="text-sm">{selectedAsset.depreciationRate ? `${selectedAsset.depreciationRate}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                  <p className="text-sm">{selectedAsset.serialNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Manufacturer</p>
                  <p className="text-sm">{selectedAsset.manufacturer || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Model</p>
                  <p className="text-sm">{selectedAsset.model || "—"}</p>
                </div>
              </div>
              {selectedAsset.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
              {deletingAsset && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Asset: {deletingAsset.assetCode}</p>
                  <p className="text-sm">{deletingAsset.assetName}</p>
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

      <AddAssetForm
        open={openAddAssetForm}
        onOpenChange={(open: boolean) => {
          setOpenAddAssetForm(open)
          if (!open) {
            setEditingAsset(null)
          }
        }}
        onSuccess={() => {
          handleAssetSaved()
          loadCriticalAssets()
          loadCriticalStats()
        }}
        editData={editingAsset}
      />

      <CriticalAssetsDailyLog
        open={dailyLogOpen}
        onOpenChange={(open) => {
          setDailyLogOpen(open)
          if (!open) {
            loadCriticalAssets()
            loadCriticalStats()
          }
        }}
      />
    </div>
  )
}
