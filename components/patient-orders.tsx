"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Package } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { billingApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import Link from "next/link"

type OrderItem = {
  itemId: number
  invoiceId: number
  chargeId: number | null
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  chargeName: string | null
  chargeCode: string | null
}

type Order = {
  invoiceId: number
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  status: string
  notes: string | null
  items: OrderItem[]
}

export function PatientOrders({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    loadOrders()
  }, [patientId])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all invoices for the patient
      const invoices = await billingApi.getInvoices(patientId)
      
      // Filter invoices that contain consumables/orders (check notes)
      const consumablesInvoices = invoices.filter((invoice: any) => {
        return invoice.notes && invoice.notes.toLowerCase().includes('consumables ordered')
      })

      // Fetch full invoice details (including items) for these invoices
      const ordersWithItems: Order[] = []
      for (const invoice of consumablesInvoices) {
        try {
          const fullInvoice = await billingApi.getInvoiceById(invoice.invoiceId.toString())
          if (fullInvoice && fullInvoice.items && fullInvoice.items.length > 0) {
            ordersWithItems.push({
              invoiceId: fullInvoice.invoiceId,
              invoiceNumber: fullInvoice.invoiceNumber,
              invoiceDate: fullInvoice.invoiceDate,
              totalAmount: parseFloat(fullInvoice.totalAmount || 0),
              status: fullInvoice.status,
              notes: fullInvoice.notes,
              items: fullInvoice.items || []
            })
          }
        } catch (err) {
          console.error(`Error fetching invoice ${invoice.invoiceId} details:`, err)
        }
      }

      setOrders(ordersWithItems)
    } catch (err: any) {
      console.error("Error loading orders:", err)
      setError(err.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Draft", variant: "outline" },
      pending: { label: "Pending", variant: "secondary" },
      partial: { label: "Partial", variant: "default" },
      paid: { label: "Paid", variant: "default" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    }
    const { label, variant } = statusMap[status.toLowerCase()] || { label: status, variant: "outline" }
    return <Badge variant={variant}>{label}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders / Consumables</CardTitle>
          <CardDescription>History of consumables and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders / Consumables</CardTitle>
          <CardDescription>History of consumables and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders / Consumables
          </CardTitle>
          <CardDescription>History of consumables and orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Orders Found</AlertTitle>
            <AlertDescription>
              No consumables or orders have been recorded for this patient yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Flatten all order items with invoice information
  const allOrderItems: Array<OrderItem & { invoiceId: number; invoiceNumber: string; invoiceDate: string; invoiceStatus: string }> = []
  orders.forEach(order => {
    order.items.forEach(item => {
      allOrderItems.push({
        ...item,
        invoiceId: order.invoiceId,
        invoiceNumber: order.invoiceNumber,
        invoiceDate: order.invoiceDate,
        invoiceStatus: order.status
      })
    })
  })

  // Sort by date descending (most recent first)
  const sortedOrderItems = allOrderItems.sort((a, b) => {
    return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Orders / Consumables ({allOrderItems.length} items)
        </CardTitle>
        <CardDescription>History of consumables and orders for this patient</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrderItems.map((item, index) => (
                <TableRow key={`${item.invoiceId}-${item.itemId}-${index}`}>
                  <TableCell className="font-medium">
                    {format(new Date(item.invoiceDate), "PPP")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.description || item.chargeName || "Consumable"}</div>
                      {item.chargeCode && (
                        <div className="text-xs text-muted-foreground">
                          Code: {item.chargeCode}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    KES {parseFloat(item.unitPrice.toString()).toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    KES {parseFloat(item.totalPrice.toString()).toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/finance/billing?invoiceId=${item.invoiceId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {item.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.invoiceStatus)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

