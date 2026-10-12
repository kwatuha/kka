"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bell, ChevronRight, Clock, Filter, Plus, Search, UserPlus, Volume2 } from "lucide-react"

// Types
type QueueStatus = "waiting" | "called" | "serving" | "completed" | "no-show" | "rescheduled"
type ServiceType = "registration" | "consultation" | "laboratory" | "pharmacy" | "radiology" | "billing"
type Priority = "normal" | "urgent" | "emergency"

interface QueueItem {
  id: string
  ticketNumber: string
  patientId: string
  patientName: string
  patientAvatar?: string
  patientInitials: string
  serviceType: ServiceType
  priority: Priority
  status: QueueStatus
  waitTime: number // in minutes
  checkInTime: string
  notes?: string
}

// Sample data
const queueData: QueueItem[] = [
  {
    id: "Q1001",
    ticketNumber: "R-001",
    patientId: "P-78945",
    patientName: "James Mwangi",
    patientInitials: "JM",
    serviceType: "registration",
    priority: "normal",
    status: "waiting",
    waitTime: 12,
    checkInTime: "08:45 AM",
  },
  {
    id: "Q1002",
    ticketNumber: "R-002",
    patientId: "P-78123",
    patientName: "Aisha Kamau",
    patientAvatar: "/diverse-group-chatting.png",
    patientInitials: "AK",
    serviceType: "registration",
    priority: "urgent",
    status: "called",
    waitTime: 5,
    checkInTime: "09:10 AM",
    notes: "First-time patient, needs full registration",
  },
  {
    id: "Q1003",
    ticketNumber: "R-003",
    patientId: "P-77456",
    patientName: "Daniel Ochieng",
    patientInitials: "DO",
    serviceType: "registration",
    priority: "normal",
    status: "waiting",
    waitTime: 8,
    checkInTime: "09:15 AM",
  },
  {
    id: "Q1004",
    ticketNumber: "R-004",
    patientId: "P-76789",
    patientName: "Mercy Wanjiku",
    patientAvatar: "/diverse-group-chatting.png",
    patientInitials: "MW",
    serviceType: "registration",
    priority: "emergency",
    status: "serving",
    waitTime: 0,
    checkInTime: "09:20 AM",
    notes: "Emergency case, expedite registration",
  },
  {
    id: "Q1005",
    ticketNumber: "R-005",
    patientId: "P-75432",
    patientName: "John Kariuki",
    patientInitials: "JK",
    serviceType: "registration",
    priority: "normal",
    status: "waiting",
    waitTime: 4,
    checkInTime: "09:25 AM",
  },
  {
    id: "Q1006",
    ticketNumber: "R-006",
    patientId: "P-74321",
    patientName: "Grace Njeri",
    patientAvatar: "/diverse-group-chatting.png",
    patientInitials: "GN",
    serviceType: "registration",
    priority: "normal",
    status: "waiting",
    waitTime: 2,
    checkInTime: "09:30 AM",
  },
  {
    id: "Q1007",
    ticketNumber: "R-007",
    patientId: "P-73210",
    patientName: "Peter Mwangi",
    patientInitials: "PM",
    serviceType: "registration",
    priority: "normal",
    status: "completed",
    waitTime: 0,
    checkInTime: "08:30 AM",
    notes: "Registration completed at 08:45 AM",
  },
  {
    id: "Q1008",
    ticketNumber: "R-008",
    patientId: "P-72109",
    patientName: "Faith Wambui",
    patientAvatar: "/diverse-group-chatting.png",
    patientInitials: "FW",
    serviceType: "registration",
    priority: "normal",
    status: "no-show",
    waitTime: 0,
    checkInTime: "08:15 AM",
    notes: "Patient did not respond to call after 3 attempts",
  },
]

export function EnhancedQueueManagement() {
  const [queue, setQueue] = useState<QueueItem[]>(queueData)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newTicket, setNewTicket] = useState({
    patientId: "",
    patientName: "",
    serviceType: "registration" as ServiceType,
    priority: "normal" as Priority,
    notes: "",
  })

  // Filter queue based on search query and filters
  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  // Get counts for different statuses
  const waitingCount = queue.filter((item) => item.status === "waiting").length
  const calledCount = queue.filter((item) => item.status === "called").length
  const servingCount = queue.filter((item) => item.status === "serving").length
  const completedCount = queue.filter((item) => item.status === "completed").length

  // Get the next patient to be called
  const nextPatient = queue.find((item) => item.status === "waiting")

  // Handle calling the next patient
  const handleCallNext = () => {
    if (nextPatient) {
      setQueue(queue.map((item) => (item.id === nextPatient.id ? { ...item, status: "called" } : item)))
      // In a real application, this would trigger a notification or display update
      console.log(`Called patient: ${nextPatient.patientName}, Ticket: ${nextPatient.ticketNumber}`)
    }
  }

  // Handle adding a new patient to the queue
  const handleAddToQueue = () => {
    const newQueueItem: QueueItem = {
      id: `Q${Math.floor(1000 + Math.random() * 9000)}`,
      ticketNumber: `R-${String(queue.length + 1).padStart(3, "0")}`,
      patientId: newTicket.patientId,
      patientName: newTicket.patientName,
      patientInitials: newTicket.patientName
        .split(" ")
        .map((n) => n[0])
        .join(""),
      serviceType: newTicket.serviceType,
      priority: newTicket.priority,
      status: "waiting",
      waitTime: 0,
      checkInTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      notes: newTicket.notes,
    }

    setQueue([...queue, newQueueItem])
    setIsAddDialogOpen(false)
    setNewTicket({
      patientId: "",
      patientName: "",
      serviceType: "registration",
      priority: "normal",
      notes: "",
    })
  }

  // Handle updating a patient's status
  const handleUpdateStatus = (id: string, newStatus: QueueStatus) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: newStatus } : item)))
  }

  // Get badge color based on status
  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case "waiting":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
            Waiting
          </Badge>
        )
      case "called":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-800">
            Called
          </Badge>
        )
      case "serving":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-800">
            Serving
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-800">
            Completed
          </Badge>
        )
      case "no-show":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-800">
            No Show
          </Badge>
        )
      case "rescheduled":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-800">
            Rescheduled
          </Badge>
        )
    }
  }

  // Get badge color based on priority
  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case "normal":
        return <Badge variant="outline">Normal</Badge>
      case "urgent":
        return (
          <Badge variant="default" className="bg-orange-600">
            Urgent
          </Badge>
        )
      case "emergency":
        return <Badge variant="destructive">Emergency</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Queue Management</CardTitle>
        <CardDescription>Manage patient registration queue</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Queue</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="display">Queue Display</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Queue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Patient to Queue</DialogTitle>
                    <DialogDescription>Enter patient details to add them to the registration queue.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="patientId" className="text-right">
                        Patient ID
                      </Label>
                      <Input
                        id="patientId"
                        value={newTicket.patientId}
                        onChange={(e) => setNewTicket({ ...newTicket, patientId: e.target.value })}
                        className="col-span-3"
                        placeholder="P-12345"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="patientName" className="text-right">
                        Patient Name
                      </Label>
                      <Input
                        id="patientName"
                        value={newTicket.patientName}
                        onChange={(e) => setNewTicket({ ...newTicket, patientName: e.target.value })}
                        className="col-span-3"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">
                        Priority
                      </Label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(value: Priority) => setNewTicket({ ...newTicket, priority: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes" className="text-right">
                        Notes
                      </Label>
                      <Input
                        id="notes"
                        value={newTicket.notes}
                        onChange={(e) => setNewTicket({ ...newTicket, notes: e.target.value })}
                        className="col-span-3"
                        placeholder="Any special instructions"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddToQueue}>Add to Queue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleCallNext}>
                <Bell className="mr-2 h-4 w-4" />
                Call Next
              </Button>
            </div>
          </div>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Waiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{waitingCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Called</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{calledCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Serving</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{servingCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or ticket number..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as QueueStatus | "all")}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="called">Called</SelectItem>
                  <SelectItem value="serving">Serving</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as Priority | "all")}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.filter((item) => item.status !== "completed" && item.status !== "no-show").length >
                  0 ? (
                    filteredQueue
                      .filter((item) => item.status !== "completed" && item.status !== "no-show")
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.ticketNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.patientAvatar || "/placeholder.svg"} alt={item.patientName} />
                                <AvatarFallback>{item.patientInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{item.patientName}</div>
                                <div className="text-xs text-muted-foreground">{item.patientId}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.checkInTime}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{item.waitTime} min</span>
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.status === "waiting" && (
                                <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(item.id, "called")}>
                                  <Bell className="h-4 w-4" />
                                  <span className="sr-only">Call</span>
                                </Button>
                              )}
                              {item.status === "called" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(item.id, "serving")}
                                >
                                  <UserPlus className="h-4 w-4" />
                                  <span className="sr-only">Serve</span>
                                </Button>
                              )}
                              {item.status === "serving" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(item.id, "completed")}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                  <span className="sr-only">Complete</span>
                                </Button>
                              )}
                              {(item.status === "waiting" || item.status === "called") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(item.id, "no-show")}
                                >
                                  <span className="sr-only">No Show</span>
                                  No Show
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No active queue items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQueue.filter((item) => item.status === "completed" || item.status === "no-show").length >
                  0 ? (
                    filteredQueue
                      .filter((item) => item.status === "completed" || item.status === "no-show")
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.ticketNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.patientAvatar || "/placeholder.svg"} alt={item.patientName} />
                                <AvatarFallback>{item.patientInitials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{item.patientName}</div>
                                <div className="text-xs text-muted-foreground">{item.patientId}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.checkInTime}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">{item.notes || "No notes"}</div>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No completed queue items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Now Serving</CardTitle>
                  <CardDescription>Currently serving patients</CardDescription>
                </CardHeader>
                <CardContent>
                  {queue.filter((item) => item.status === "serving").length > 0 ? (
                    <div className="space-y-4">
                      {queue
                        .filter((item) => item.status === "serving")
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                {item.ticketNumber}
                              </div>
                              <div>
                                <div className="font-medium">{item.patientName}</div>
                                <div className="text-sm text-muted-foreground">{item.patientId}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-5 w-5 text-muted-foreground" />
                              <span>Counter 1</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-muted-foreground">
                      No patients currently being served
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next in Queue</CardTitle>
                  <CardDescription>Patients who have been called</CardDescription>
                </CardHeader>
                <CardContent>
                  {queue.filter((item) => item.status === "called").length > 0 ? (
                    <div className="space-y-4">
                      {queue
                        .filter((item) => item.status === "called")
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                                {item.ticketNumber}
                              </div>
                              <div>
                                <div className="font-medium">{item.patientName}</div>
                                <div className="text-sm text-muted-foreground">{item.patientId}</div>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-800">
                              Called
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-muted-foreground">
                      No patients currently called
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Waiting List</CardTitle>
                <CardDescription>Patients waiting to be called</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {queue.filter((item) => item.status === "waiting").length > 0 ? (
                    queue
                      .filter((item) => item.status === "waiting")
                      .map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg border p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            {item.ticketNumber}
                          </div>
                          <div className="truncate">
                            <div className="truncate text-sm font-medium">{item.patientName}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{item.waitTime} min</span>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="col-span-full flex h-24 items-center justify-center text-muted-foreground">
                      No patients currently waiting
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh Queue
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
