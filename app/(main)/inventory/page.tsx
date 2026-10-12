"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, PlusCircle, ArrowDownUp, Layers, Edit, Trash2, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import Link from "next/link"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { inventoryApi } from "@/lib/api"
import { InventoryItemForm } from "@/components/inventory-item-form"
import { toast } from "@/components/ui/use-toast"

// Legacy mock data (removed - now using API)
const inventoryItems = [
  {
    id: "1",
    name: "Surgical Gloves (Medium)",
    sku: "SG-M-001",
    category: "Medical Supplies",
    location: "Main Storage A1",
    currentStock: 1250,
    minStock: 500,
    maxStock: 2000,
    unitPrice: 8.5,
    totalValue: 10625.0,
    status: "In Stock",
    expiryDate: "2025-06-15",
    lastUpdated: "2023-04-10",
    batchNumber: "BT-2023-045",
  },
  {
    id: "2",
    name: "Paracetamol 500mg",
    sku: "MED-P500-002",
    category: "Pharmaceuticals",
    location: "Pharmacy Storage B2",
    currentStock: 350,
    minStock: 400,
    maxStock: 1000,
    unitPrice: 2.75,
    totalValue: 962.5,
    status: "Low Stock",
    expiryDate: "2024-11-30",
    lastUpdated: "2023-04-12",
    batchNumber: "BT-2023-089",
  },
  {
    id: "3",
    name: "Disposable Syringes 5ml",
    sku: "DS-5ML-003",
    category: "Medical Supplies",
    location: "Main Storage A2",
    currentStock: 3200,
    minStock: 1000,
    maxStock: 5000,
    unitPrice: 1.25,
    totalValue: 4000.0,
    status: "In Stock",
    expiryDate: "2025-08-22",
    lastUpdated: "2023-04-05",
    batchNumber: "BT-2023-032",
  },
  {
    id: "4",
    name: "Amoxicillin 250mg",
    sku: "MED-A250-004",
    category: "Pharmaceuticals",
    location: "Pharmacy Storage B1",
    currentStock: 180,
    minStock: 200,
    maxStock: 800,
    unitPrice: 5.5,
    totalValue: 990.0,
    status: "Low Stock",
    expiryDate: "2024-09-18",
    lastUpdated: "2023-04-08",
    batchNumber: "BT-2023-067",
  },
  {
    id: "5",
    name: "Blood Pressure Monitor",
    sku: "EQ-BPM-005",
    category: "Equipment",
    location: "Equipment Storage C3",
    currentStock: 25,
    minStock: 10,
    maxStock: 30,
    unitPrice: 85.0,
    totalValue: 2125.0,
    status: "In Stock",
    expiryDate: "N/A",
    lastUpdated: "2023-03-28",
    batchNumber: "BT-2023-015",
  },
  {
    id: "6",
    name: "Surgical Masks",
    sku: "SM-001-006",
    category: "PPE",
    location: "Main Storage A3",
    currentStock: 5800,
    minStock: 2000,
    maxStock: 10000,
    unitPrice: 0.75,
    totalValue: 4350.0,
    status: "In Stock",
    expiryDate: "2025-12-01",
    lastUpdated: "2023-04-02",
    batchNumber: "BT-2023-028",
  },
  {
    id: "7",
    name: "Insulin Vials",
    sku: "MED-INS-007",
    category: "Pharmaceuticals",
    location: "Cold Storage D1",
    currentStock: 85,
    minStock: 50,
    maxStock: 150,
    unitPrice: 32.5,
    totalValue: 2762.5,
    status: "In Stock",
    expiryDate: "2024-07-15",
    lastUpdated: "2023-04-11",
    batchNumber: "BT-2023-092",
  },
  {
    id: "8",
    name: "Examination Beds",
    sku: "FUR-EB-008",
    category: "Furniture",
    location: "Furniture Storage E2",
    currentStock: 5,
    minStock: 3,
    maxStock: 10,
    unitPrice: 750.0,
    totalValue: 3750.0,
    status: "In Stock",
    expiryDate: "N/A",
    lastUpdated: "2023-03-15",
    batchNumber: "N/A",
  },
  {
    id: "9",
    name: "Oxygen Masks",
    sku: "OM-001-009",
    category: "Medical Supplies",
    location: "Main Storage A4",
    currentStock: 120,
    minStock: 100,
    maxStock: 300,
    unitPrice: 12.25,
    totalValue: 1470.0,
    status: "In Stock",
    expiryDate: "2025-05-20",
    lastUpdated: "2023-04-07",
    batchNumber: "BT-2023-054",
  },
  {
    id: "10",
    name: "Hand Sanitizer 500ml",
    sku: "HS-500-010",
    category: "Hygiene Products",
    location: "Main Storage A5",
    currentStock: 45,
    minStock: 100,
    maxStock: 400,
    unitPrice: 6.75,
    totalValue: 303.75,
    status: "Low Stock",
    expiryDate: "2025-02-28",
    lastUpdated: "2023-04-09",
    batchNumber: "BT-2023-078",
  },
]

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    expiringItems: 0,
    categories: 0,
    locations: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      const [itemsData, summaryData] = await Promise.all([
        inventoryApi.getAll(selectedCategory !== "all" ? selectedCategory : undefined, selectedStatus !== "all" ? selectedStatus : undefined, searchTerm || undefined),
        inventoryApi.getSummary(),
      ])
      setItems(itemsData)
      setSummary(summaryData)
    } catch (error: any) {
      console.error("Error loading inventory:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory data.",
        variant: "destructive",
      })
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory, selectedStatus])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const handleAdd = () => {
    setSelectedItem(null)
    setFormOpen(true)
  }

  const handleEdit = (transformedItem: any) => {
    // Find the original API item by itemId
    const originalItem = items.find((i) => i.itemId === transformedItem.itemId)
    setSelectedItem(originalItem || transformedItem)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      await inventoryApi.delete(itemToDelete.itemId.toString())
      toast({
        title: "Success",
        description: "Inventory item deleted successfully.",
      })
      loadInventory()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error: any) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item.",
        variant: "destructive",
      })
    }
  }

  // Transform API data to match frontend expectations
  const transformedItems = items.map((item) => {
    const quantity = parseInt(item.quantity || 0)
    const reorderLevel = parseInt(item.reorderLevel || 0)
    const unitPrice = parseFloat(item.unitPrice || 0)
    const totalValue = quantity * unitPrice
    const status = quantity <= reorderLevel ? "Low Stock" : quantity === 0 ? "Out of Stock" : "In Stock"

    return {
      id: item.itemId.toString(),
      itemId: item.itemId,
      name: item.name,
      sku: item.itemCode || `INV-${item.itemId}`,
      category: item.category || "Uncategorized",
      location: item.location || "Not specified",
      currentStock: quantity,
      minStock: reorderLevel,
      maxStock: reorderLevel * 2, // Estimate max stock
      unitPrice: unitPrice,
      totalValue: totalValue,
      status: status,
      expiryDate: item.expiryDate || "N/A",
      lastUpdated: item.updatedAt || item.createdAt,
      batchNumber: "N/A",
    }
  })

  // Filter inventory items based on search term
  const filteredItems = transformedItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Get unique categories for filter dropdown
  const categories = ["all", ...new Set(transformedItems.map((item) => item.category))]

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <BreadcrumbsEnhanced
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Inventory", href: "/inventory", active: true },
          ]}
        />
        <div className="flex gap-2">
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inventory/adjust">
              <Layers className="mr-2 h-4 w-4" />
              Stock Adjustment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">KES {parseFloat(summary.totalValue || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{summary.totalItems || 0} items in stock</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-500">{summary.lowStockItems || 0}</div>
                <p className="text-xs text-muted-foreground">Items below minimum stock level</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-500">{summary.expiringItems || 0}</div>
                <p className="text-xs text-muted-foreground">Items expiring within 90 days</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories
                    .filter((cat) => cat !== "all")
                    .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading inventory...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link href={`/inventory/${item.itemId}`} className="hover:underline text-primary hover:text-primary/80">
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className="text-right">
                          {item.currentStock}
                          <span className="text-xs text-muted-foreground ml-1">
                            (min: {item.minStock})
                          </span>
                        </TableCell>
                        <TableCell className="text-right">KES {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">KES {item.totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "In Stock"
                                ? "default"
                                : item.status === "Low Stock"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.expiryDate === "N/A" ? (
                            <span className="text-muted-foreground">N/A</span>
                          ) : new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? (
                            <span className="text-red-500">{new Date(item.expiryDate).toLocaleDateString()}</span>
                          ) : (
                            new Date(item.expiryDate).toLocaleDateString()
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                              title="View Details"
                            >
                              <Link href={`/inventory/${item.itemId}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setItemToDelete(item)
                                setDeleteDialogOpen(true)
                              }}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Category management content will go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Storage Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Location management content will go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Inventory analytics and reports will go here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InventoryItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        item={selectedItem}
        onSuccess={loadInventory}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the inventory item "{itemToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
