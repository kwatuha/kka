"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { FileImage, MoreVertical, Search, Filter, CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react"

export function PendingImagingRequests() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  // In a real application, this data would come from an API
  const imagingRequests = [
    {
      id: "IMG-2023-001",
      patientName: "James Mwangi",
      patientId: "P-20230415-001",
      requestedBy: "Dr. Sarah Kimani",
      type: "X-Ray",
      bodyPart: "Chest",
      priority: "Urgent",
      status: "Scheduled",
      scheduledTime: "Today, 11:30 AM",
    },
    {
      id: "IMG-2023-002",
      patientName: "Aisha Omar",
      patientId: "P-20230416-003",
      requestedBy: "Dr. John Omondi",
      type: "CT Scan",
      bodyPart: "Head",
      priority: "Routine",
      status: "Waiting",
      scheduledTime: "Today, 2:15 PM",
    },
    {
      id: "IMG-2023-003",
      patientName: "Daniel Kipchoge",
      patientId: "P-20230417-002",
      requestedBy: "Dr. Elizabeth Wanjiku",
      type: "Ultrasound",
      bodyPart: "Abdomen",
      priority: "Urgent",
      status: "In Progress",
      scheduledTime: "Now",
    },
    {
      id: "IMG-2023-004",
      patientName: "Grace Njeri",
      patientId: "P-20230417-005",
      requestedBy: "Dr. Michael Otieno",
      type: "MRI",
      bodyPart: "Knee",
      priority: "Routine",
      status: "Scheduled",
      scheduledTime: "Today, 4:00 PM",
    },
    {
      id: "IMG-2023-005",
      patientName: "Peter Kamau",
      patientId: "P-20230418-001",
      requestedBy: "Dr. Sarah Kimani",
      type: "X-Ray",
      bodyPart: "Wrist",
      priority: "Routine",
      status: "Waiting",
      scheduledTime: "Tomorrow, 9:30 AM",
    },
  ]

  const filteredRequests = imagingRequests.filter((request) => {
    const matchesSearch =
      request.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterStatus === "all" || request.status.toLowerCase() === filterStatus.toLowerCase()

    return matchesSearch && matchesFilter
  })

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Urgent</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">High</Badge>
      case "routine":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Routine</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "waiting":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "in progress":
        return <Activity className="h-4 w-4 text-purple-500" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <Card className="col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Pending Imaging Requests</CardTitle>
            <CardDescription>Manage and process imaging requests</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search requests..."
                className="w-[200px] pl-8 md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filter Status</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`/abstract-geometric-shapes.png?key=6x77d&height=32&width=32&query=${request.patientName}`}
                        alt={request.patientName}
                      />
                      <AvatarFallback>
                        {request.patientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{request.patientName}</span>
                      <span className="text-xs text-muted-foreground">{request.patientId}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span>{request.type}</span>
                  </div>
                </TableCell>
                <TableCell>{request.bodyPart}</TableCell>
                <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <span>{request.status}</span>
                  </div>
                </TableCell>
                <TableCell>{request.scheduledTime}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Update Status</DropdownMenuItem>
                      <DropdownMenuItem>Record Results</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Patient</DropdownMenuItem>
                      <DropdownMenuItem>Contact Requesting Doctor</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
