"use client"

import { useState } from "react"
import {
  FileText,
  Filter,
  Search,
  User,
  Stethoscope,
  ArrowUpDown,
  Download,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export function DoctorProcedures({ doctorId }: { doctorId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")

  // Mock data - in a real app, this would come from an API
  const proceduresData = {
    totalProcedures: 532,
    successRate: 98.5,
    complicationRate: 1.5,
    averageDuration: 45, // minutes
    proceduresByType: {
      "Cardiac Catheterization": 215,
      Echocardiogram: 187,
      "Stress Test": 76,
      "Pacemaker Implantation": 32,
      Other: 22,
    },
    recentProcedures: [
      {
        id: "PR-1234",
        patientName: "John Kamau",
        patientId: "P-1234",
        procedureType: "Cardiac Catheterization",
        date: "2023-06-10",
        duration: 45,
        outcome: "Successful",
        notes: "No complications. Identified 70% stenosis in LAD.",
        location: "Cath Lab 2",
      },
      {
        id: "PR-1235",
        patientName: "Jane Wangari",
        patientId: "P-5678",
        procedureType: "Echocardiogram",
        date: "2023-06-10",
        duration: 30,
        outcome: "Successful",
        notes: "Ejection fraction 55%. No significant abnormalities.",
        location: "Echo Room 1",
      },
      {
        id: "PR-1236",
        patientName: "Robert Ochieng",
        patientId: "P-9012",
        procedureType: "Stress Test",
        date: "2023-06-09",
        duration: 40,
        outcome: "Successful",
        notes: "Achieved target heart rate. No significant ST changes.",
        location: "Stress Test Lab",
      },
      {
        id: "PR-1237",
        patientName: "Mary Akinyi",
        patientId: "P-3456",
        procedureType: "Pacemaker Implantation",
        date: "2023-06-08",
        duration: 90,
        outcome: "Successful",
        notes: "Dual chamber pacemaker implanted without complications.",
        location: "OR 3",
      },
      {
        id: "PR-1238",
        patientName: "David Mwangi",
        patientId: "P-7890",
        procedureType: "Cardiac Catheterization",
        date: "2023-06-07",
        duration: 50,
        outcome: "Successful with Complications",
        notes: "Minor hematoma at access site. Otherwise successful.",
        location: "Cath Lab 1",
      },
      {
        id: "PR-1239",
        patientName: "Sarah Njeri",
        patientId: "P-2345",
        procedureType: "Echocardiogram",
        date: "2023-06-06",
        duration: 35,
        outcome: "Successful",
        notes: "Mild mitral regurgitation noted. Otherwise normal.",
        location: "Echo Room 2",
      },
      {
        id: "PR-1240",
        patientName: "Michael Otieno",
        patientId: "P-6789",
        procedureType: "Stress Test",
        date: "2023-06-05",
        duration: 45,
        outcome: "Successful",
        notes: "Test terminated early due to fatigue. No ischemic changes.",
        location: "Stress Test Lab",
      },
      {
        id: "PR-1241",
        patientName: "Jennifer Auma",
        patientId: "P-0123",
        procedureType: "Cardiac Catheterization",
        date: "2023-06-02",
        duration: 60,
        outcome: "Successful",
        notes: "PCI performed on RCA with drug-eluting stent placement.",
        location: "Cath Lab 2",
      },
    ],
    outcomeStats: {
      Successful: 512,
      "Successful with Complications": 12,
      Unsuccessful: 8,
    },
  }

  // Filter procedures based on search query and filters
  const filteredProcedures = proceduresData.recentProcedures.filter((procedure) => {
    // Filter by search query
    const matchesSearch =
      procedure.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      procedure.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      procedure.procedureType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      procedure.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by type
    const matchesType = typeFilter === "all" || procedure.procedureType.toLowerCase() === typeFilter.toLowerCase()

    // Filter by time
    let matchesTime = true
    if (timeFilter !== "all") {
      const procedureDate = new Date(procedure.date)
      const today = new Date()
      const weekAgo = new Date()
      weekAgo.setDate(today.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setMonth(today.getMonth() - 1)

      if (timeFilter === "today") {
        matchesTime = procedureDate.toDateString() === today.toDateString()
      } else if (timeFilter === "week") {
        matchesTime = procedureDate >= weekAgo
      } else if (timeFilter === "month") {
        matchesTime = procedureDate >= monthAgo
      }
    }

    return matchesSearch && matchesType && matchesTime
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Medical Procedures</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proceduresData.totalProcedures}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proceduresData.successRate}%</div>
            <p className="text-xs text-muted-foreground">Procedures without complications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Complication Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proceduresData.complicationRate}%</div>
            <p className="text-xs text-muted-foreground">Procedures with minor or major complications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proceduresData.averageDuration} min</div>
            <p className="text-xs text-muted-foreground">Per procedure</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procedure History</CardTitle>
          <CardDescription>Medical procedures performed on patients</CardDescription>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by patient, procedure, or ID..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Procedure Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cardiac catheterization">Cardiac Catheterization</SelectItem>
                  <SelectItem value="echocardiogram">Echocardiogram</SelectItem>
                  <SelectItem value="stress test">Stress Test</SelectItem>
                  <SelectItem value="pacemaker implantation">Pacemaker Implantation</SelectItem>
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
                <TableHead className="w-[100px]">Procedure ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure Type</TableHead>
                <TableHead>
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProcedures.length > 0 ? (
                filteredProcedures.map((procedure) => (
                  <TableRow key={procedure.id}>
                    <TableCell className="font-medium">{procedure.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{procedure.patientName}</div>
                          <div className="text-xs text-muted-foreground">{procedure.patientId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        {procedure.procedureType}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(procedure.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {procedure.duration} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          procedure.outcome === "Successful"
                            ? "default"
                            : procedure.outcome === "Successful with Complications"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {procedure.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell>{procedure.location}</TableCell>
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
                    No procedures found matching your filters
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
            <CardTitle>Procedure Types</CardTitle>
            <CardDescription>Distribution by procedure category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(proceduresData.proceduresByType).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm">{type}</div>
                  <div className="text-sm">{count}</div>
                </div>
                <Progress value={(count / proceduresData.totalProcedures) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procedure Outcomes</CardTitle>
            <CardDescription>Success and complication rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  <div>Successful</div>
                </div>
                <div className="flex items-center">
                  <div className="font-medium mr-2">{proceduresData.outcomeStats.Successful}</div>
                  <Badge variant="outline">
                    {((proceduresData.outcomeStats.Successful / proceduresData.totalProcedures) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-yellow-500" />
                  <div>With Complications</div>
                </div>
                <div className="flex items-center">
                  <div className="font-medium mr-2">{proceduresData.outcomeStats["Successful with Complications"]}</div>
                  <Badge variant="outline">
                    {(
                      (proceduresData.outcomeStats["Successful with Complications"] / proceduresData.totalProcedures) *
                      100
                    ).toFixed(1)}
                    %
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  <div>Unsuccessful</div>
                </div>
                <div className="flex items-center">
                  <div className="font-medium mr-2">{proceduresData.outcomeStats.Unsuccessful}</div>
                  <Badge variant="outline">
                    {((proceduresData.outcomeStats.Unsuccessful / proceduresData.totalProcedures) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3">Procedure Metrics</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>Average Recovery Time</div>
                  <div className="font-medium">2.3 days</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>Readmission Rate</div>
                  <div className="font-medium">1.2%</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>Patient Satisfaction</div>
                  <div className="font-medium">94%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
