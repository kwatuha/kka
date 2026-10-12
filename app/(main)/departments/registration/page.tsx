"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegistrationStats } from "@/components/registration-stats"
import { RegistrationQuickActions } from "@/components/registration-quick-actions"
import { PatientSearch, type PatientSearchFilters } from "@/components/patient-search"
import { RecentRegistrations } from "@/components/recent-registrations"
import { RegistrationQueueStatus } from "@/components/registration-queue-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight, Eye, ListPlus, MoreHorizontal, Plus, Search } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddToQueueForm } from "@/components/add-to-queue-form"
import { ComprehensivePatientForm } from "@/components/comprehensive-patient-form"
import { Input } from "@/components/ui/input"
import { AddAppointmentForm } from "@/components/add-appointment-form"
import { AllPatientsTable } from "@/components/all-patients-table"

// Sample patient data
const patients = [
  {
    id: "P-1001",
    name: "John Imbayi",
    age: 45,
    gender: "Male",
    contact: "+254 712 345 678",
    address: "123 Moi Avenue, Nairobi",
    status: "Active",
    registrationDate: "2022-03-10",
    lastVisit: "2023-04-15",
    primaryDoctor: "Dr. James Ndiwa",
    avatar: "/thoughtful-portrait.png",
    initials: "JI",
  },
  {
    id: "P-1002",
    name: "Sarah Lwikane",
    age: 32,
    gender: "Female",
    contact: "+254 723 456 789",
    address: "456 Kenyatta Avenue, Nairobi",
    status: "Active",
    registrationDate: "2022-05-18",
    lastVisit: "2023-04-18",
    primaryDoctor: "Dr. Sarah Isuvi",
    avatar: "/diverse-group-chatting.png",
    initials: "SL",
  },
  {
    id: "P-1003",
    name: "Michael Imbunya",
    age: 58,
    gender: "Male",
    contact: "+254 734 567 890",
    address: "789 Moi Avenue, Nairobi",
    status: "Active",
    registrationDate: "2021-12-05",
    lastVisit: "2023-04-20",
    primaryDoctor: "Dr. Michael Siva",
    avatar: "/diverse-group-chatting.png",
    initials: "MI",
  },
  {
    id: "P-1004",
    name: "Emily Kimani",
    age: 27,
    gender: "Female",
    contact: "+254 745 678 901",
    address: "101 Tom Mboya Street, Nairobi",
    status: "Inactive",
    registrationDate: "2023-01-20",
    lastVisit: "2023-04-10",
    primaryDoctor: "Dr. Emily Logovane",
    avatar: "/diverse-group-chatting.png",
    initials: "EK",
  },
  {
    id: "P-1005",
    name: "David Kimutai",
    age: 62,
    gender: "Male",
    contact: "+254 756 789 012",
    address: "202 Haile Selassie Avenue, Nairobi",
    status: "Active",
    registrationDate: "2021-08-15",
    lastVisit: "2023-04-12",
    primaryDoctor: "Dr. James Ndiwa",
    avatar: "/thoughtful-portrait.png",
    initials: "DK",
  },
]

// Sample appointments data
const appointments = [
  {
    id: "A-2001",
    patientName: "Alice Kimutai",
    patientId: "P-1001",
    time: "10:30 AM",
    date: "2023-05-25",
    doctor: "Dr. James Ndiwa",
    department: "Cardiology",
    status: "Confirmed",
    type: "Follow-up",
    duration: 30,
  },
  {
    id: "A-2002",
    patientName: "Robert Tarus",
    patientId: "P-1002",
    time: "11:15 AM",
    date: "2023-05-25",
    doctor: "Dr. Sarah Isuvi",
    department: "Dermatology",
    status: "Pending",
    type: "Initial",
    duration: 45,
  },
  {
    id: "A-2003",
    patientName: "Jennifer Elkana",
    patientId: "P-1003",
    time: "1:00 PM",
    date: "2023-05-25",
    doctor: "Dr. Michael Siva",
    department: "Ophthalmology",
    status: "Confirmed",
    type: "Follow-up",
    duration: 30,
  },
  {
    id: "A-2004",
    patientName: "David Abunga",
    patientId: "P-1004",
    time: "2:45 PM",
    date: "2023-05-25",
    doctor: "Dr. Emily Logovane",
    department: "Neurology",
    status: "Rescheduled",
    type: "Follow-up",
    duration: 30,
  },
  {
    id: "A-2005",
    patientName: "Mary Wanjiku",
    patientId: "P-1005",
    time: "9:00 AM",
    date: "2023-05-26",
    doctor: "Dr. James Ndiwa",
    department: "Cardiology",
    status: "Confirmed",
    type: "Follow-up",
    duration: 30,
  },
  {
    id: "A-2006",
    patientName: "John Kamau",
    patientId: "P-1006",
    time: "10:00 AM",
    date: "2023-05-26",
    doctor: "Dr. Sarah Isuvi",
    department: "Dermatology",
    status: "Confirmed",
    type: "Initial",
    duration: 45,
  },
  {
    id: "A-2007",
    patientName: "Sarah Njeri",
    patientId: "P-1007",
    time: "11:30 AM",
    date: "2023-05-26",
    doctor: "Dr. Michael Siva",
    department: "Ophthalmology",
    status: "Pending",
    type: "Follow-up",
    duration: 30,
  },
]

export default function RegistrationDepartmentPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilters, setSearchFilters] = useState<PatientSearchFilters>({})
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [isQueueFormOpen, setIsQueueFormOpen] = useState(false)
  const [addAppointmentOpen, setAddAppointmentOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState("2023-05-25")
  const [activeTab, setActiveTab] = useState("dashboard")

  const handleSearch = (query: string, filters: PatientSearchFilters) => {
    setSearchQuery(query)
    setSearchFilters(filters)
    console.log("Search:", query, filters)
  }

  // Filter patients based on search query and filters
  const filteredPatients = patients.filter((patient) => {
    // Filter by search query
    const matchesQuery =
      searchQuery === "" ||
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.contact.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by status
    const matchesStatus = !searchFilters.status || patient.status === searchFilters.status

    // Filter by date range
    const registrationDate = new Date(patient.registrationDate)
    const matchesStartDate = !searchFilters.startDate || registrationDate >= searchFilters.startDate
    const matchesEndDate = !searchFilters.endDate || registrationDate <= searchFilters.endDate

    return matchesQuery && matchesStatus && matchesStartDate && matchesEndDate
  })

  // Filter appointments for the selected date
  const filteredAppointments = appointments.filter((appointment) => appointment.date === selectedDate)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  const handleAddToQueue = (patientId: string, patientName: string) => {
    setSelectedPatient(patientId)
    setIsQueueFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registration Department</h1>
        <p className="text-muted-foreground">Manage patient registrations and queue assignments</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="patients">All Patients</TabsTrigger>
          <TabsTrigger value="register">Register Patient</TabsTrigger>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="search">Patient Search</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <RegistrationStats />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <RegistrationQuickActions onTabChange={handleTabChange} />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Patient Registry</CardTitle>
                  <CardDescription>Search and manage patient records</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="search" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="search">Search Patients</TabsTrigger>
                      <TabsTrigger value="recent">Recent Registrations</TabsTrigger>
                    </TabsList>
                    <TabsContent value="search" className="space-y-4">
                      <PatientSearch onSearch={handleSearch} />

                      {searchQuery || Object.keys(searchFilters).length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Patient</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Registration</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                  <TableRow key={patient.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={patient.avatar || "/placeholder.svg"} alt={patient.name} />
                                          <AvatarFallback>{patient.initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{patient.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {patient.age} yrs • {patient.gender}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{patient.contact}</TableCell>
                                    <TableCell>{patient.registrationDate}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={patient.status === "Active" ? "default" : "secondary"}
                                        className="capitalize"
                                      >
                                        {patient.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleAddToQueue(patient.id, patient.name)}
                                        >
                                          <ListPlus className="h-4 w-4" />
                                          <span className="sr-only">Add to queue</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" asChild>
                                          <a href={`/patients/${patient.id}`}>
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                          </a>
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="h-4 w-4" />
                                              <span className="sr-only">More</span>
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem>Edit Patient</DropdownMenuItem>
                                            <DropdownMenuItem>Schedule Appointment</DropdownMenuItem>
                                            <DropdownMenuItem>Print ID Card</DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    No patients found matching your search criteria
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Enter search terms above to find patients
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="recent">
                      <RecentRegistrations />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <RegistrationQueueStatus />
            </div>
          </div>
        </TabsContent>

        {/* New All Patients Tab */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle>All Patients</CardTitle>
              <CardDescription>View and manage all patient records</CardDescription>
            </CardHeader>
            <CardContent>
              <AllPatientsTable onAddToQueue={handleAddToQueue} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <ComprehensivePatientForm />
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>Manage patient queues and service assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Add to Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AddToQueueForm />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Current Queue Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RegistrationQueueStatus />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSelectedDate("2023-05-24")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <Button variant="outline" size="icon" onClick={() => setSelectedDate("2023-05-26")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search appointments..." className="w-full pl-8" />
                </div>
                <Button onClick={() => setAddAppointmentOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Appointment
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Appointments for {selectedDate}</CardTitle>
                <CardDescription>View and manage scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="rescheduled">Rescheduled</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.length > 0 ? (
                          filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell>{appointment.time}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{appointment.patientName}</p>
                                  <p className="text-xs text-muted-foreground">{appointment.patientId}</p>
                                </div>
                              </TableCell>
                              <TableCell>{appointment.doctor}</TableCell>
                              <TableCell>{appointment.department}</TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>{appointment.duration} min</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    appointment.status === "Confirmed"
                                      ? "default"
                                      : appointment.status === "Pending"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {appointment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`/appointments/${appointment.id}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </a>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-4">
                              No appointments scheduled for this date.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  {/* Similar content for other tabs */}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Patient Search</CardTitle>
              <CardDescription>Find and manage patient records</CardDescription>
            </CardHeader>
            <CardContent>
              <PatientSearch onSearch={handleSearch} />

              {searchQuery || Object.keys(searchFilters).length > 0 ? (
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Registration</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead>Primary Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={patient.avatar || "/placeholder.svg"} alt={patient.name} />
                                  <AvatarFallback>{patient.initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">{patient.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {patient.age} yrs • {patient.gender}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{patient.contact}</TableCell>
                            <TableCell>{patient.address}</TableCell>
                            <TableCell>{patient.registrationDate}</TableCell>
                            <TableCell>{patient.lastVisit}</TableCell>
                            <TableCell>{patient.primaryDoctor}</TableCell>
                            <TableCell>
                              <Badge
                                variant={patient.status === "Active" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {patient.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAddToQueue(patient.id, patient.name)}
                                >
                                  <ListPlus className="h-4 w-4" />
                                  <span className="sr-only">Add to queue</span>
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={`/patients/${patient.id}`}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View</span>
                                  </a>
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">More</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Edit Patient</DropdownMenuItem>
                                    <DropdownMenuItem>Schedule Appointment</DropdownMenuItem>
                                    <DropdownMenuItem>Print ID Card</DropdownMenuItem>
                                    <DropdownMenuItem>View Medical History</DropdownMenuItem>
                                    <DropdownMenuItem>View Billing History</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No patients found matching your search criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Enter search terms above to find patients</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedPatient && (
        <AddToQueueForm
          open={isQueueFormOpen}
          onOpenChange={setIsQueueFormOpen}
          patientId={selectedPatient}
          patientName={patients.find((p) => p.id === selectedPatient)?.name || ""}
        />
      )}

      <AddAppointmentForm open={addAppointmentOpen} onOpenChange={setAddAppointmentOpen} />
    </div>
  )
}
