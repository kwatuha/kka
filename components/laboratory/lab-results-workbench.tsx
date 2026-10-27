"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { FileText, Loader2, RefreshCw, Search } from "lucide-react"
import { laboratoryApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { useFacilityUnits } from "@/lib/hooks/use-facility-units"
import { toast } from "@/components/ui/use-toast"
import { notifyFhirPublish, type FhirPublishPayload } from "@/lib/notify-fhir-publish"
import { onLabBillingUpdated } from "@/lib/lab-billing-events"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  canEnterLabResults,
  LaboratoryResultsForm,
  type LabResultSavePayload,
} from "@/components/laboratory/laboratory-results-form"

type LabOrder = {
  orderId: number
  orderNumber: string
  patientId: number
  orderDate: string
  priority: string
  status: string
  testNames?: string
  firstName?: string
  lastName?: string
  patientNumber?: string
  doctorFirstName?: string
  doctorLastName?: string
}

function formatStatus(status: string) {
  return (status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function LabResultsWorkbench() {
  const { currentBranch } = useAuth()
  const { currentLabId } = useFacilityUnits()
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [resultsFormOpen, setResultsFormOpen] = useState(false)
  const [orderForResults, setOrderForResults] = useState<any | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [savingResults, setSavingResults] = useState(false)
  const [openingOrderId, setOpeningOrderId] = useState<number | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await laboratoryApi.getOrders(
        undefined,
        statusFilter || undefined,
        1,
        100,
        currentBranch?.branchId ? String(currentBranch.branchId) : undefined,
        currentLabId ? String(currentLabId) : undefined
      )
      setOrders(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || "Failed to load laboratory orders")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, currentBranch?.branchId, currentLabId])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => onLabBillingUpdated(() => void loadOrders()), [loadOrders])

  const filteredOrders = orders.filter((order) => {
    if (!search.trim()) {
      return order.status !== "cancelled"
    }
    const q = search.toLowerCase()
    const hay = [
      order.orderNumber,
      order.patientNumber,
      order.firstName,
      order.lastName,
      order.testNames,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(q)
  })

  const handleEnterResults = async (order: LabOrder) => {
    try {
      setOpeningOrderId(order.orderId)
      const fullOrder = await laboratoryApi.getOrder(String(order.orderId))
      const items = await laboratoryApi.getOrderResults(String(order.orderId))
      setOrderForResults(fullOrder)
      setOrderItems(items || [])
      setResultsFormOpen(true)
    } catch (err: any) {
      toast({
        title: "Could not open results entry",
        description: err?.message || "Failed to load order details",
        variant: "destructive",
      })
    } finally {
      setOpeningOrderId(null)
    }
  }

  const handleSaveResults = async (data: LabResultSavePayload) => {
    if (!orderForResults) return
    setSavingResults(true)
    try {
      const saved = await laboratoryApi.createResult(String(orderForResults.orderId), data)
      toast({
        title: "Results saved",
        description: "Laboratory results were recorded successfully.",
      })
      notifyFhirPublish(toast, (saved as { fhirPublish?: FhirPublishPayload | null })?.fhirPublish)
      setResultsFormOpen(false)
      setOrderForResults(null)
      setOrderItems([])
      await loadOrders()
    } catch (err: any) {
      toast({
        title: "Error saving results",
        description: err?.message || "Failed to save results",
        variant: "destructive",
      })
    } finally {
      setSavingResults(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Enter results</CardTitle>
            <CardDescription>
              Select a paid lab order and record parameter values for the clinician.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search order, patient, or test..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "", label: "Ready for lab" },
                { value: "pending", label: "Pending" },
                { value: "sample_collected", label: "Sample collected" },
                { value: "in_progress", label: "In progress" },
                { value: "completed", label: "Completed" },
              ].map((opt) => (
                <Button
                  key={opt.value || "all"}
                  size="sm"
                  variant={statusFilter === opt.value ? "default" : "outline"}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
              <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={loadOrders}>
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No laboratory orders found for results entry.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => {
                      const enterable = canEnterLabResults(order.status)
                      return (
                        <TableRow key={order.orderId}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div>
                              {[order.firstName, order.lastName].filter(Boolean).join(" ") || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">{order.patientNumber}</div>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">{order.testNames || "—"}</TableCell>
                          <TableCell>
                            {order.orderDate ? format(new Date(order.orderDate), "dd MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.status === "completed" ? "default" : "outline"}>
                              {formatStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              disabled={!enterable || openingOrderId === order.orderId}
                              onClick={() => handleEnterResults(order)}
                              title={
                                enterable
                                  ? "Enter laboratory results"
                                  : "Pay at cashier or wait until order is ready for lab work"
                              }
                            >
                              {openingOrderId === order.orderId ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="mr-2 h-4 w-4" />
                              )}
                              Enter results
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={resultsFormOpen}
        onOpenChange={(open) => {
          setResultsFormOpen(open)
          if (!open) {
            setOrderForResults(null)
            setOrderItems([])
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Enter laboratory results</DialogTitle>
            <DialogDescription>
              Record results for order {orderForResults?.orderNumber || ""}
            </DialogDescription>
          </DialogHeader>
          {orderForResults ? (
            <LaboratoryResultsForm
              order={orderForResults}
              orderItems={orderItems}
              onSave={handleSaveResults}
              onCancel={() => {
                setResultsFormOpen(false)
                setOrderForResults(null)
                setOrderItems([])
              }}
              saving={savingResults}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
