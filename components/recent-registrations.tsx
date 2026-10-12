"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, ListPlus, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { AddToQueueForm } from "@/components/add-to-queue-form"

// Sample recent registrations data
const recentRegistrations = [
  {
    id: "P-1006",
    name: "Grace Wanjiku",
    age: 29,
    gender: "Female",
    contact: "+254 712 345 111",
    registrationDate: "2023-04-22",
    registrationTime: "09:15 AM",
    status: "Active",
    avatar: "/diverse-group-chatting.png",
    initials: "GW",
  },
  {
    id: "P-1007",
    name: "Peter Omondi",
    age: 42,
    gender: "Male",
    contact: "+254 723 456 222",
    registrationDate: "2023-04-22",
    registrationTime: "10:30 AM",
    status: "Active",
    avatar: "/thoughtful-portrait.png",
    initials: "PO",
  },
  {
    id: "P-1008",
    name: "Mary Achieng",
    age: 35,
    gender: "Female",
    contact: "+254 734 567 333",
    registrationDate: "2023-04-22",
    registrationTime: "11:45 AM",
    status: "Active",
    avatar: "/diverse-group-chatting.png",
    initials: "MA",
  },
  {
    id: "P-1009",
    name: "John Kamau",
    age: 50,
    gender: "Male",
    contact: "+254 745 678 444",
    registrationDate: "2023-04-22",
    registrationTime: "01:20 PM",
    status: "Active",
    avatar: "/thoughtful-portrait.png",
    initials: "JK",
  },
  {
    id: "P-1010",
    name: "Susan Njeri",
    age: 27,
    gender: "Female",
    contact: "+254 756 789 555",
    registrationDate: "2023-04-22",
    registrationTime: "02:35 PM",
    status: "Active",
    avatar: "/diverse-group-chatting.png",
    initials: "SN",
  },
]

export function RecentRegistrations() {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [isQueueFormOpen, setIsQueueFormOpen] = useState(false)

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Registration Time</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRegistrations.map((patient) => (
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
                <TableCell>{patient.registrationTime}</TableCell>
                <TableCell>{patient.contact}</TableCell>
                <TableCell>
                  <Badge variant={patient.status === "Active" ? "default" : "secondary"} className="capitalize">
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPatient(patient.id)
                        setIsQueueFormOpen(true)
                      }}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedPatient && (
        <AddToQueueForm
          open={isQueueFormOpen}
          onOpenChange={setIsQueueFormOpen}
          patientId={selectedPatient}
          patientName={recentRegistrations.find((p) => p.id === selectedPatient)?.name || ""}
        />
      )}
    </>
  )
}
