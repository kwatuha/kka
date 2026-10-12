"use client"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Edit,
  Trash2,
  History,
  Truck,
  BarChart3,
  Package,
  Layers,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  QrCode,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { inventoryApi, inventoryTransactionApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function InventoryItemPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Fetch inventory item
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true)
        const data = await inventoryApi.getById(params.id)
        setItem(data)
      } catch (error: any) {
        console.error("Error fetching inventory item:", error)
        setError(error.message || "Failed to load inventory item")
        toast({
          title: "Error",
          description: "Failed to load inventory item.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchItem()
  }, [params.id])

  // Fetch transaction history
  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true)
      console.log("Fetching transactions for itemId:", params.id)
      const data = await inventoryTransactionApi.getAll(params.id)
      console.log("Transactions fetched:", data)
      setTransactions(data || [])
    } catch (error: any) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load transaction history.",
        variant: "destructive",
      })
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchTransactions()
    }
  }, [params.id])

  // Refresh transactions when page becomes visible (e.g., after returning from adjustment page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && params.id) {
        fetchTransactions()
        // Also refresh item data
        const refreshItem = async () => {
          try {
            const data = await inventoryApi.getById(params.id)
            setItem(data)
          } catch (error: any) {
            console.error("Error refreshing item:", error)
          }
        }
        refreshItem()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [params.id])

  // Refresh transactions after adjustment (exposed for potential use)
  const refreshTransactions = async () => {
    await fetchTransactions()
  }

  // Helper function to format transaction type
  const formatTransactionType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      receipt: "Stock In",
      issue: "Stock Out",
      adjustment: "Adjustment",
      transfer: "Transfer",
      return: "Return",
      wastage: "Wastage",
      expiry: "Expiry",
    }
    return typeMap[type] || type
  }

  // Helper function to format reason
  const formatReason = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      purchase: "New Purchase",
      return: "Return from Department",
      damage: "Damaged/Broken",
      expiry: "Expired",
      correction: "Inventory Correction",
      use: "Used in Procedure",
      transfer: "Transfer to Another Location",
      other: "Other",
    }
    return reasonMap[reason] || reason
  }

  // Calculate stock level percentage
  const stockLevelPercentage = item
    ? Math.min(Math.round(((item.quantity || 0) / Math.max(item.reorderLevel * 2, 1)) * 100), 100)
    : 0

  // Determine stock level color
  const getStockLevelColor = () => {
    if (!item) return "bg-gray-500"
    const currentStock = item.quantity || 0
    const reorderLevel = item.reorderLevel || 0
    if (currentStock <= reorderLevel / 2) return "bg-red-500"
    if (currentStock <= reorderLevel) return "bg-amber-500"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Failed to load inventory item</h3>
                <p className="text-sm text-muted-foreground mt-2">{error || "Item not found"}</p>
              </div>
              <Button asChild>
                <Link href="/inventory">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Inventory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <BreadcrumbsEnhanced
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Inventory", href: "/inventory" },
            { label: item.name, href: `/inventory/${item.itemId}`, active: true },
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/inventory/${item.itemId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{item.name}</CardTitle>
                <CardDescription>{item.itemCode || `INV-${item.itemId}`}</CardDescription>
              </div>
              <Badge
                variant={
                  item.status === "Active" ? "default" : item.status === "Inactive" ? "secondary" : "destructive"
                }
                className="ml-2"
              >
                {item.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Current Stock:</span>
                  <span className="ml-2">
                    {item.quantity || 0} {item.unit || "units"}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Reorder Level: {item.reorderLevel || 0}</span>
                  </div>
                  <Progress value={stockLevelPercentage} className={getStockLevelColor()} />
                </div>
                {item.unitPrice && (
                  <>
                    <div className="flex items-center text-sm">
                      <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Unit Price:</span>
                      <span className="ml-2">KES {parseFloat(item.unitPrice).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Total Value:</span>
                      <span className="ml-2">
                        KES {((item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {item.category && (
                  <div className="flex items-center text-sm">
                    <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Category:</span>
                    <span className="ml-2">{item.category}</span>
                  </div>
                )}
                {item.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span className="ml-2">{item.location}</span>
                  </div>
                )}
                {item.supplier && (
                  <div className="flex items-center text-sm">
                    <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Supplier:</span>
                    <span className="ml-2">{item.supplier}</span>
                  </div>
                )}
                {item.expiryDate && (
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Expiry Date:</span>
                    <span className="ml-2">
                      {new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? (
                        <span className="text-red-500">{new Date(item.expiryDate).toLocaleDateString()}</span>
                      ) : (
                        new Date(item.expiryDate).toLocaleDateString()
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {item.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href={`/inventory/adjust?itemId=${item.itemId}`}>
                <Layers className="mr-2 h-4 w-4" />
                Adjust Stock
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href={`/procurement/orders/new?item=${item.id}`}>
                <Truck className="mr-2 h-4 w-4" />
                Create Order
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href={`/inventory/${item.itemId}/analytics`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Usage Analytics
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href={`/inventory/${item.itemId}/print`}>
                <QrCode className="mr-2 h-4 w-4" />
                Print Label/QR
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="details">Additional Details</TabsTrigger>
          <TabsTrigger value="related">Related Items</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All stock movements and adjustments for this item</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Transaction history will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.transactionId}>
                        <TableCell>
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {transaction.transactionNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.transactionType === "receipt"
                                ? "default"
                                : transaction.transactionType === "issue"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {formatTransactionType(transaction.transactionType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={transaction.quantity > 0 ? "text-green-600" : "text-red-600"}>
                            {transaction.quantity > 0 ? "+" : ""}
                            {transaction.quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.reason ? (
                            <span className="text-sm">{formatReason(transaction.reason)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.referenceNumber ? (
                            <span className="text-sm font-mono">{transaction.referenceNumber}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.performedByFirstName || transaction.performedByLastName ? (
                            <span className="text-sm">
                              {transaction.performedByFirstName} {transaction.performedByLastName}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setDialogOpen(true)
                            }}
                          >
                            View Details
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

        <TabsContent value="details">
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Inventory Management</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Reorder Level:</dt>
                      <dd>{item.reorderLevel || 0}</dd>
                    </div>
                    {item.unit && (
                      <div className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">Unit:</dt>
                        <dd>{item.unit}</dd>
                      </div>
                    )}
                    {item.createdAt && (
                      <div className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">Created:</dt>
                        <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
                      </div>
                    )}
                    {item.updatedAt && (
                      <div className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">Last Updated:</dt>
                        <dd>{new Date(item.updatedAt).toLocaleDateString()}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Supplier Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Supplier:</dt>
                      <dd>{item.supplier}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Contact:</dt>
                      <dd>{item.supplierContact}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Manufacturer:</dt>
                      <dd>{item.manufacturer}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {item.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="related">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Related items feature coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedTransaction && (
            <>
              <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>
                  Transaction {selectedTransaction.transactionNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-sm">
                      {new Date(selectedTransaction.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm">{formatTransactionType(selectedTransaction.transactionType)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                    <p className="text-sm font-medium">
                      <span className={selectedTransaction.quantity > 0 ? "text-green-600" : "text-red-600"}>
                        {selectedTransaction.quantity > 0 ? "+" : ""}
                        {selectedTransaction.quantity}
                      </span>
                    </p>
                  </div>
                  {selectedTransaction.reason && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reason</p>
                      <p className="text-sm">{formatReason(selectedTransaction.reason)}</p>
                    </div>
                  )}
                  {selectedTransaction.referenceNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                      <p className="text-sm font-mono">{selectedTransaction.referenceNumber}</p>
                    </div>
                  )}
                  {selectedTransaction.referenceType && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reference Type</p>
                      <p className="text-sm">{selectedTransaction.referenceType}</p>
                    </div>
                  )}
                  {selectedTransaction.performedByFirstName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Performed By</p>
                      <p className="text-sm">
                        {selectedTransaction.performedByFirstName} {selectedTransaction.performedByLastName}
                      </p>
                    </div>
                  )}
                  {selectedTransaction.createdAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created At</p>
                      <p className="text-sm">
                        {new Date(selectedTransaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                {selectedTransaction.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {selectedTransaction.notes}
                    </p>
                  </div>
                )}
                {selectedTransaction.batchNumber && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Batch Number</p>
                    <p className="text-sm font-mono">{selectedTransaction.batchNumber}</p>
                  </div>
                )}
                {selectedTransaction.expiryDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                    <p className="text-sm">{new Date(selectedTransaction.expiryDate).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedTransaction.unitPrice && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unit Price</p>
                    <p className="text-sm">KES {parseFloat(selectedTransaction.unitPrice).toFixed(2)}</p>
                  </div>
                )}
                {selectedTransaction.totalValue && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-sm">KES {parseFloat(selectedTransaction.totalValue).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
