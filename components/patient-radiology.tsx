"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, Scan, Printer, Download } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { radiologyApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { printRadiologyOrder, downloadRadiologyOrderPDF } from "@/lib/radiology-results-pdf"

type RadiologyOrder = {
  orderId: number
  orderNumber: string
  patientId: number
  orderedBy: number
  orderDate: string
  examTypeId: number
  examName?: string
  examCode?: string
  bodyPart?: string
  clinicalIndication?: string
  priority: string
  status: string
  scheduledDate?: string
  notes?: string
  doctorFirstName?: string
  doctorLastName?: string
}

export function PatientRadiology({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<RadiologyOrder[]>([])

  useEffect(() => {
    loadRadiologyOrders()
  }, [patientId])

  const loadRadiologyOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all radiology orders for the patient
      const data = await radiologyApi.getOrders(patientId)

      setOrders(data || [])
    } catch (err: any) {
      console.error("Error loading radiology orders:", err)
      setError(err.message || "Failed to load radiology orders")
    } finally {
      setLoading(false)
    }
  }

  const getDoctorName = (order: RadiologyOrder) => {
    if (order.doctorFirstName && order.doctorLastName) {
      return `${order.doctorFirstName} ${order.doctorLastName}`
    }
    return "Unknown"
  }

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'stat':
        return 'destructive'
      case 'urgent':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default'
      case 'in_progress':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'awaiting_payment':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Radiology</CardTitle>
          <CardDescription>Radiology examination orders and results</CardDescription>
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
          <CardTitle>Radiology</CardTitle>
          <CardDescription>Radiology examination orders and results</CardDescription>
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
            <Scan className="h-5 w-5" />
            Radiology
          </CardTitle>
          <CardDescription>Radiology examination orders and results</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Radiology Orders Found</AlertTitle>
            <AlertDescription>
              No radiology examination orders have been placed for this patient yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Sort by date descending (most recent first)
  const sortedOrders = [...orders].sort((a, b) => {
    return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Radiology ({orders.length})
        </CardTitle>
        <CardDescription>Radiology examination orders and results for this patient</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Date</TableHead>
                <TableHead>Order Number</TableHead>
                <TableHead>Examination</TableHead>
                <TableHead>Body Part</TableHead>
                <TableHead>Clinical Indication</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered By</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => {
                const handlePrint = () => {
                  const orderData = {
                    orderNumber: order.orderNumber,
                    orderDate: order.orderDate,
                    patientName: `Patient ${order.patientId}`, // Patient name not available in this component
                    patientNumber: undefined,
                    doctorName: getDoctorName(order),
                    priority: order.priority,
                    status: order.status,
                    clinicalIndication: order.clinicalIndication,
                    examName: order.examName,
                    examCode: order.examCode,
                    category: undefined,
                    bodyPart: order.bodyPart,
                    scheduledDate: order.scheduledDate,
                    notes: order.notes,
                  }
                  printRadiologyOrder(orderData)
                }

                const handleDownloadPDF = () => {
                  const orderData = {
                    orderNumber: order.orderNumber,
                    orderDate: order.orderDate,
                    patientName: `Patient ${order.patientId}`, // Patient name not available in this component
                    patientNumber: undefined,
                    doctorName: getDoctorName(order),
                    priority: order.priority,
                    status: order.status,
                    clinicalIndication: order.clinicalIndication,
                    examName: order.examName,
                    examCode: order.examCode,
                    category: undefined,
                    bodyPart: order.bodyPart,
                    scheduledDate: order.scheduledDate,
                    notes: order.notes,
                  }
                  downloadRadiologyOrderPDF(orderData)
                }

                return (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium">
                      {format(new Date(order.orderDate), "PPP")}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{order.orderNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.examName || "Unknown Exam"}</div>
                        {order.examCode && (
                          <div className="text-xs text-muted-foreground">
                            Code: {order.examCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.bodyPart ? (
                        <Badge variant="outline">{order.bodyPart}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.clinicalIndication || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(order.priority)}>
                        {formatPriority(order.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {formatStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getDoctorName(order)}</TableCell>
                    <TableCell>
                      {order.scheduledDate ? (
                        format(new Date(order.scheduledDate), "PPp")
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
