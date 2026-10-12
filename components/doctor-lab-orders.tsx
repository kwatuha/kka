"use client"

import { useState } from "react"
import { FileText, Filter, Search, User, FlaskRoundIcon as Flask, ArrowUpDown, Download } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function DoctorLabOrders({ doctorId }: { doctorId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")

  // Mock data - in a real app, this would come from an API
  const labOrdersData = {
    totalOrders: 1245,
    pendingOrders: 32,
    completedOrders: 1198,
    cancelledOrders: 15,
    recentOrders: [
      {
        id: "LO-1234",
        patientName: "John Imbayi",
        patientId: "P-1234",
        testType: "Complete Blood Count (CBC)",
        orderDate: "2023-06-10",
        status: "Completed",
        priority: "Routine",
        results: "Normal",
        completedDate: "2023-06-11",
      },
      {
        id: "LO-1235",
        patientName: "Jane Lwikane",
        patientId: "P-5678",
        testType: "Lipid Panel",
        orderDate: "2023-06-10",
        status: "Completed",
        priority: "Routine",
        results: "Abnormal",
        completedDate: "2023-06-11",
      },
      {
        id: "LO-1236",
        patientName: "Robert Imbunya",
        patientId: "P-9012",
        testType: "Cardiac Enzymes",
        orderDate: "2023-06-11",
        status: "Completed",
        priority: "Urgent",
        results: "Abnormal",
        completedDate: "2023-06-11",
      },
      {
        id: "LO-1237",
        patientName: "Mary Kimani",
        patientId: "P-3456",
        testType: "Echocardiogram",
        orderDate: "2023-06-12",
        status: "Pending",
        priority: "Routine",
        results: "",
        completedDate: "",
      },
      {
        id: "LO-1238",
        patientName: "David Kimutai",
        patientId: "P-7890",
        testType: "Stress Test",
        orderDate: "2023-06-12",
        status: "Pending",
        priority: "Routine",
        results: "",
        completedDate: "",
      },
      {
        id: "LO-1239",
        patientName: "Sarah Tarus",
        patientId: "P-2345",
        testType: "Cardiac MRI",
        orderDate: "2023-06-09",
        status: "Completed",
        priority: "Routine",
        results: "Normal",
        completedDate: "2023-06-11",
      },
      {
        id: "LO-1240",
        patientName: "Michael Elkana",
        patientId: "P-6789",
        testType: "Holter Monitor",
        orderDate: "2023-06-08",
        status: "Completed",
        priority: "Routine",
        results: "Abnormal",
        completedDate: "2023-06-10",
      },
      {
        id: "LO-1241",
        patientName: "Jennifer Abunga",
        patientId: "P-0123",
        testType: "Cardiac Catheterization",
        orderDate: "2023-06-13",
        status: "Scheduled",
        priority: "Urgent",
        results: "",
        completedDate: "",
      },
    ],
    commonTests: [
      { name: "Complete Blood Count (CBC)", count: 287 },
      { name: "Lipid Panel", count: 245 },
      { name: "Cardiac Enzymes", count: 198 },
      { name: "Echocardiogram", count: 176 },
      { name: "Stress Test", count: 143 },
    ],
  }

  // Filter orders based on search query and filters
  const filteredOrders = labOrdersData.recentOrders.filter((order) => {
    // Filter by search query
    const matchesSearch =
      order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.testType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by status
    const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase()

    // Filter by time
    let matchesTime = true
    if (timeFilter !== "all") {
      const orderDate = new Date(order.orderDate)
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setMonth(today.getMonth() - 1)

      if (timeFilter === "today") {
        matchesTime = orderDate.toDateString() === today.toDateString()
      } else if (timeFilter === "week") {
        matchesTime = orderDate >= weekAgo
      } else if (timeFilter === "month") {
        matchesTime = orderDate >= monthAgo
      }
    }

    return matchesSearch && matchesStatus && matchesTime
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Laboratory Orders</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labOrdersData.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labOrdersData.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting results</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labOrdersData.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Results available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labOrdersData.cancelledOrders}</div>
            <p className="text-xs text-muted-foreground">Not performed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lab Orders History</CardTitle>
          <CardDescription>Recent laboratory tests ordered for patients</CardDescription>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by patient, test, or ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Order ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test Type</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Order Date
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Results</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{order.patientName}</div>
                          <div className="text-xs text-muted-foreground">{order.patientId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Flask className="h-4 w-4 text-muted-foreground" />
                        {order.testType}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={order.priority === "Urgent" ? "destructive" : "outline"}>{order.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === "Completed"
                            ? "default"
                            : order.status === "Pending"
                              ? "secondary"
                              : order.status === "Scheduled"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.results ? (
                        <Badge variant={order.results === "Normal" ? "default" : "destructive"}>{order.results}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No lab orders found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Ordered Tests</CardTitle>
            <CardDescription>Frequently ordered laboratory tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labOrdersData.commonTests.map((test, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Flask className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{test.name}</span>
                  </div>
                  <Badge variant="outline">{test.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results Analysis</CardTitle>
            <CardDescription>Patterns in laboratory test results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>Normal Results</div>
                <div className="font-medium">68%</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Abnormal Results</div>
                <div className="font-medium">28%</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Critical Results</div>
                <div className="font-medium">4%</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Average Turnaround Time</div>
                <div className="font-medium">1.2 days</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Repeat Tests Rate</div>
                <div className="font-medium">7%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
