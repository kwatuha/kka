"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileWarning, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function PendingRecordCompletion() {
  // In a real application, this data would come from an API or database
  const [pendingRecords, setPendingRecords] = useState([
    {
      id: "REC-2023-1254",
      patientName: "James Mwangi",
      patientId: "P-78945",
      department: "Consultation",
      missingItems: ["Discharge Summary", "Medication List"],
      dueDate: "2023-11-15",
      priority: "high",
    },
    {
      id: "REC-2023-1242",
      patientName: "Aisha Kamau",
      patientId: "P-78123",
      department: "Laboratory",
      missingItems: ["Lab Results", "Physician Notes"],
      dueDate: "2023-11-16",
      priority: "medium",
    },
    {
      id: "REC-2023-1238",
      patientName: "Daniel Ochieng",
      patientId: "P-77456",
      department: "Radiology",
      missingItems: ["Radiology Report"],
      dueDate: "2023-11-17",
      priority: "medium",
    },
    {
      id: "REC-2023-1235",
      patientName: "Mercy Wanjiku",
      patientId: "P-76789",
      department: "Inpatient",
      missingItems: ["Progress Notes", "Nursing Notes", "Discharge Plan"],
      dueDate: "2023-11-14",
      priority: "high",
    },
    {
      id: "REC-2023-1230",
      patientName: "John Kariuki",
      patientId: "P-75432",
      department: "Pharmacy",
      missingItems: ["Medication Administration Record"],
      dueDate: "2023-11-18",
      priority: "low",
    },
  ])

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Medium</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-500" />
            <span>Pending Record Completion</span>
          </CardTitle>
          <CardDescription>Records requiring additional documentation</CardDescription>
        </div>
        <Button size="sm" variant="outline" className="h-8">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Missing Items</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.id}</TableCell>
                <TableCell>
                  {record.patientName}
                  <div className="text-xs text-muted-foreground">{record.patientId}</div>
                </TableCell>
                <TableCell>{record.department}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {record.missingItems.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{record.dueDate}</TableCell>
                <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Record</DropdownMenuItem>
                      <DropdownMenuItem>Update Record</DropdownMenuItem>
                      <DropdownMenuItem>Mark as Complete</DropdownMenuItem>
                      <DropdownMenuItem>Assign to Staff</DropdownMenuItem>
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
