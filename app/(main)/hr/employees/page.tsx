"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Search, Download, UserPlus, Edit, Trash2, Eye, Loader2, Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, ArrowUp, ArrowDown, ArrowRight, User, Filter, Ban } from "lucide-react"
import Link from "next/link"
import { employeeApi, payrollApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { EmployeeForm } from "@/components/employee-form"
import { LeaveForm } from "@/components/leave-form"
import { SalaryForm } from "@/components/salary-form"
import { PromotionForm } from "@/components/promotion-form"
import { PayrollForm } from "@/components/payroll-form"
import { AttendanceForm } from "@/components/attendance-form"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate, formatDateLong, formatTime } from "@/lib/date-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EmployeesPage() {
  const [mainTab, setMainTab] = useState("directory")
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewEmployee, setViewEmployee] = useState<any>(null)
  const [viewTab, setViewTab] = useState("overview")
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([])
  const [employeeLeaveBalances, setEmployeeLeaveBalances] = useState<any[]>([])
  const [employeeSalaries, setEmployeeSalaries] = useState<any[]>([])
  const [employeePayrolls, setEmployeePayrolls] = useState<any[]>([])
  const [employeePromotions, setEmployeePromotions] = useState<any[]>([])
  const [employeeAttendances, setEmployeeAttendances] = useState<any[]>([])
  const [viewDataLoading, setViewDataLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null)
  
  // Leave management state
  const [leaves, setLeaves] = useState<any[]>([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leaveFormOpen, setLeaveFormOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<any>(null)
  const [leaveEmployeeId, setLeaveEmployeeId] = useState<string>("")
  const [leaveDeleteDialogOpen, setLeaveDeleteDialogOpen] = useState(false)
  const [leaveToDelete, setLeaveToDelete] = useState<any>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [leaveToReject, setLeaveToReject] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  
  // Payroll state
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [payrollsLoading, setPayrollsLoading] = useState(false)
  const [salaryFormOpen, setSalaryFormOpen] = useState(false)
  const [selectedSalary, setSelectedSalary] = useState<any>(null)
  const [salaryEmployeeId, setSalaryEmployeeId] = useState<string>("")
  
  // Promotions state
  const [promotions, setPromotions] = useState<any[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [promotionFormOpen, setPromotionFormOpen] = useState(false)
  const [promotionEmployeeId, setPromotionEmployeeId] = useState<string>("")
  const [promotionFilter, setPromotionFilter] = useState<string>("all") // "all" or employeeId
  
  // Payroll state
  const [payrollFormOpen, setPayrollFormOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [payrollEmployeeId, setPayrollEmployeeId] = useState<string>("")
  
  // Attendance state
  const [attendances, setAttendances] = useState<any[]>([])
  const [attendancesLoading, setAttendancesLoading] = useState(false)
  const [attendanceFormOpen, setAttendanceFormOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null)
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState<string>("")

  useEffect(() => {
    loadEmployees()
  }, [searchTerm, selectedTab])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      // Don't pass category names as departmentId - only pass numeric IDs
      // Category filtering will be done client-side
      const response = await employeeApi.getAll(searchTerm || undefined, undefined)
      setEmployees(response.employees || [])
    } catch (error: any) {
      console.error("Error loading employees:", error)
      toast({
        title: "Error",
        description: "Failed to load employees.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedEmployee(null)
    setFormOpen(true)
  }

  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee)
    setFormOpen(true)
  }

  const handleView = async (employee: any) => {
    try {
      const fullEmployee = await employeeApi.getById(employee.employeeId.toString())
      setViewEmployee(fullEmployee)
      setViewTab("overview")
      setViewDialogOpen(true)
      // Load all related data for 360-degree view
      loadEmployee360Data(employee.employeeId.toString())
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load employee details.",
        variant: "destructive",
      })
    }
  }

  const loadEmployee360Data = async (employeeId: string) => {
    try {
      setViewDataLoading(true)
      
      // Load all data in parallel
      const [leavesData, salariesData, payrollsData, promotionsData, attendancesData, leaveBalancesData] = await Promise.all([
        employeeApi.getLeave(employeeId).catch(() => []),
        employeeApi.getSalaryHistory(employeeId).catch(() => []),
        employeeApi.getPayroll(employeeId).catch(() => []),
        employeeApi.getPromotions(employeeId).catch(() => []),
        employeeApi.getAttendance(employeeId).catch(() => []),
        employeeApi.getLeaveBalance(employeeId).catch(() => [])
      ])

      setEmployeeLeaves(Array.isArray(leavesData) ? leavesData : [])
      setEmployeeSalaries(Array.isArray(salariesData) ? salariesData : [])
      setEmployeePayrolls(Array.isArray(payrollsData) ? payrollsData : [])
      setEmployeePromotions(Array.isArray(promotionsData) ? promotionsData : [])
      setEmployeeAttendances(Array.isArray(attendancesData) ? attendancesData : [])
      setEmployeeLeaveBalances(Array.isArray(leaveBalancesData) ? leaveBalancesData : [])
    } catch (error: any) {
      console.error("Error loading employee 360 data:", error)
    } finally {
      setViewDataLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!employeeToDelete) return

    try {
      await employeeApi.delete(employeeToDelete.employeeId.toString())
      toast({
        title: "Success",
        description: "Employee terminated successfully.",
      })
      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)
      loadEmployees()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to terminate employee.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      active: { variant: "default", label: "Active" },
      on_leave: { variant: "secondary", label: "On Leave" },
      terminated: { variant: "destructive", label: "Terminated" },
      resigned: { variant: "outline", label: "Resigned" },
    }

    const statusInfo = statusMap[status] || { variant: "outline" as const, label: status }
    return (
      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
    )
  }

  const filteredEmployees = employees.filter((emp) => {
    if (selectedTab === "all") return true
    const deptName = emp.departmentName?.toLowerCase() || ""
    
    // Medical category: Medical, Consultation, Nursing, Laboratory, Pharmacy, Radiology, ICU, Maternity
    if (selectedTab === "medical") {
      return deptName.includes("medical") || 
             deptName.includes("consultation") || 
             deptName.includes("nursing") || 
             deptName.includes("laboratory") || 
             deptName.includes("lab") ||
             deptName.includes("pharmacy") || 
             deptName.includes("radiology") || 
             deptName.includes("icu") || 
             deptName.includes("maternity")
    }
    
    // Administrative category: Administration, Finance, Human Resources, Medical Records
    if (selectedTab === "admin") {
      return deptName.includes("admin") || 
             deptName.includes("administration") ||
             deptName.includes("finance") || 
             deptName.includes("human resources") ||
             deptName.includes("hr ") ||
             deptName === "hr" ||
             deptName.includes("medical records") ||
             deptName.includes("records")
    }
    
    // Support category: IT, Procurement, Registration, Information Technology
    if (selectedTab === "support") {
      return deptName.includes("it") || 
             deptName.includes("information technology") ||
             deptName.includes("procurement") || 
             deptName.includes("registration") ||
             deptName.includes("support")
    }
    
    return true
  })

  // Load leaves
  const loadLeaves = async () => {
    try {
      setLeavesLoading(true)
      const response = await employeeApi.getAllLeave()
      setLeaves(response.leaves || [])
    } catch (error: any) {
      console.error("Error loading leaves:", error)
      toast({
        title: "Error",
        description: "Failed to load leave records.",
        variant: "destructive",
      })
    } finally {
      setLeavesLoading(false)
    }
  }

  // Load payrolls
  const loadPayrolls = async (employeeId?: string) => {
    try {
      setPayrollsLoading(true)
      if (employeeId) {
        const data = await employeeApi.getPayroll(employeeId)
        setPayrolls(data || [])
      } else {
        const data = await payrollApi.listTransactions({ limit: 100 })
        setPayrolls(data.transactions || [])
      }
    } catch (error: any) {
      console.error("Error loading payrolls:", error)
      setPayrolls([])
    } finally {
      setPayrollsLoading(false)
    }
  }
  
  // Load attendances
  const loadAttendances = async (employeeId?: string) => {
    try {
      setAttendancesLoading(true)
      if (employeeId) {
        const data = await employeeApi.getAttendance(employeeId)
        setAttendances(data || [])
      } else {
        // Load attendances for all employees
        const allAttendances: any[] = []
        for (let i = 0; i < Math.min(employees.length, 5); i++) {
          try {
            const empAttendances = await employeeApi.getAttendance(employees[i].employeeId.toString())
            allAttendances.push(...(empAttendances || []))
          } catch (e) {
            // Skip if error
          }
        }
        setAttendances(allAttendances.sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime()))
      }
    } catch (error: any) {
      console.error("Error loading attendances:", error)
      setAttendances([])
    } finally {
      setAttendancesLoading(false)
    }
  }

  // Load promotions
  const loadPromotions = async (employeeId?: string) => {
    try {
      setPromotionsLoading(true)
      if (employeeId) {
        const data = await employeeApi.getPromotions(employeeId)
        setPromotions(data || [])
      } else {
        // Load promotions for all employees (aggregate from all employees)
        const allPromotions: any[] = []
        if (employees.length > 0) {
          for (let i = 0; i < employees.length; i++) {
            try {
              const empPromotions = await employeeApi.getPromotions(employees[i].employeeId.toString())
              if (empPromotions && Array.isArray(empPromotions)) {
                allPromotions.push(...empPromotions)
              }
            } catch (e) {
              console.error(`Error loading promotions for employee ${employees[i].employeeId}:`, e)
              // Skip if error
            }
          }
          // Sort by effective date descending (use historyId as tiebreaker for stability)
          const sorted = allPromotions.sort((a, b) => {
            const dateA = new Date(a.effectiveDate).getTime()
            const dateB = new Date(b.effectiveDate).getTime()
            if (dateB !== dateA) {
              return dateB - dateA
            }
            // If dates are equal, sort by historyId for consistent ordering
            return (b.historyId || 0) - (a.historyId || 0)
          })
          setPromotions(sorted)
          console.log("Loaded promotions:", sorted.length, "records")
        } else {
          setPromotions([])
        }
      }
    } catch (error: any) {
      console.error("Error loading promotions:", error)
      setPromotions([])
    } finally {
      setPromotionsLoading(false)
    }
  }

  useEffect(() => {
    if (mainTab === "leave") {
      loadLeaves()
    } else if (mainTab === "payroll") {
      loadPayrolls()
    } else if (mainTab === "promotions") {
      // Load promotions when tab is opened
      loadPromotions()
    } else if (mainTab === "attendance") {
      loadAttendances()
    }
  }, [mainTab, employees.length])

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await employeeApi.updateLeave(leaveId, { status: "approved", approvedBy: 1 })
      toast({ title: "Success", description: "Leave approved." })
      loadLeaves()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleRejectLeave = async (leaveId: string, reason?: string) => {
    try {
      await employeeApi.updateLeave(leaveId, { 
        status: "rejected", 
        approvedBy: 1,
        rejectionReason: reason || "No reason provided"
      })
      toast({ title: "Success", description: "Leave rejected." })
      setRejectDialogOpen(false)
      setLeaveToReject(null)
      setRejectionReason("")
      loadLeaves()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleCancelLeave = async (leaveId: string) => {
    try {
      await employeeApi.updateLeave(leaveId, { status: "cancelled" })
      toast({ title: "Success", description: "Leave cancelled." })
      loadLeaves()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteLeave = async () => {
    if (!leaveToDelete) return
    try {
      await employeeApi.deleteLeave(leaveToDelete.leaveId.toString())
      toast({ title: "Success", description: "Leave record deleted." })
      setLeaveDeleteDialogOpen(false)
      setLeaveToDelete(null)
      loadLeaves()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete leave.", variant: "destructive" })
    }
  }

  const handleEditLeave = (leave: any) => {
    setSelectedLeave(leave)
    setLeaveEmployeeId(leave.employeeId.toString())
    setLeaveFormOpen(true)
  }

  const handleViewLeave = (leave: any) => {
    setSelectedLeave(leave)
    // Could open a view dialog or scroll to details
    toast({ 
      title: "Leave Details", 
      description: `${leave.leaveType} leave from ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} - ${leave.daysRequested} days` 
    })
  }

  const openRejectDialog = (leave: any) => {
    setLeaveToReject(leave)
    setRejectionReason("")
    setRejectDialogOpen(true)
  }

  const handleProcessPayroll = async (payrollId: string, status: string) => {
    try {
      await employeeApi.updatePayroll(payrollId, { paymentStatus: status, processedBy: 1 })
      toast({ title: "Success", description: `Payroll marked as ${status}.` })
      loadPayrolls()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const getLeaveStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      cancelled: { variant: "secondary", label: "Cancelled" },
    }
    const statusInfo = statusMap[status] || { variant: "outline" as const, label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">Comprehensive HR management system</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href="/hr/payroll">Payroll desk</Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {mainTab === "directory" && (
            <Button onClick={handleAdd}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>View and manage hospital staff</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all">All Staff</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
                <TabsTrigger value="admin">Administrative</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
              </TabsList>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search employees..."
                  className="w-full pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value={selectedTab} className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No employees found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.employeeId}>
                          <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                          <TableCell>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</TableCell>
                          <TableCell>{employee.departmentName || "—"}</TableCell>
                          <TableCell>{employee.positionTitle || "—"}</TableCell>
                          <TableCell>
                            {formatDate(employee.hireDate)}
                          </TableCell>
                          <TableCell>{getStatusBadge(employee.status)}</TableCell>
                          <TableCell>{employee.phone || employee.email || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedEmployee(employee)
                                  handleView(employee)
                                }}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedEmployee(employee)
                                  handleEdit(employee)
                                }}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEmployeeToDelete(employee)
                                  setDeleteDialogOpen(true)
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave Management</CardTitle>
                  <CardDescription>Manage employee leave requests and approvals</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedEmployee?.employeeId?.toString() || ""}
                    onValueChange={(value) => {
                      const emp = employees.find((e: any) => e.employeeId.toString() === value)
                      setSelectedEmployee(emp || null)
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => {
                    if (selectedEmployee) {
                      setLeaveEmployeeId(selectedEmployee.employeeId.toString())
                      setLeaveFormOpen(true)
                    } else {
                      toast({ title: "Info", description: "Please select an employee first." })
                    }
                  }}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Request Leave
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leavesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : leaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No leave records found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.leaveId}>
                          <TableCell>{leave.employeeName || leave.employeeNumber}</TableCell>
                          <TableCell className="capitalize">{leave.leaveType}</TableCell>
                          <TableCell>{formatDate(leave.startDate)}</TableCell>
                          <TableCell>{formatDate(leave.endDate)}</TableCell>
                          <TableCell>{leave.daysRequested}</TableCell>
                          <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewLeave(leave)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {(leave.status === "pending" || leave.status === "cancelled") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLeave(leave)}
                                  title="Edit Leave"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {leave.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleApproveLeave(leave.leaveId.toString())}
                                    title="Approve Leave"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openRejectDialog(leave)}
                                    title="Reject Leave"
                                  >
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelLeave(leave.leaveId.toString())}
                                    title="Cancel Leave"
                                  >
                                    <Ban className="h-4 w-4 text-orange-600" />
                                  </Button>
                                </>
                              )}
                              
                              {leave.status === "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelLeave(leave.leaveId.toString())}
                                  title="Cancel Leave"
                                >
                                  <Ban className="h-4 w-4 text-orange-600" />
                                </Button>
                              )}
                              
                              {(leave.status === "cancelled" || leave.status === "rejected") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setLeaveToDelete(leave)
                                    setLeaveDeleteDialogOpen(true)
                                  }}
                                  title="Delete Leave"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Management</CardTitle>
                  <CardDescription>
                    Per-employee payroll entries. For month-end batch, register, and bank export, use{" "}
                    <Link href="/hr/payroll" className="text-primary underline-offset-2 hover:underline">
                      Payroll desk
                    </Link>
                    .
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" asChild>
                    <Link href="/hr/payroll">Payroll desk</Link>
                  </Button>
                  <Select
                    value={selectedEmployee?.employeeId?.toString() || ""}
                    onValueChange={(value) => {
                      const emp = employees.find((e: any) => e.employeeId.toString() === value)
                      setSelectedEmployee(emp || null)
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => {
                    if (selectedEmployee) {
                      setSalaryEmployeeId(selectedEmployee.employeeId.toString())
                      setSalaryFormOpen(true)
                    } else {
                      toast({ title: "Info", description: "Please select an employee first." })
                    }
                  }}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Set Salary
                  </Button>
                  <Button onClick={() => {
                    if (selectedEmployee) {
                      setPayrollEmployeeId(selectedEmployee.employeeId.toString())
                      setSelectedPayroll(null)
                      setPayrollFormOpen(true)
                    } else {
                      toast({ title: "Info", description: "Please select an employee first." })
                    }
                  }}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Create Payroll
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payrollsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payrolls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No payroll records found</p>
                  <p className="text-xs text-muted-foreground mt-1">Select an employee and create a payroll transaction</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payroll #</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map((payroll) => (
                        <TableRow key={payroll.payrollId}>
                          <TableCell className="font-medium">{payroll.payrollNumber}</TableCell>
                          <TableCell>{payroll.employeeName || payroll.employeeNumber}</TableCell>
                          <TableCell>
                            {formatDate(payroll.payPeriodStart)} - {formatDate(payroll.payPeriodEnd)}
                          </TableCell>
                          <TableCell>KES {parseFloat(payroll.grossSalary).toLocaleString()}</TableCell>
                          <TableCell>KES {(
                            parseFloat(payroll.deductions || 0) + 
                            parseFloat(payroll.tax || 0) + 
                            parseFloat(payroll.nhif || 0) + 
                            parseFloat(payroll.nssf || 0) + 
                            parseFloat(payroll.otherDeductions || 0)
                          ).toLocaleString()}</TableCell>
                          <TableCell className="font-medium">KES {parseFloat(payroll.netSalary).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={payroll.paymentStatus === "paid" ? "default" : payroll.paymentStatus === "pending" ? "outline" : "secondary"}>
                              {payroll.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {payroll.paymentStatus === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleProcessPayroll(payroll.payrollId.toString(), "paid")}
                                  className="text-green-600"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPayrollEmployeeId(payroll.employeeId.toString())
                                  setSelectedPayroll(payroll)
                                  setPayrollFormOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Position History & Promotions</CardTitle>
                  <CardDescription>Track employee promotions, transfers, and position changes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedEmployee?.employeeId?.toString() || ""}
                    onValueChange={(value) => {
                      const emp = employees.find((e: any) => e.employeeId.toString() === value)
                      setSelectedEmployee(emp || null)
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => {
                    if (selectedEmployee) {
                      setPromotionEmployeeId(selectedEmployee.employeeId.toString())
                      setPromotionFormOpen(true)
                    } else {
                      toast({ title: "Info", description: "Please select an employee first." })
                    }
                  }}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Record Change
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {promotionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : promotions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No position history found</p>
                  <p className="text-xs text-muted-foreground mt-1">Select an employee to view their position history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Employee Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={promotionFilter} onValueChange={setPromotionFilter}>
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Filter by employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                            {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group promotions by employee */}
                  {(() => {
                    // Group promotions by employee
                    const groupedPromotions: Record<number, any[]> = {}
                    promotions.forEach((promo) => {
                      if (promotionFilter === "all" || promo.employeeId.toString() === promotionFilter) {
                        if (!groupedPromotions[promo.employeeId]) {
                          groupedPromotions[promo.employeeId] = []
                        }
                        groupedPromotions[promo.employeeId].push(promo)
                      }
                    })

                    // Sort each employee's promotions by date (newest first, use historyId as tiebreaker)
                    Object.keys(groupedPromotions).forEach((empId) => {
                      groupedPromotions[parseInt(empId)].sort((a, b) => {
                        const dateA = new Date(a.effectiveDate).getTime()
                        const dateB = new Date(b.effectiveDate).getTime()
                        if (dateB !== dateA) {
                          return dateB - dateA
                        }
                        // If dates are equal, sort by historyId for consistent ordering
                        return (b.historyId || 0) - (a.historyId || 0)
                      })
                    })

                    const employeeIds = Object.keys(groupedPromotions).map(Number).sort((a, b) => {
                      const empA = employees.find((e: any) => e.employeeId === a)
                      const empB = employees.find((e: any) => e.employeeId === b)
                      const nameA = empA ? `${empA.firstName} ${empA.lastName}` : ""
                      const nameB = empB ? `${empB.firstName} ${empB.lastName}` : ""
                      return nameA.localeCompare(nameB)
                    })

                    if (employeeIds.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-sm text-muted-foreground">No position history found for selected filter</p>
                        </div>
                      )
                    }

                    return (
                      <Accordion type="single" collapsible className="w-full">
                        {employeeIds.map((empId) => {
                          const employee = employees.find((e: any) => e.employeeId === empId)
                          const employeeName = employee 
                            ? `${employee.firstName} ${employee.lastName}` 
                            : `Employee ${empId}`
                          const employeeNumber = employee?.employeeNumber || `EMP-${empId}`
                          const empPromotions = groupedPromotions[empId]
                          const latestPromo = empPromotions[0]
                          const currentPosition = latestPromo?.newPositionTitle || employee?.positionTitle || "—"
                          const currentDepartment = latestPromo?.newDepartmentName || employee?.departmentName || "—"
                          const totalChanges = empPromotions.length
                          const promotionsCount = empPromotions.filter((p: any) => p.changeType === "promotion").length

                          return (
                            <AccordionItem key={empId} value={`employee-${empId}`}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                                      <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="text-left">
                                      <div className="font-semibold">{employeeName}</div>
                                      <div className="text-sm text-muted-foreground">{employeeNumber}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                      <div className="text-muted-foreground">Current Position</div>
                                      <div className="font-medium">{currentPosition}</div>
                                      <div className="text-xs text-muted-foreground">{currentDepartment}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-muted-foreground">Total Changes</div>
                                      <div className="font-medium">{totalChanges}</div>
                                      {promotionsCount > 0 && (
                                        <div className="text-xs text-green-600">({promotionsCount} promotion{promotionsCount > 1 ? 's' : ''})</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pt-4 space-y-4">
                                  {/* Timeline View */}
                                  <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                                    <div className="space-y-6 pl-10">
                                      {empPromotions.map((promo: any, index: number) => {
                                        const isPromotion = promo.changeType === "promotion"
                                        const isAppointment = promo.changeType === "appointment"
                                        const isDemotion = promo.changeType === "demotion"
                                        const isTransfer = promo.changeType === "transfer"

                                        let IconComponent = ArrowRight
                                        let iconColor = "text-blue-600"
                                        let bgColor = "bg-blue-50 border-blue-200"
                                        let textColor = "text-blue-900"
                                        let labelColor = "text-blue-700"

                                        if (isPromotion) {
                                          IconComponent = ArrowUp
                                          iconColor = "text-green-600"
                                          bgColor = "bg-green-50 border-green-200"
                                          textColor = "text-green-900"
                                          labelColor = "text-green-700"
                                        } else if (isDemotion) {
                                          IconComponent = ArrowDown
                                          iconColor = "text-red-600"
                                          bgColor = "bg-red-50 border-red-200"
                                          textColor = "text-red-900"
                                          labelColor = "text-red-700"
                                        } else if (isAppointment) {
                                          IconComponent = User
                                          iconColor = "text-purple-600"
                                          bgColor = "bg-purple-50 border-purple-200"
                                          textColor = "text-purple-900"
                                          labelColor = "text-purple-700"
                                        }

                                        return (
                                          <div key={promo.historyId} className="relative">
                                            <div className={`absolute -left-6 top-1 flex items-center justify-center w-8 h-8 rounded-full border-2 ${bgColor}`}>
                                              {IconComponent && <IconComponent className={`h-4 w-4 ${iconColor}`} />}
                                            </div>
                                            <div className={`rounded-lg border p-4 ${bgColor}`}>
                                              <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant={isPromotion ? "default" : isDemotion ? "destructive" : "outline"} className="capitalize font-semibold">
                                                      {promo.changeType}
                                                    </Badge>
                                                    <span className={`text-sm font-semibold ${textColor}`}>
                                                      {formatDateLong(promo.effectiveDate)}
                                                    </span>
                                                  </div>
                                                  <div className="space-y-1.5">
                                                    {promo.previousPositionTitle && (
                                                      <div className="text-sm">
                                                        <span className={`font-medium ${labelColor}`}>From: </span>
                                                        <span className={`font-semibold ${textColor}`}>{promo.previousPositionTitle}</span>
                                                        {promo.previousDepartmentName && (
                                                          <span className={`${labelColor}`}> ({promo.previousDepartmentName})</span>
                                                        )}
                                                      </div>
                                                    )}
                                                    <div className="text-sm">
                                                      <span className={`font-medium ${labelColor}`}>To: </span>
                                                      <span className={`font-semibold ${textColor}`}>{promo.newPositionTitle || "—"}</span>
                                                      {promo.newDepartmentName && (
                                                        <span className={`${labelColor}`}> ({promo.newDepartmentName})</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              {promo.reason && (
                                                <div className="mt-3 pt-3 border-t border-border/50">
                                                  <p className={`text-sm ${textColor}`}>
                                                    <span className={`font-semibold ${labelColor}`}>Reason: </span>
                                                    {promo.reason}
                                                  </p>
                                                </div>
                                              )}
                                              {promo.notes && (
                                                <div className="mt-2">
                                                  <p className={`text-sm ${textColor} italic`}>{promo.notes}</p>
                                                </div>
                                              )}
                                              {promo.salaryChange && (
                                                <div className="mt-2">
                                                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 font-semibold">
                                                    Salary Change: KES {parseFloat(promo.salaryChange).toLocaleString()}
                                                  </Badge>
                                                </div>
                                              )}
                                              {promo.approvedByName && (
                                                <div className={`mt-2 text-xs ${labelColor}`}>
                                                  <span className="font-medium">Approved by: </span>
                                                  <span className="font-semibold">{promo.approvedByName}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Management</CardTitle>
                  <CardDescription>Track employee attendance and working hours</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedEmployee?.employeeId?.toString() || ""}
                    onValueChange={(value) => {
                      const emp = employees.find((e: any) => e.employeeId.toString() === value)
                      setSelectedEmployee(emp || null)
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                          {emp.fullName || `${emp.firstName} ${emp.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => {
                    if (selectedEmployee) {
                      setAttendanceEmployeeId(selectedEmployee.employeeId.toString())
                      setSelectedAttendance(null)
                      setAttendanceFormOpen(true)
                    } else {
                      toast({ title: "Info", description: "Please select an employee first." })
                    }
                  }}>
                    <Clock className="mr-2 h-4 w-4" />
                    Record Attendance
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attendancesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : attendances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No attendance records found</p>
                  <p className="text-xs text-muted-foreground mt-1">Select an employee and record their attendance</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((attendance) => (
                        <TableRow key={attendance.attendanceId}>
                          <TableCell>{attendance.employeeName || attendance.employeeNumber}</TableCell>
                          <TableCell>{formatDate(attendance.attendanceDate)}</TableCell>
                          <TableCell>
                            {attendance.checkInTime ? formatTime(attendance.checkInTime) : "—"}
                          </TableCell>
                          <TableCell>
                            {attendance.checkOutTime ? formatTime(attendance.checkOutTime) : "—"}
                          </TableCell>
                          <TableCell>{attendance.hoursWorked || 0} hrs</TableCell>
                          <TableCell>
                            <Badge variant={
                              attendance.status === "present" ? "default" :
                              attendance.status === "absent" ? "destructive" :
                              attendance.status === "late" ? "outline" :
                              "secondary"
                            } className="capitalize">
                              {attendance.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAttendanceEmployeeId(attendance.employeeId.toString())
                                  setSelectedAttendance(attendance)
                                  setAttendanceFormOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={loadEmployees}
        employee={selectedEmployee}
      />

      {viewEmployee && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee 360° View - {viewEmployee.fullName || `${viewEmployee.firstName} ${viewEmployee.lastName}`}
              </DialogTitle>
              <DialogDescription>
                Comprehensive view of employee information, history, and records
              </DialogDescription>
            </DialogHeader>
            
            {viewDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading employee data...</span>
              </div>
            ) : (
              <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="payroll">Payroll</TabsTrigger>
                  <TabsTrigger value="promotions">Promotions</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Employee Number</p>
                          <p className="text-sm font-semibold">{viewEmployee.employeeNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                          <p className="text-sm font-semibold">{viewEmployee.fullName || `${viewEmployee.firstName} ${viewEmployee.lastName}`}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Department</p>
                          <p className="text-sm font-semibold">{viewEmployee.departmentName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Position</p>
                          <p className="text-sm font-semibold">{viewEmployee.positionTitle || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Hire Date</p>
                          <p className="text-sm font-semibold">{formatDate(viewEmployee.hireDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <div className="mt-1">{getStatusBadge(viewEmployee.status)}</div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Employment Type</p>
                          <p className="text-sm font-semibold capitalize">{viewEmployee.employmentType?.replace('_', ' ') || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Gender</p>
                          <p className="text-sm font-semibold">{viewEmployee.gender || "—"}</p>
                        </div>
                        {viewEmployee.dateOfBirth && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                            <p className="text-sm font-semibold">{formatDate(viewEmployee.dateOfBirth)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Phone</p>
                          <p className="text-sm font-semibold">{viewEmployee.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm font-semibold">{viewEmployee.email || "—"}</p>
                        </div>
                        {viewEmployee.idNumber && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                            <p className="text-sm font-semibold">{viewEmployee.idNumber}</p>
                          </div>
                        )}
                      </div>
                      {viewEmployee.address && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-muted-foreground">Address</p>
                          <p className="text-sm">{viewEmployee.address}</p>
                        </div>
                      )}
                      {viewEmployee.notes && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-muted-foreground">Notes</p>
                          <p className="text-sm">{viewEmployee.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leave" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Leave History & Balances</CardTitle>
                      <CardDescription>Employee leave requests and available balances</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeLeaveBalances.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold mb-3">Leave Balances</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {employeeLeaveBalances.map((balance: any) => (
                              <div key={balance.balanceId} className="border rounded-lg p-3">
                                <p className="text-xs text-muted-foreground capitalize">{balance.leaveType}</p>
                                <p className="text-lg font-bold">{balance.balanceDays}</p>
                                <p className="text-xs text-muted-foreground">
                                  {balance.usedDays} used / {balance.allocatedDays} allocated
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Leave History</h4>
                        {employeeLeaves.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No leave records found</p>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Start Date</TableHead>
                                  <TableHead>End Date</TableHead>
                                  <TableHead>Days</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {employeeLeaves.map((leave: any) => (
                                  <TableRow key={leave.leaveId}>
                                    <TableCell className="capitalize">{leave.leaveType}</TableCell>
                                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                                    <TableCell>{leave.daysRequested}</TableCell>
                                    <TableCell>
                                      <Badge variant={
                                        leave.status === "approved" ? "default" :
                                        leave.status === "rejected" ? "destructive" :
                                        "secondary"
                                      } className="capitalize">
                                        {leave.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payroll" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payroll & Salary Information</CardTitle>
                      <CardDescription>Salary history and payroll transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeSalaries.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold mb-3">Current Salary</h4>
                          {employeeSalaries.filter((s: any) => s.isActive).map((salary: any) => (
                            <div key={salary.salaryId} className="border rounded-lg p-4 mb-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Base Salary</p>
                                  <p className="text-lg font-bold">KES {parseFloat(salary.baseSalary || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Allowances</p>
                                  <p className="text-lg font-bold">KES {parseFloat(salary.allowances || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Deductions</p>
                                  <p className="text-lg font-bold">KES {parseFloat(salary.deductions || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Net Salary</p>
                                  <p className="text-lg font-bold text-green-600">KES {parseFloat(salary.netSalary || 0).toLocaleString()}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Effective from: {formatDate(salary.effectiveDate)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Payroll Transactions</h4>
                        {employeePayrolls.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No payroll records found</p>
                        ) : (
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Pay Period</TableHead>
                                  <TableHead>Gross Salary</TableHead>
                                  <TableHead>Deductions</TableHead>
                                  <TableHead>Net Salary</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Payment Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {employeePayrolls.map((payroll: any) => (
                                  <TableRow key={payroll.payrollId}>
                                    <TableCell>
                                      {formatDate(payroll.payPeriodStart)} - {formatDate(payroll.payPeriodEnd)}
                                    </TableCell>
                                    <TableCell>KES {parseFloat(payroll.grossSalary || 0).toLocaleString()}</TableCell>
                                    <TableCell>KES {parseFloat(payroll.deductions || 0).toLocaleString()}</TableCell>
                                    <TableCell className="font-semibold">KES {parseFloat(payroll.netSalary || 0).toLocaleString()}</TableCell>
                                    <TableCell>
                                      <Badge variant={payroll.paymentStatus === "paid" ? "default" : "secondary"}>
                                        {payroll.paymentStatus}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{payroll.paymentDate ? formatDate(payroll.paymentDate) : "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="promotions" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Position History & Promotions</CardTitle>
                      <CardDescription>Career progression and position changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeePromotions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No position history found</p>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                          <div className="space-y-6 pl-10">
                            {employeePromotions.map((promo: any) => {
                              const isPromotion = promo.changeType === "promotion"
                              const isAppointment = promo.changeType === "appointment"
                              const isDemotion = promo.changeType === "demotion"
                              const isTransfer = promo.changeType === "transfer"

                              let IconComponent = ArrowRight
                              let iconColor = "text-blue-600"
                              let bgColor = "bg-blue-50 border-blue-200"

                              if (isPromotion) {
                                IconComponent = ArrowUp
                                iconColor = "text-green-600"
                                bgColor = "bg-green-50 border-green-200"
                              } else if (isDemotion) {
                                IconComponent = ArrowDown
                                iconColor = "text-red-600"
                                bgColor = "bg-red-50 border-red-200"
                              } else if (isAppointment) {
                                IconComponent = User
                                iconColor = "text-purple-600"
                                bgColor = "bg-purple-50 border-purple-200"
                              }

                              return (
                                <div key={promo.historyId} className="relative">
                                  <div className={`absolute -left-6 top-1 flex items-center justify-center w-8 h-8 rounded-full border-2 ${bgColor}`}>
                                    {IconComponent && <IconComponent className={`h-4 w-4 ${iconColor}`} />}
                                  </div>
                                  <div className={`rounded-lg border p-4 ${bgColor}`}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge variant={isPromotion ? "default" : isDemotion ? "destructive" : "outline"} className="capitalize">
                                            {promo.changeType}
                                          </Badge>
                                          <span className="text-sm font-semibold text-blue-900">
                                            {formatDateLong(promo.effectiveDate)}
                                          </span>
                                        </div>
                                        <div className="space-y-1.5">
                                          {promo.previousPositionTitle && (
                                            <div className="text-sm">
                                              <span className="text-blue-700 font-medium">From: </span>
                                              <span className="font-semibold text-blue-900">{promo.previousPositionTitle}</span>
                                              {promo.previousDepartmentName && (
                                                <span className="text-blue-700"> ({promo.previousDepartmentName})</span>
                                              )}
                                            </div>
                                          )}
                                          <div className="text-sm">
                                            <span className="text-blue-700 font-medium">To: </span>
                                            <span className="font-semibold text-blue-900">{promo.newPositionTitle || "—"}</span>
                                            {promo.newDepartmentName && (
                                              <span className="text-blue-700"> ({promo.newDepartmentName})</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {promo.reason && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        <p className="text-sm text-blue-900">
                                          <span className="font-semibold">Reason: </span>
                                          {promo.reason}
                                        </p>
                                      </div>
                                    )}
                                    {promo.salaryChange && (
                                      <div className="mt-2">
                                        <Badge variant="outline" className="text-green-600 border-green-300">
                                          Salary Change: KES {parseFloat(promo.salaryChange).toLocaleString()}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendance Records</CardTitle>
                      <CardDescription>Employee attendance and working hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {employeeAttendances.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No attendance records found</p>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employeeAttendances.map((attendance: any) => (
                                <TableRow key={attendance.attendanceId}>
                                  <TableCell>{formatDate(attendance.attendanceDate)}</TableCell>
                                  <TableCell>{attendance.checkInTime ? formatTime(attendance.checkInTime) : "—"}</TableCell>
                                  <TableCell>{attendance.checkOutTime ? formatTime(attendance.checkOutTime) : "—"}</TableCell>
                                  <TableCell>{attendance.hoursWorked || 0} hrs</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      attendance.status === "present" ? "default" :
                                      attendance.status === "absent" ? "destructive" :
                                      attendance.status === "late" ? "outline" :
                                      "secondary"
                                    } className="capitalize">
                                      {attendance.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Contacts</CardTitle>
                      <CardDescription>Emergency contact information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {viewEmployee.emergencyContactName ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                            <p className="text-sm font-semibold">{viewEmployee.emergencyContactName}</p>
                          </div>
                          {viewEmployee.emergencyContactPhone && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                              <p className="text-sm font-semibold">{viewEmployee.emergencyContactPhone}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No emergency contact information available</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate {employeeToDelete?.fullName || employeeToDelete?.firstName}? This action will mark the employee as terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeaveForm
        open={leaveFormOpen}
        onOpenChange={(open) => {
          setLeaveFormOpen(open)
          if (!open) {
            setSelectedLeave(null)
          }
        }}
        onSuccess={() => {
          loadLeaves()
          setSelectedLeave(null)
        }}
        employeeId={leaveEmployeeId}
        leave={selectedLeave}
      />

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {leaveToReject && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Leave Details</p>
                <p className="text-sm text-muted-foreground">
                  {leaveToReject.employeeName} - {leaveToReject.leaveType} leave
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(leaveToReject.startDate)} to {formatDate(leaveToReject.endDate)} ({leaveToReject.daysRequested} days)
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <textarea
                className="mt-2 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false)
                  setLeaveToReject(null)
                  setRejectionReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (rejectionReason.trim()) {
                    handleRejectLeave(leaveToReject.leaveId.toString(), rejectionReason)
                  } else {
                    toast({
                      title: "Error",
                      description: "Please provide a rejection reason.",
                      variant: "destructive",
                    })
                  }
                }}
                disabled={!rejectionReason.trim()}
              >
                Reject Leave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Leave Confirmation Dialog */}
      <AlertDialog open={leaveDeleteDialogOpen} onOpenChange={setLeaveDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this leave record? This action cannot be undone.
              {leaveToDelete && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <p className="text-sm">
                    <strong>{leaveToDelete.employeeName}</strong> - {leaveToDelete.leaveType} leave
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(leaveToDelete.startDate)} to {formatDate(leaveToDelete.endDate)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeave}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SalaryForm
        open={salaryFormOpen}
        onOpenChange={setSalaryFormOpen}
        onSuccess={() => {
          if (salaryEmployeeId) {
            loadPayrolls(salaryEmployeeId)
          }
        }}
        employeeId={salaryEmployeeId}
        salary={selectedSalary}
      />

      <PromotionForm
        open={promotionFormOpen}
        onOpenChange={setPromotionFormOpen}
        onSuccess={() => {
          if (promotionEmployeeId) {
            loadPromotions(promotionEmployeeId)
            loadEmployees()
          }
        }}
        employeeId={promotionEmployeeId}
        currentPositionId={selectedEmployee?.positionId}
        currentDepartmentId={selectedEmployee?.departmentId}
      />

      <PayrollForm
        open={payrollFormOpen}
        onOpenChange={setPayrollFormOpen}
        onSuccess={() => {
          if (payrollEmployeeId) {
            loadPayrolls(payrollEmployeeId)
          }
        }}
        employeeId={payrollEmployeeId}
        salaryId={selectedEmployee?.salaryId}
        payroll={selectedPayroll}
      />

      <AttendanceForm
        open={attendanceFormOpen}
        onOpenChange={setAttendanceFormOpen}
        onSuccess={() => {
          if (attendanceEmployeeId) {
            loadAttendances(attendanceEmployeeId)
          }
        }}
        employeeId={attendanceEmployeeId}
        attendance={selectedAttendance}
      />
    </div>
  )
}
