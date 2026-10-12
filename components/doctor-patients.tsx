"use client"

import { useState } from "react"
import { Calendar, Clock, Download, FileText, Search, UserCheck, UserMinus, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DoctorPatients({ doctorId }: { doctorId: string }) {
  const [searchTerm, setSearchTerm] = useState("")

  // Mock data - would come from API in real application
  const patients = [
    {
      id: "P-1001",
      name: "John Kamau",
      age: 45,
      gender: "Male",
      condition: "Hypertension",
      lastVisit: "2023-05-15",
      nextAppointment: "2023-06-15",
      status: "Active",
      visits: 8,
      avatar: "/vibrant-street-market.png",
      initials: "JK",
      turnAroundTime: 25, // minutes
      adherence: "Good",
      insurance: "SHA",
      phone: "+254 712 345 678",
    },
    {
      id: "P-1002",
      name: "Jane Wangari",
      age: 38,
      gender: "Female",
      condition: "Coronary Artery Disease",
      lastVisit: "2023-05-10",
      nextAppointment: "2023-06-10",
      status: "Active",
      visits: 12,
      avatar: "/diverse-group-chatting.png",
      initials: "JW",
      turnAroundTime: 30, // minutes
      adherence: "Excellent",
      insurance: "AAR",
      phone: "+254 723 456 789",
    },
    {
      id: "P-1003",
      name: "Robert Ochieng",
      age: 62,
      gender: "Male",
      condition: "Heart Failure",
      lastVisit: "2023-05-05",
      nextAppointment: "2023-05-25",
      status: "Critical",
      visits: 15,
      avatar: "/diverse-group-meeting.png",
      initials: "RO",
      turnAroundTime: 40, // minutes
      adherence: "Fair",
      insurance: "Jubilee",
      phone: "+254 734 567 890",
    },
    {
      id: "P-1004",
      name: "Mary Akinyi",
      age: 55,
      gender: "Female",
      condition: "Arrhythmia",
      lastVisit: "2023-04-28",
      nextAppointment: "2023-05-28",
      status: "Stable",
      visits: 6,
      avatar: "/diverse-group-city.png",
      initials: "MA",
      turnAroundTime: 20, // minutes
      adherence: "Good",
      insurance: "SHA",
      phone: "+254 745 678 901",
    },
    {
      id: "P-1005",
      name: "David Mwangi",
      age: 70,
      gender: "Male",
      condition: "Valve Disease",
      lastVisit: "2023-04-20",
      nextAppointment: "2023-05-20",
      status: "Improving",
      visits: 10,
      avatar: "/thoughtful-portrait.png",
      initials: "DM",
      turnAroundTime: 35, // minutes
      adherence: "Poor",
      insurance: "Britam",
      phone: "+254 756 789 012",
    },
    {
      id: "P-1006",
      name: "Sarah Njeri",
      age: 42,
      gender: "Female",
      condition: "Hypertension",
      lastVisit: "2023-04-15",
      nextAppointment: "2023-05-15",
      status: "Active",
      visits: 4,
      avatar: "/diverse-group-chatting.png",
      initials: "SN",
      turnAroundTime: 22, // minutes
      adherence: "Good",
      insurance: "SHA",
      phone: "+254 767 890 123",
    },
    {
      id: "P-1007",
      name: "Michael Otieno",
      age: 58,
      gender: "Male",
      condition: "Coronary Artery Disease",
      lastVisit: "2023-04-10",
      nextAppointment: "2023-05-10",
      status: "Stable",
      visits: 9,
      avatar: "/diverse-group-meeting.png",
      initials: "MO",
      turnAroundTime: 28, // minutes
      adherence: "Excellent",
      insurance: "Madison",
      phone: "+254 778 901 234",
    },
  ]

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Patient statistics
  const totalPatients = patients.length
  const activePatients = patients.filter((p) => p.status === "Active").length
  const criticalPatients = patients.filter((p) => p.status === "Critical").length
  const stablePatients = patients.filter((p) => p.status === "Stable" || p.status === "Improving").length
  const avgTurnAroundTime = Math.round(
    patients.reduce((sum, patient) => sum + patient.turnAroundTime, 0) / patients.length,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>View and manage patients under Dr. {doctorId.split("-")[1]}'s care</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Patient
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <UserCheck className="h-8 w-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{totalPatients}</div>
                <p className="text-sm text-muted-foreground">Total Patients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <UserPlus className="h-8 w-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{activePatients}</div>
                <p className="text-sm text-muted-foreground">Active Patients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <UserMinus className="h-8 w-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{criticalPatients}</div>
                <p className="text-sm text-muted-foreground">Critical Patients</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{avgTurnAroundTime} min</div>
                <p className="text-sm text-muted-foreground">Avg. Turn-Around</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="all">All Patients</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="critical">Critical</TabsTrigger>
                <TabsTrigger value="stable">Stable</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search patients..."
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select defaultValue="recent">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="visits">Visit Count</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age/Gender</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Next Appointment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Turn-Around</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={patient.avatar || "/placeholder.svg"} alt={patient.name} />
                              <AvatarFallback>{patient.initials}</AvatarFallback>
                            </Avatar>
                            {patient.name}
                          </div>
                        </TableCell>
                        <TableCell>{`${patient.age}/${patient.gender.charAt(0)}`}</TableCell>
                        <TableCell>{patient.condition}</TableCell>
                        <TableCell>{patient.lastVisit}</TableCell>
                        <TableCell>{patient.nextAppointment}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              patient.status === "Critical"
                                ? "destructive"
                                : patient.status === "Active"
                                  ? "default"
                                  : patient.status === "Stable"
                                    ? "secondary"
                                    : "outline"
                            }
                          >
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.turnAroundTime} min</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Similar content for other tabs */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
