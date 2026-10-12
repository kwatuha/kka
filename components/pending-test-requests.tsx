"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { CheckCircle, Clock, Filter, MoreVertical, Search, VolumeIcon as Vial } from "lucide-react"

// Mock data for pending test requests
const pendingTests = [
  {
    id: "LAB-2023-001",
    patientId: "P-10045",
    patientName: "John Kamau",
    testName: "Complete Blood Count",
    requestedBy: "Dr. Sarah Omondi",
    priority: "Urgent",
    requestedAt: "2023-05-15T08:30:00",
    status: "Pending Collection",
  },
  {
    id: "LAB-2023-002",
    patientId: "P-10046",
    patientName: "Mary Wanjiku",
    testName: "Liver Function Test",
    requestedBy: "Dr. David Mwangi",
    priority: "Routine",
    requestedAt: "2023-05-15T09:15:00",
    status: "Sample Collected",
  },
  {
    id: "LAB-2023-003",
    patientId: "P-10047",
    patientName: "James Ochieng",
    testName: "Urinalysis",
    requestedBy: "Dr. Sarah Omondi",
    priority: "Routine",
    requestedAt: "2023-05-15T10:00:00",
    status: "In Progress",
  },
  {
    id: "LAB-2023-004",
    patientId: "P-10048",
    patientName: "Elizabeth Njeri",
    testName: "Blood Glucose",
    requestedBy: "Dr. Michael Otieno",
    priority: "Urgent",
    requestedAt: "2023-05-15T10:30:00",
    status: "Pending Collection",
  },
  {
    id: "LAB-2023-005",
    patientId: "P-10049",
    patientName: "Robert Kipchoge",
    testName: "Lipid Profile",
    requestedBy: "Dr. David Mwangi",
    priority: "Routine",
    requestedAt: "2023-05-15T11:00:00",
    status: "Sample Collected",
  },
]

export function PendingTestRequests() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter tests based on search query
  const filteredTests = pendingTests.filter(
    (test) =>
      test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.patientId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pending Test Requests</CardTitle>
          <CardDescription>Manage test requests and sample collection</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tests..."
              className="w-[200px] pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Priority: Urgent</DropdownMenuItem>
              <DropdownMenuItem>Priority: Routine</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Status: Pending Collection</DropdownMenuItem>
              <DropdownMenuItem>Status: Sample Collected</DropdownMenuItem>
              <DropdownMenuItem>Status: In Progress</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{test.patientName}</div>
                    <div className="text-xs text-muted-foreground">{test.patientId}</div>
                  </TableCell>
                  <TableCell>{test.testName}</TableCell>
                  <TableCell>
                    <Badge variant={test.priority === "Urgent" ? "destructive" : "outline"}>{test.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        test.status === "Pending Collection"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : test.status === "Sample Collected"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-green-50 text-green-700 border-green-200"
                      }
                    >
                      {test.status === "Pending Collection" && <Clock className="mr-1 h-3 w-3" />}
                      {test.status === "Sample Collected" && <Vial className="mr-1 h-3 w-3" />}
                      {test.status === "In Progress" && <CheckCircle className="mr-1 h-3 w-3" />}
                      {test.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(test.requestedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Collect Sample</DropdownMenuItem>
                        <DropdownMenuItem>Record Results</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Print Label</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
