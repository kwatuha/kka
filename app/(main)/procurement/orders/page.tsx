"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, Edit, Trash2, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { purchaseOrderApi } from "@/lib/api"

export default function ProcurementOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Load purchase orders from API
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const data = await purchaseOrderApi.getAll(undefined, statusFilter !== "all" ? statusFilter : undefined)
      // Transform API response to match frontend expectations
      const transformedData = (data || []).map((order: any) => ({
        id: order.poNumber || order.purchaseOrderId?.toString(),
        vendorId: order.vendorId,
        vendorName: order.vendorName || "Unknown Vendor",
        vendorCode: order.vendorCode,
        dateCreated: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : "",
        dateRequired: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : "",
        status: order.status || "draft",
        totalAmount: parseFloat(order.totalAmount || 0),
        items: 0, // Will need to fetch items count separately if needed
        purchaseOrderId: order.purchaseOrderId
      }))
      setOrders(transformedData)
    } catch (err: any) {
      console.error('Error loading purchase orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }
    > = {
      draft: { label: "Draft", variant: "outline" },
      sent: { label: "Sent", variant: "secondary" },
      partial_received: { label: "Partial Received", variant: "secondary" },
      received: { label: "Received", variant: "default" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    }

    const { label, variant } = statusMap[status] || { label: status, variant: "outline" }

    return <Badge variant={variant}>{label}</Badge>
  }

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      <BreadcrumbsEnhanced />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
        <Link href="/procurement/orders/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Orders Management</CardTitle>
          <CardDescription>Manage purchase orders for hospital supplies, equipment, and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search orders..." className="pl-8 w-full" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partial_received">Partial Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount-low">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading purchase orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No purchase orders found.</p>
              <p className="text-sm mt-2">Create a new purchase order to get started.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead>Required By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id || order.purchaseOrderId}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{order.vendorName}</div>
                          <div className="text-xs text-muted-foreground">{order.vendorCode || order.vendorId}</div>
                        </TableCell>
                        <TableCell>{order.dateCreated}</TableCell>
                        <TableCell>{order.dateRequired}</TableCell>
                        <TableCell>{renderStatusBadge(order.status)}</TableCell>
                        <TableCell>{order.items || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/procurement/orders/${order.purchaseOrderId || order.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing <strong>{orders.length}</strong> of <strong>{orders.length}</strong> orders
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
