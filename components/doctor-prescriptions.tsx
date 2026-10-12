"use client"

import { useState } from "react"
import { FileText, Filter, Search, User, Pill, ArrowUpDown, Download, AlertTriangle, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export function DoctorPrescriptions({ doctorId }: { doctorId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")

  // Mock data - in a real app, this would come from an API
  const prescriptionsData = {
    totalPrescriptions: 3245,
    activePrescriptions: 487,
    refillRequests: 32,
    prescriptionsByCategory: {
      Cardiovascular: 1245,
      Antihypertensives: 876,
      Anticoagulants: 543,
      Statins: 432,
      Other: 149,
    },
    recentPrescriptions: [
      {
        id: "RX-1234",
        patientName: "John Imbayi",
        patientId: "P-1234",
        medication: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "3 months",
        prescribedDate: "2023-06-10",
        status: "Active",
        category: "Antihypertensives",
        refills: 2,
      },
      {
        id: "RX-1235",
        patientName: "Jane Lwikane",
        patientId: "P-5678",
        medication: "Atorvastatin",
        dosage: "20mg",
        frequency: "Once daily",
        duration: "6 months",
        prescribedDate: "2023-06-09",
        status: "Active",
        category: "Statins",
        refills: 5,
      },
      {
        id: "RX-1236",
        patientName: "Robert Imbunya",
        patientId: "P-9012",
        medication: "Warfarin",
        dosage: "5mg",
        frequency: "Once daily",
        duration: "Ongoing",
        prescribedDate: "2023-06-08",
        status: "Active",
        category: "Anticoagulants",
        refills: 3,
      },
      {
        id: "RX-1237",
        patientName: "Mary Kimani",
        patientId: "P-3456",
        medication: "Metoprolol",
        dosage: "50mg",
        frequency: "Twice daily",
        duration: "3 months",
        prescribedDate: "2023-06-07",
        status: "Active",
        category: "Cardiovascular",
        refills: 2,
      },
      {
        id: "RX-1238",
        patientName: "David Kimutai",
        patientId: "P-7890",
        medication: "Furosemide",
        dosage: "40mg",
        frequency: "Once daily",
        duration: "1 month",
        prescribedDate: "2023-06-05",
        status: "Expired",
        category: "Cardiovascular",
        refills: 0,
      },
      {
        id: "RX-1239",
        patientName: "Sarah Tarus",
        patientId: "P-2345",
        medication: "Aspirin",
        dosage: "81mg",
        frequency: "Once daily",
        duration: "Ongoing",
        prescribedDate: "2023-06-03",
        status: "Active",
        category: "Anticoagulants",
        refills: 11,
      },
      {
        id: "RX-1240",
        patientName: "Michael Elkana",
        patientId: "P-6789",
        medication: "Clopidogrel",
        dosage: "75mg",
        frequency: "Once daily",
        duration: "6 months",
        prescribedDate: "2023-06-01",
        status: "Active",
        category: "Anticoagulants",
        refills: 5,
      },
      {
        id: "RX-1241",
        patientName: "Jennifer Abunga",
        patientId: "P-0123",
        medication: "Digoxin",
        dosage: "0.125mg",
        frequency: "Once daily",
        duration: "3 months",
        prescribedDate: "2023-05-28",
        status: "Active",
        category: "Cardiovascular",
        refills: 2,
      },
    ],
    commonMedications: [
      { name: "Lisinopril", count: 387, category: "Antihypertensives" },
      { name: "Atorvastatin", count: 342, category: "Statins" },
      { name: "Metoprolol", count: 298, category: "Cardiovascular" },
      { name: "Aspirin", count: 276, category: "Anticoagulants" },
      { name: "Warfarin", count: 187, category: "Anticoagulants" },
    ],
  }

  // Filter prescriptions based on search query and filters
  const filteredPrescriptions = prescriptionsData.recentPrescriptions.filter((prescription) => {
    // Filter by search query
    const matchesSearch =
      prescription.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.medication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by status
    const matchesStatus = statusFilter === "all" || prescription.status.toLowerCase() === statusFilter.toLowerCase()

    // Filter by time
    let matchesTime = true
    if (timeFilter !== "all") {
      const prescribedDate = new Date(prescription.prescribedDate)
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setMonth(today.getMonth() - 1)

      if (timeFilter === "today") {
        matchesTime = prescribedDate.toDateString() === today.toDateString()
      } else if (timeFilter === "week") {
        matchesTime = prescribedDate >= weekAgo
      } else if (timeFilter === "month") {
        matchesTime = prescribedDate >= monthAgo
      }
    }

    return matchesSearch && matchesStatus && matchesTime
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Prescription History</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptionsData.totalPrescriptions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptionsData.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refill Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptionsData.refillRequests}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Records</CardTitle>
          <CardDescription>Medications prescribed to patients</CardDescription>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by patient, medication, or ID..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
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
                <TableHead className="w-[100px]">Rx ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Refills</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrescriptions.length > 0 ? (
                filteredPrescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">{prescription.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{prescription.patientName}</div>
                          <div className="text-xs text-muted-foreground">{prescription.patientId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{prescription.medication}</div>
                          <div className="text-xs text-muted-foreground">{prescription.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{prescription.dosage}</div>
                        <div className="text-xs text-muted-foreground">{prescription.frequency}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(prescription.prescribedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {prescription.refills > 0 ? (
                        <Badge variant="outline">{prescription.refills}</Badge>
                      ) : (
                        <Badge variant="destructive">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          prescription.status === "Active"
                            ? "default"
                            : prescription.status === "Expired"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {prescription.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No prescriptions found matching your filters
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
            <CardTitle>Prescription Categories</CardTitle>
            <CardDescription>Distribution by medication type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(prescriptionsData.prescriptionsByCategory).map(([category, count]) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm">{category}</div>
                  <div className="text-sm">{count}</div>
                </div>
                <Progress value={(count / prescriptionsData.totalPrescriptions) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Prescribed Medications</CardTitle>
            <CardDescription>Frequently prescribed drugs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prescriptionsData.commonMedications.map((med, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Pill className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <div>{med.name}</div>
                      <div className="text-xs text-muted-foreground">{med.category}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{med.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Alerts</CardTitle>
          <CardDescription>Important notifications about prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Potential Drug Interaction</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  5 patients are currently prescribed both Warfarin and Aspirin, which may increase bleeding risk.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Prescription Renewal Needed</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  12 patients have prescriptions expiring in the next 7 days.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Medication Adherence</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  8 patients have reported difficulty adhering to their medication schedule.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
