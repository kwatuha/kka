"use client"

import { useState } from "react"
import { TrendingUp, Download, ArrowUpDown, Users, Activity, Stethoscope } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DoctorRevenue({ doctorId }: { doctorId: string }) {
  const [timeframe, setTimeframe] = useState("year")

  // Mock data - in a real app, this would come from an API
  const revenueData = {
    totalRevenue: 4567890, // KES
    currentYearRevenue: 1245000, // KES
    previousYearRevenue: 1120000, // KES
    yearToDateGrowth: 11.2, // percentage
    averagePerPatient: 12500, // KES
    revenueByService: {
      Consultations: 450000,
      Procedures: 520000,
      "Follow-ups": 180000,
      "Emergency Care": 95000,
    },
    revenueByMonth: [
      { month: "Jan", amount: 98000 },
      { month: "Feb", amount: 102000 },
      { month: "Mar", amount: 105000 },
      { month: "Apr", amount: 99000 },
      { month: "May", amount: 110000 },
      { month: "Jun", amount: 115000 },
      { month: "Jul", amount: 0 },
      { month: "Aug", amount: 0 },
      { month: "Sep", amount: 0 },
      { month: "Oct", amount: 0 },
      { month: "Nov", amount: 0 },
      { month: "Dec", amount: 0 },
    ],
    topProcedures: [
      { name: "Cardiac Catheterization", revenue: 320000, count: 64 },
      { name: "Echocardiogram", revenue: 112000, count: 112 },
      { name: "Stress Test", revenue: 76000, count: 76 },
      { name: "Pacemaker Implantation", revenue: 160000, count: 16 },
      { name: "Holter Monitoring", revenue: 45000, count: 45 },
    ],
    recentTransactions: [
      {
        id: "T-1234",
        patientName: "John Kamau",
        patientId: "P-1234",
        service: "Cardiac Catheterization",
        date: "2023-06-10",
        amount: 50000,
        status: "Paid",
        paymentMethod: "Insurance",
      },
      {
        id: "T-1235",
        patientName: "Jane Wangari",
        patientId: "P-5678",
        service: "Consultation",
        date: "2023-06-10",
        amount: 3500,
        status: "Paid",
        paymentMethod: "Cash",
      },
      {
        id: "T-1236",
        patientName: "Robert Ochieng",
        patientId: "P-9012",
        service: "Echocardiogram",
        date: "2023-06-09",
        amount: 10000,
        status: "Paid",
        paymentMethod: "Insurance",
      },
      {
        id: "T-1237",
        patientName: "Mary Akinyi",
        patientId: "P-3456",
        service: "Follow-up",
        date: "2023-06-09",
        amount: 2500,
        status: "Pending",
        paymentMethod: "Insurance",
      },
      {
        id: "T-1238",
        patientName: "David Mwangi",
        patientId: "P-7890",
        service: "Stress Test",
        date: "2023-06-08",
        amount: 8000,
        status: "Paid",
        paymentMethod: "M-Pesa",
      },
    ],
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Revenue & Financial Performance</h2>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.currentYearRevenue)}</div>
            <div className="flex items-center text-xs text-green-500 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {revenueData.yearToDateGrowth}% from last year
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Per Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.averagePerPatient)}</div>
            <p className="text-xs text-muted-foreground">Per patient visit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.currentYearRevenue / 6)}</div>
            <p className="text-xs text-muted-foreground">Based on YTD</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue for {new Date().getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end gap-2">
              {revenueData.revenueByMonth.map((month) => (
                <div key={month.month} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t-sm"
                    style={{
                      height: month.amount ? `${(month.amount / 120000) * 250}px` : "0px",
                      opacity: month.amount ? 1 : 0.3,
                    }}
                  />
                  <div className="text-xs mt-2">{month.month}</div>
                  <div className="text-xs text-muted-foreground">
                    {month.amount ? formatCurrency(month.amount) : "-"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>Distribution across service types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(revenueData.revenueByService).map(([service, amount]) => (
              <div key={service}>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm">{service}</div>
                  <div className="text-sm">{formatCurrency(amount)}</div>
                </div>
                <Progress value={(amount / revenueData.currentYearRevenue) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="procedures">Top Procedures</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Financial Transactions</CardTitle>
              <CardDescription>Latest patient billing and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Transaction ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{transaction.patientName}</div>
                            <div className="text-xs text-muted-foreground">{transaction.patientId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.service}</TableCell>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === "Paid" ? "default" : "secondary"}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Revenue Generating Procedures</CardTitle>
              <CardDescription>Procedures with highest financial contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Average Per Procedure</TableHead>
                    <TableHead>% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.topProcedures.map((procedure) => (
                    <TableRow key={procedure.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          {procedure.name}
                        </div>
                      </TableCell>
                      <TableCell>{procedure.count}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(procedure.revenue)}</TableCell>
                      <TableCell>{formatCurrency(procedure.revenue / procedure.count)}</TableCell>
                      <TableCell>{((procedure.revenue / revenueData.currentYearRevenue) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Provider Breakdown</CardTitle>
              <CardDescription>Revenue by insurance provider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>SHA</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{formatCurrency(450000)}</div>
                    <Badge variant="outline">36%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>AAR Insurance</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{formatCurrency(320000)}</div>
                    <Badge variant="outline">26%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>Jubilee Insurance</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{formatCurrency(210000)}</div>
                    <Badge variant="outline">17%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>Madison Insurance</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{formatCurrency(150000)}</div>
                    <Badge variant="outline">12%</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>Other Providers</div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-medium mr-2">{formatCurrency(115000)}</div>
                    <Badge variant="outline">9%</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">Payment Method Distribution</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>Insurance</div>
                    <div className="font-medium">82%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>Cash</div>
                    <div className="font-medium">10%</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>Mobile Money</div>
                    <div className="font-medium">8%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
