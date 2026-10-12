"use client"

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
import { AlertCircle, CheckCircle, Download, Eye, FileText, MoreVertical, Printer, Share2 } from "lucide-react"

// Mock data for recent test results
const recentResults = [
  {
    id: "LAB-2023-001",
    patientName: "John Kamau",
    testName: "Complete Blood Count",
    completedAt: "2023-05-15T10:30:00",
    status: "Normal",
    reviewedBy: "Dr. Sarah Omondi",
  },
  {
    id: "LAB-2023-002",
    patientName: "Mary Wanjiku",
    testName: "Liver Function Test",
    completedAt: "2023-05-15T11:15:00",
    status: "Abnormal",
    reviewedBy: "Dr. David Mwangi",
  },
  {
    id: "LAB-2023-003",
    patientName: "James Ochieng",
    testName: "Urinalysis",
    completedAt: "2023-05-15T12:00:00",
    status: "Normal",
    reviewedBy: "Dr. Sarah Omondi",
  },
  {
    id: "LAB-2023-004",
    patientName: "Elizabeth Njeri",
    testName: "Blood Glucose",
    completedAt: "2023-05-15T12:30:00",
    status: "Critical",
    reviewedBy: "Dr. Michael Otieno",
  },
]

export function RecentTestResults() {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Test Results</CardTitle>
        <CardDescription>Latest completed laboratory tests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.id}</TableCell>
                  <TableCell>{result.patientName}</TableCell>
                  <TableCell>{result.testName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        result.status === "Normal"
                          ? "outline"
                          : result.status === "Abnormal"
                            ? "secondary"
                            : "destructive"
                      }
                      className={
                        result.status === "Normal"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : result.status === "Abnormal"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {result.status === "Normal" && <CheckCircle className="mr-1 h-3 w-3" />}
                      {result.status === "Abnormal" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {result.status === "Critical" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {result.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(result.completedAt).toLocaleTimeString([], {
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
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Results
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Results
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share with Doctor
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Add to Medical Record
                        </DropdownMenuItem>
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
