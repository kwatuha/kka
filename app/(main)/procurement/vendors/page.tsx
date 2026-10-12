"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { vendorApi, purchaseOrderApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Loader2, Trash2, MoreVertical } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AddVendorForm } from "@/components/add-vendor-form"
import {
  PlusCircle,
  Search,
  Eye,
  FileEdit,
  Download,
  Filter,
  Star,
  StarHalf,
  Calendar,
  FileText,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Interface for vendor
interface Vendor {
  vendorId: number
  vendorCode: string
  vendorName: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  category?: string
  status: string
  rating?: number
  paymentTerms?: string
  totalOrders?: number
  lastOrderDate?: string
  totalSpent?: number
}

// Legacy sample data (kept for contracts/performance tabs that may not have API yet)
const legacyVendors = [
  {
    id: "V001",
    name: "MediSupply Co.",
    contact: "John Smith",
    email: "john@medisupply.com",
    phone: "+254 712 345 678",
    category: "Medical Supplies",
    status: "Active",
    rating: 4.8,
    lastOrder: "2023-05-15",
    totalSpent: "KES 2,450,000",
    contractStatus: "Current",
    paymentTerms: "Net 30",
    onboardingDate: "2020-05-15",
  },
  {
    id: "V002",
    name: "PharmaTech Ltd",
    contact: "Jane Doe",
    email: "jane@pharmatech.com",
    phone: "+254 723 456 789",
    category: "Pharmaceuticals",
    status: "Active",
    rating: 4.5,
    lastOrder: "2023-05-20",
    totalSpent: "KES 1,850,000",
    contractStatus: "Current",
    paymentTerms: "Net 45",
    onboardingDate: "2019-08-20",
  },
  {
    id: "V003",
    name: "CleanPro Services",
    contact: "Michael Johnson",
    email: "michael@cleanpro.com",
    phone: "+254 734 567 890",
    category: "Cleaning Supplies",
    status: "Inactive",
    rating: 3.9,
    lastOrder: "2023-04-20",
    totalSpent: "KES 780,000",
    contractStatus: "Expired",
    paymentTerms: "Net 15",
    onboardingDate: "2021-02-10",
  },
  {
    id: "V004",
    name: "FoodWorks Catering",
    contact: "Sarah Williams",
    email: "sarah@foodworks.com",
    phone: "+254 745 678 901",
    category: "Food Services",
    status: "Active",
    rating: 4.2,
    lastOrder: "2023-05-25",
    totalSpent: "KES 1,250,000",
    contractStatus: "Current",
    paymentTerms: "Net 30",
    onboardingDate: "2020-11-05",
  },
  {
    id: "V005",
    name: "TechSolutions Inc.",
    contact: "David Brown",
    email: "david@techsolutions.com",
    phone: "+254 756 789 012",
    category: "IT Equipment",
    status: "Active",
    rating: 4.7,
    lastOrder: "2023-05-18",
    totalSpent: "KES 3,150,000",
    contractStatus: "Current",
    paymentTerms: "Net 30",
    onboardingDate: "2019-06-15",
  },
  {
    id: "V006",
    name: "MedEquip Solutions",
    contact: "Robert Chen",
    email: "robert@medequip.com",
    phone: "+254 767 890 123",
    category: "Medical Equipment",
    status: "Active",
    rating: 4.6,
    lastOrder: "2023-05-10",
    totalSpent: "KES 4,250,000",
    contractStatus: "Current",
    paymentTerms: "Net 60",
    onboardingDate: "2018-09-20",
  },
  {
    id: "V007",
    name: "LabSupplies Kenya",
    contact: "Elizabeth Njeri",
    email: "elizabeth@labsupplies.co.ke",
    phone: "+254 778 901 234",
    category: "Laboratory Supplies",
    status: "Active",
    rating: 4.4,
    lastOrder: "2023-05-05",
    totalSpent: "KES 2,850,000",
    contractStatus: "Current",
    paymentTerms: "Net 30",
    onboardingDate: "2019-11-15",
  },
  {
    id: "V008",
    name: "Office Solutions Ltd",
    contact: "James Omondi",
    email: "james@officesolutions.co.ke",
    phone: "+254 789 012 345",
    category: "Office Supplies",
    status: "Inactive",
    rating: 3.7,
    lastOrder: "2023-03-15",
    totalSpent: "KES 950,000",
    contractStatus: "Expired",
    paymentTerms: "Net 15",
    onboardingDate: "2020-08-10",
  },
]

// Legacy sample data for purchase orders (kept as fallback, but now using API)
// const purchaseOrders = [
//   {
//     id: "PO001",
//     vendor: "MediSupply Co.",
//     date: "2023-05-15",
//     amount: "KES 250,000",
//     status: "Delivered",
//   },
//   ...
// ]

// Legacy sample data for vendor performance (kept as fallback, but now using API)
// const vendorPerformance = [
//   { name: "MediSupply Co.", onTimeDelivery: 95, qualityScore: 98, responseTime: 4.8, costSavings: 12 },
//   { name: "PharmaTech Ltd", onTimeDelivery: 92, qualityScore: 95, responseTime: 4.5, costSavings: 8 },
//   { name: "CleanPro Services", onTimeDelivery: 85, qualityScore: 88, responseTime: 3.9, costSavings: 5 },
//   { name: "FoodWorks Catering", onTimeDelivery: 90, qualityScore: 92, responseTime: 4.2, costSavings: 7 },
//   { name: "TechSolutions Inc.", onTimeDelivery: 94, qualityScore: 96, responseTime: 4.7, costSavings: 15 },
// ]

// Legacy sample data for vendor contracts (kept as fallback, but now using API)
// const vendorContracts = [
//   {
//     id: "C001",
//     vendor: "MediSupply Co.",
//     startDate: "2022-06-01",
//     endDate: "2024-05-31",
//     status: "Active",
//     value: "KES 5,000,000",
//     type: "Annual Supply",
//     renewalOption: "Yes",
//   },
//   ...
// ]

export default function VendorsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name-asc")
  const router = useRouter()

  // Edit/Delete states
  const [editVendorOpen, setEditVendorOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deleteVendorOpen, setDeleteVendorOpen] = useState(false)
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null)
  const [deletingVendorLoading, setDeletingVendorLoading] = useState(false)
  
  // Performance data state
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([])
  const [performanceLoading, setPerformanceLoading] = useState(false)
  
  // Contracts data state
  const [vendorContracts, setVendorContracts] = useState<any[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  
  // Purchase Orders data state
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const loadVendors = useCallback(async (search?: string, status?: string, category?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await vendorApi.getAll(
        search || undefined,
        status !== "all" ? status : undefined,
        category !== "all" ? category : undefined
      )
      // Transform API response to ensure numeric fields are numbers
      const transformedData = (data || []).map((vendor: any) => ({
        ...vendor,
        rating: vendor.rating ? parseFloat(vendor.rating) : 0,
        totalSpent: vendor.totalSpent ? parseFloat(vendor.totalSpent) : 0,
        totalOrders: vendor.totalOrders ? parseInt(vendor.totalOrders) : 0,
      }))
      setVendors(transformedData)
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors')
      console.error('Error loading vendors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVendors(undefined, statusFilter, categoryFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadVendors(searchTerm, statusFilter, categoryFilter)
    }, 500)
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, categoryFilter])

  // Load performance data
  const loadPerformance = useCallback(async () => {
    try {
      setPerformanceLoading(true)
      const data = await vendorApi.getPerformance()
      setVendorPerformance(data || [])
    } catch (err: any) {
      console.error('Error loading vendor performance:', err)
      // Set empty array on error to avoid breaking the UI
      setVendorPerformance([])
    } finally {
      setPerformanceLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPerformance()
  }, [loadPerformance])

  // Load contracts data
  const loadContracts = useCallback(async () => {
    try {
      setContractsLoading(true)
      const data = await vendorApi.getAllContracts()
      // Transform API response to match frontend expectations
      const transformedData = (data || []).map((contract: any) => ({
        id: contract.contractNumber || contract.contractId?.toString(),
        vendorId: contract.vendorId,
        vendor: contract.vendorName || "Unknown Vendor",
        vendorCode: contract.vendorCode,
        type: contract.contractType || "Standard",
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : "",
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
        value: contract.contractValue ? `KES ${parseFloat(contract.contractValue).toLocaleString()}` : "KES 0",
        status: contract.status?.charAt(0).toUpperCase() + contract.status?.slice(1) || "Draft",
        renewalOption: contract.renewalOption ? "Yes" : "No",
        contractId: contract.contractId
      }))
      setVendorContracts(transformedData)
    } catch (err: any) {
      console.error('Error loading vendor contracts:', err)
      // Set empty array on error to avoid breaking the UI
      setVendorContracts([])
    } finally {
      setContractsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  // Load purchase orders data
  const loadPurchaseOrders = useCallback(async () => {
    try {
      setOrdersLoading(true)
      const data = await purchaseOrderApi.getAll()
      // Transform API response to match frontend expectations
      const transformedData = (data || []).map((order: any) => ({
        id: order.poNumber || order.purchaseOrderId?.toString(),
        vendorId: order.vendorId,
        vendor: order.vendorName || "Unknown Vendor",
        vendorCode: order.vendorCode,
        date: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        amount: order.totalAmount ? `KES ${parseFloat(order.totalAmount).toLocaleString()}` : "KES 0",
        status: order.status?.charAt(0).toUpperCase() + order.status?.slice(1).replace('_', ' ') || "Draft",
        purchaseOrderId: order.purchaseOrderId
      }))
      setPurchaseOrders(transformedData)
    } catch (err: any) {
      console.error('Error loading purchase orders:', err)
      // Set empty array on error to avoid breaking the UI
      setPurchaseOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

  const viewVendorDetails = (vendorId: string | number) => {
    router.push(`/procurement/vendors/${vendorId}`)
  }

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setEditVendorOpen(true)
  }

  const handleDeleteVendorClick = (vendor: Vendor) => {
    setDeletingVendor(vendor)
    setDeleteVendorOpen(true)
  }

  const handleDeleteVendorConfirm = async () => {
    if (!deletingVendor) return

    try {
      setDeletingVendorLoading(true)
      await vendorApi.delete(deletingVendor.vendorId.toString())
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      })
      setDeleteVendorOpen(false)
      setDeletingVendor(null)
      loadVendors()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete vendor",
        variant: "destructive",
      })
    } finally {
      setDeletingVendorLoading(false)
    }
  }

  const handleVendorSaved = () => {
    loadVendors()
    setEditVendorOpen(false)
    setEditingVendor(null)
  }

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

  // Filter vendors based on search term (client-side filtering for search)
  const filteredVendors = vendors.filter((vendor) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        vendor.vendorName?.toLowerCase().includes(searchLower) ||
        vendor.vendorCode?.toLowerCase().includes(searchLower) ||
        vendor.contactPerson?.toLowerCase().includes(searchLower) ||
        vendor.email?.toLowerCase().includes(searchLower) ||
        vendor.phone?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Sort vendors based on selected sort option
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.vendorName.localeCompare(b.vendorName)
      case "name-desc":
        return b.vendorName.localeCompare(a.vendorName)
      case "rating-desc":
        return (b.rating || 0) - (a.rating || 0)
      case "rating-asc":
        return (a.rating || 0) - (b.rating || 0)
      case "recent":
        const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0
        const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0
        return dateB - dateA
      case "spend-desc":
        return (b.totalSpent || 0) - (a.totalSpent || 0)
      default:
        return 0
    }
  })

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(vendors.map((vendor) => vendor.category).filter(Boolean)))

  // Calculate vendor statistics
  const activeVendors = vendors.filter((v) => v.status === "active").length
  const totalVendors = vendors.length
  const avgRating = vendors.length > 0 
    ? (vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length).toFixed(1)
    : "0.0"
  const expiredContracts = vendorContracts.filter((c) => c.status === "Expired" || c.status === "expired").length

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Manage vendor relationships and purchase orders</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Vendor Reports</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Vendor Performance
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Spend Analysis
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Contract Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>Enter the details of the new vendor below</DialogDescription>
              </DialogHeader>
              <AddVendorForm onSuccess={() => {
                setIsDialogOpen(false)
                handleVendorSaved()
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Vendor Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeVendors}/{totalVendors}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalVendors > 0 ? Math.round((activeVendors / totalVendors) * 100) : 0}% active vendor rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating}/5.0</div>
            <p className="text-xs text-muted-foreground">Based on performance and reliability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendorContracts.length - expiredContracts}</div>
            <p className="text-xs text-muted-foreground">{expiredContracts} contracts need renewal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Across {vendors.length} total vendors</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendors..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
              <SelectItem value="rating-asc">Rating (Low-High)</SelectItem>
              <SelectItem value="recent">Recent Orders</SelectItem>
              <SelectItem value="spend-desc">Total Spend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Vendor List</CardTitle>
              <CardDescription>Manage your hospital's suppliers and service providers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          No vendors found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedVendors.map((vendor) => (
                        <TableRow key={vendor.vendorId}>
                          <TableCell>{vendor.vendorCode || "-"}</TableCell>
                          <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                          <TableCell>{vendor.contactPerson || "-"}</TableCell>
                          <TableCell>{vendor.category || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {(vendor.rating || 0) >= 4.5 ? (
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              ) : (
                                <StarHalf className="h-4 w-4 text-yellow-500 mr-1" />
                              )}
                              {(vendor.rating || 0).toFixed(1)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={vendor.status === "active" ? "default" : "secondary"}>
                              {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{vendor.lastOrderDate ? formatDate(vendor.lastOrderDate) : "-"}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => viewVendorDetails(vendor.vendorId)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
                                  <FileEdit className="mr-2 h-4 w-4" />
                                  Edit Vendor
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteVendorClick(vendor)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Vendor
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance</CardTitle>
              <CardDescription>Track and analyze vendor performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading performance data...</span>
                </div>
              ) : vendorPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No performance data available.</p>
                  <p className="text-sm mt-2">Performance metrics are calculated from vendor ratings.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>On-Time Delivery (%)</TableHead>
                      <TableHead>Quality Score (%)</TableHead>
                      <TableHead>Response Time (hrs)</TableHead>
                      <TableHead>Cost Savings (%)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorPerformance.map((vendor) => (
                      <TableRow key={vendor.vendorId || vendor.name}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${
                                vendor.onTimeDelivery >= 90
                                  ? "bg-green-500"
                                  : vendor.onTimeDelivery >= 80
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${vendor.onTimeDelivery}%` }}
                            ></div>
                          </div>
                          {vendor.onTimeDelivery}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${
                                vendor.qualityScore >= 90
                                  ? "bg-green-500"
                                  : vendor.qualityScore >= 80
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${vendor.qualityScore}%` }}
                            ></div>
                          </div>
                          {vendor.qualityScore}%
                        </div>
                      </TableCell>
                      <TableCell>{vendor.responseTime}</TableCell>
                        <TableCell>{vendor.costSavings || 0}%</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/procurement/vendors/${vendor.vendorId}`)}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Details
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

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendor Contracts</CardTitle>
                <CardDescription>Manage and track vendor contracts and agreements</CardDescription>
              </div>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Contract
              </Button>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading contracts...</span>
                </div>
              ) : vendorContracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No contracts found.</p>
                  <p className="text-sm mt-2">Create a new contract to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorContracts.map((contract) => (
                      <TableRow key={contract.id || contract.contractId}>
                        <TableCell>{contract.id}</TableCell>
                        <TableCell className="font-medium">{contract.vendor}</TableCell>
                        <TableCell>{contract.type}</TableCell>
                        <TableCell>{contract.startDate}</TableCell>
                        <TableCell>{contract.endDate}</TableCell>
                        <TableCell>{contract.value}</TableCell>
                        <TableCell>
                          <Badge variant={contract.status === "Active" || contract.status === "active" ? "default" : contract.status === "Expired" || contract.status === "expired" ? "destructive" : "secondary"}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => router.push(`/procurement/vendors/${contract.vendorId}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <FileEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Track and manage purchase orders with vendors</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading purchase orders...</span>
                </div>
              ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No purchase orders found.</p>
                  <p className="text-sm mt-2">Create a new purchase order to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id || po.purchaseOrderId}>
                        <TableCell>{po.id}</TableCell>
                        <TableCell className="font-medium">{po.vendor}</TableCell>
                        <TableCell>{po.date}</TableCell>
                        <TableCell>{po.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              po.status === "Received" || po.status === "received" ? "default" 
                              : po.status === "Partial received" || po.status === "Partial_received" || po.status === "partial_received" ? "secondary"
                              : po.status === "Sent" || po.status === "sent" ? "outline"
                              : "outline"
                            }
                          >
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/procurement/orders/${po.purchaseOrderId || po.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
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
      </Tabs>

      {/* Edit Vendor Dialog */}
      <Dialog open={editVendorOpen} onOpenChange={(open) => {
        setEditVendorOpen(open)
        if (!open) {
          setEditingVendor(null)
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>Update vendor information</DialogDescription>
          </DialogHeader>
          <AddVendorForm vendor={editingVendor} onSuccess={handleVendorSaved} />
        </DialogContent>
      </Dialog>

      {/* Delete Vendor Confirmation */}
      <AlertDialog open={deleteVendorOpen} onOpenChange={setDeleteVendorOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone.
              {deletingVendor && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-sm font-medium">{deletingVendor.vendorCode} - {deletingVendor.vendorName}</p>
                  <p className="text-xs text-muted-foreground">Category: {deletingVendor.category || "-"}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingVendorLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVendorConfirm}
              disabled={deletingVendorLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingVendorLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
