"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Download, Eye, AlertCircle, Printer } from "lucide-react"
import { laboratoryApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { printLabResult, downloadLabResultPDF } from "@/lib/lab-results-pdf"

type LabTest = {
  id: string
  date: string
  time: string
  testName: string
  category: string
  status: string
  results: LabResult[]
  orderedBy: string
  performedBy: string
  reportUrl: string
  orderId: string
  clinicalIndication?: string
}

type LabResult = {
  parameter: string
  value: string
  unit: string
  referenceRange: string
  flag: string
}

export function PatientLabResults({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [labTests, setLabTests] = useState<LabTest[]>([])
  const [pendingLabTests, setPendingLabTests] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null)
  const [viewResultsOpen, setViewResultsOpen] = useState(false)

  useEffect(() => {
    loadLabResults()
  }, [patientId])

  const loadLabResults = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch lab orders for the patient
      const orders = await laboratoryApi.getOrders(patientId)

      const completedTests: LabTest[] = []
      const pendingTests: any[] = []

      // Process each order
      for (const order of orders) {
        // Get order items (test types)
        const orderDetails = await laboratoryApi.getOrder(order.orderId.toString()).catch(() => null)

        if (!orderDetails || !orderDetails.items) continue

        for (const item of orderDetails.items) {
          // Try to get results for this order item
          try {
            const results = await laboratoryApi.getOrderResults(order.orderId.toString())
            const result = results.find((r: any) => r.orderItemId === item.itemId)

            if (result && result.status === 'verified') {
              // Get result values
              const resultDetails = await laboratoryApi.getOrderResults(order.orderId.toString())
              const resultValues = resultDetails.find((r: any) => r.resultId === result.resultId)?.values || []

              completedTests.push({
                id: `lab-${result.resultId}`,
                date: new Date(result.testDate || order.orderDate).toISOString().split('T')[0],
                time: new Date(result.testDate || order.orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                testName: item.testTypeName || item.testName || 'Unknown Test',
                category: item.testCategory || 'General',
                status: 'Completed',
                results: resultValues.map((rv: any) => ({
                  parameter: rv.parameterName || rv.parameter,
                  value: rv.value || '',
                  unit: rv.unit || '',
                  referenceRange: rv.normalRange || rv.referenceRange || '',
                  flag: rv.flag || 'normal'
                })),
                orderedBy: order.doctorName || order.orderedBy || 'Unknown',
                performedBy: result.performedByName || result.performedBy || 'Unknown',
                reportUrl: '#',
                orderId: order.orderId.toString(),
                clinicalIndication: order.clinicalIndication || orderDetails.clinicalIndication || undefined
              })
            } else {
              // Pending test
              pendingTests.push({
                id: `pending-${item.itemId}`,
                date: new Date(order.orderDate).toISOString().split('T')[0],
                time: new Date(order.orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                testName: item.testTypeName || item.testName || 'Unknown Test',
                category: item.testCategory || 'General',
                status: result?.status || 'Pending',
                orderedBy: order.doctorName || order.orderedBy || 'Unknown',
                clinicalIndication: order.clinicalIndication || orderDetails.clinicalIndication || undefined
              })
            }
          } catch {
            // No results yet - pending
            pendingTests.push({
              id: `pending-${item.itemId}`,
              date: new Date(order.orderDate).toISOString().split('T')[0],
              time: new Date(order.orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              testName: item.testTypeName || item.testName || 'Unknown Test',
              category: item.testCategory || 'General',
              status: 'Pending',
              orderedBy: order.doctorName || order.orderedBy || 'Unknown',
              clinicalIndication: order.clinicalIndication || orderDetails?.clinicalIndication || undefined
            })
          }
        }
      }

      setLabTests(completedTests)
      setPendingLabTests(pendingTests)
    } catch (err: any) {
      console.error("Error loading lab results:", err)
      setError(err.message || "Failed to load lab results")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Results</CardTitle>
          <CardDescription>Complete history of laboratory tests and results</CardDescription>
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
          <CardTitle>Laboratory Results</CardTitle>
          <CardDescription>Complete history of laboratory tests and results</CardDescription>
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Results</CardTitle>
          <CardDescription>Complete history of laboratory tests and results</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="completed" className="space-y-4">
            <TabsList>
              <TabsTrigger value="completed">Completed Tests</TabsTrigger>
              <TabsTrigger value="pending">Pending Tests</TabsTrigger>
            </TabsList>

            <TabsContent value="completed" className="space-y-4">
              {labTests.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Clinical Indication</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordered By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>
                            {test.date}
                            <div className="text-xs text-muted-foreground">{test.time}</div>
                          </TableCell>
                          <TableCell>{test.testName}</TableCell>
                          <TableCell>{test.category}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={test.clinicalIndication || ""}>
                              {test.clinicalIndication || <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{test.status}</Badge>
                          </TableCell>
                          <TableCell>{test.orderedBy}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTest(test)
                                  setViewResultsOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadLabResultPDF(test)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => printLabResult(test)}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Print
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No completed lab tests found</div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingLabTests.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Ordered</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Clinical Indication</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordered By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLabTests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell>
                            {test.date}
                            <div className="text-xs text-muted-foreground">{test.time}</div>
                          </TableCell>
                          <TableCell>{test.testName}</TableCell>
                          <TableCell>{test.category}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={test.clinicalIndication || ""}>
                              {test.clinicalIndication || <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={test.status === "Pending" ? "outline" : "secondary"}>{test.status}</Badge>
                          </TableCell>
                          <TableCell>{test.orderedBy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No pending lab tests found</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={viewResultsOpen} onOpenChange={setViewResultsOpen}>
        {selectedTest && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedTest.testName} Results</DialogTitle>
              <DialogDescription>
                Test performed on {selectedTest.date} at {selectedTest.time}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Ordered By</p>
                  <p className="font-medium">{selectedTest.orderedBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Performed By</p>
                  <p className="font-medium">{selectedTest.performedBy}</p>
                </div>
              </div>

              {selectedTest.clinicalIndication && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Clinical Indication</p>
                  <p className="font-medium">{selectedTest.clinicalIndication}</p>
                </div>
              )}

              {selectedTest.results.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Reference Range</TableHead>
                        <TableHead>Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTest.results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.parameter}</TableCell>
                          <TableCell className="font-medium">{result.value}</TableCell>
                          <TableCell>{result.unit}</TableCell>
                          <TableCell>{result.referenceRange}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                result.flag === "normal"
                                  ? "outline"
                                  : result.flag === "high" || result.flag === "low"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {result.flag}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No result values available</div>
              )}

              <div className="flex justify-end gap-2">
                <Button onClick={() => downloadLabResultPDF(selectedTest)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => printLabResult(selectedTest)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
