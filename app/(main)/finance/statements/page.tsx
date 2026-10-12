"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, Loader2, FileText, User, Users, Search, Calendar, Printer } from "lucide-react"
import { printPatientFinancialStatement, printStaffFinancialStatement } from "@/lib/finance-statement-print"
import { ledgerApi, patientApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import {
  buildFinancialStatementLines,
  downloadPatientFinancialStatementPdf,
  downloadStaffFinancialStatementPdf,
} from "@/lib/finance-statement-pdf"

export default function FinancialStatementsPage() {
  const [loading, setLoading] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [activeTab, setActiveTab] = useState("patient")

  // Patient Statement
  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientStatement, setPatientStatement] = useState<any>(null)
  const [patientStartDate, setPatientStartDate] = useState<string>("")
  const [patientEndDate, setPatientEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [patientAsOfDate, setPatientAsOfDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [patientDateMode, setPatientDateMode] = useState<"range" | "asof">("asof")

  // Staff Statement
  const [staffSearch, setStaffSearch] = useState("")
  const [staffResults, setStaffResults] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [staffStatement, setStaffStatement] = useState<any>(null)
  const [staffStartDate, setStaffStartDate] = useState<string>("")
  const [staffEndDate, setStaffEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [staffAsOfDate, setStaffAsOfDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [staffDateMode, setStaffDateMode] = useState<"range" | "asof">("asof")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  // Search patients
  useEffect(() => {
    if (patientSearch.length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const results = await patientApi.getAll(patientSearch, 1, 10)
          setPatientResults(results || [])
        } catch (error) {
          console.error("Error searching patients:", error)
        }
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setPatientResults([])
    }
  }, [patientSearch])

  // Search staff
  useEffect(() => {
    if (staffSearch.length >= 2) {
      const timeoutId = setTimeout(async () => {
        try {
          // Search users/staff - you may need to add a staffApi or use a different endpoint
          const response = await fetch(`/api/users?search=${encodeURIComponent(staffSearch)}&limit=10`)
          if (response.ok) {
            const data = await response.json()
            setStaffResults(data || [])
          }
        } catch (error) {
          console.error("Error searching staff:", error)
        }
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setStaffResults([])
    }
  }, [staffSearch])

  const loadPatientStatement = async () => {
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Please select a patient first",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const data = await ledgerApi.getPatientStatement(
        selectedPatient.patientId.toString(),
        patientDateMode === "range" ? patientStartDate : undefined,
        patientDateMode === "range" ? patientEndDate : undefined,
        patientDateMode === "asof" ? patientAsOfDate : undefined
      )
      setPatientStatement(data)
    } catch (error: any) {
      console.error("Error loading patient statement:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load patient statement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStaffStatement = async () => {
    if (!selectedStaff) {
      toast({
        title: "Error",
        description: "Please select a staff member first",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const data = await ledgerApi.getStaffStatement(
        selectedStaff.userId.toString(),
        staffDateMode === "range" ? staffStartDate : undefined,
        staffDateMode === "range" ? staffEndDate : undefined,
        staffDateMode === "asof" ? staffAsOfDate : undefined
      )
      setStaffStatement(data)
    } catch (error: any) {
      console.error("Error loading staff statement:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load staff statement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generatePatientStatementPDF = async () => {
    if (!patientStatement) return
    try {
      setPdfExporting(true)
      await downloadPatientFinancialStatementPdf(patientStatement)
    } catch (error) {
      console.error("Patient statement PDF:", error)
      toast({
        title: "Export failed",
        description: "Could not generate the statement PDF.",
        variant: "destructive",
      })
    } finally {
      setPdfExporting(false)
    }
  }

  const generateStaffStatementPDF = async () => {
    if (!staffStatement) return
    try {
      setPdfExporting(true)
      await downloadStaffFinancialStatementPdf(staffStatement)
    } catch (error) {
      console.error("Staff statement PDF:", error)
      toast({
        title: "Export failed",
        description: "Could not generate the statement PDF.",
        variant: "destructive",
      })
    } finally {
      setPdfExporting(false)
    }
  }

  const renderStatementLedgerTable = (
    statement: { openingBalance?: number },
    lines: ReturnType<typeof buildFinancialStatementLines>
  ) => {
    const opening = statement.openingBalance || 0
    let running = opening
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((t, index) => {
              running += t.debit - t.credit
              return (
                <TableRow key={`${t.transactionNumber}-${index}`}>
                  <TableCell>{format(new Date(t.transactionDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>{t.transactionNumber || ""}</TableCell>
                  <TableCell>{t.description || ""}</TableCell>
                  <TableCell>{t.referenceNumber || ""}</TableCell>
                  <TableCell className="text-right">{t.debit > 0 ? formatCurrency(t.debit) : ""}</TableCell>
                  <TableCell className="text-right">{t.credit > 0 ? formatCurrency(t.credit) : ""}</TableCell>
                  <TableCell className="text-right">{formatCurrency(running)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Statements</h1>
          <p className="text-muted-foreground">View patient and staff financial statements with debits, credits, and balances</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patient" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient Statement
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Statement
          </TabsTrigger>
        </TabsList>

        {/* Patient Statement */}
        <TabsContent value="patient" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Financial Statement</CardTitle>
              <CardDescription>Search and select a patient to view their financial statement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Patient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or patient number..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {patientResults.length > 0 && (
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {patientResults.map((patient) => (
                      <div
                        key={patient.patientId}
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedPatient(patient)
                          setPatientSearch("")
                          setPatientResults([])
                        }}
                      >
                        <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                        <div className="text-sm text-muted-foreground">{patient.patientNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedPatient && (
                <div className="p-4 bg-muted rounded-md">
                  <div className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</div>
                  <div className="text-sm text-muted-foreground">Patient #: {selectedPatient.patientNumber}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Range Mode</Label>
                  <Select value={patientDateMode} onValueChange={(v: "range" | "asof") => setPatientDateMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asof">As of Date</SelectItem>
                      <SelectItem value="range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {patientDateMode === "asof" ? (
                  <div className="space-y-2">
                    <Label>As of Date</Label>
                    <Input
                      type="date"
                      value={patientAsOfDate}
                      onChange={(e) => setPatientAsOfDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={patientStartDate}
                        onChange={(e) => setPatientStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={patientEndDate}
                        onChange={(e) => setPatientEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={loadPatientStatement} disabled={loading || !selectedPatient}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Load Statement
              </Button>
            </CardContent>
          </Card>

          {patientStatement && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Patient Statement</CardTitle>
                    <CardDescription>
                      {patientStatement.patient.firstName} {patientStatement.patient.lastName} - {patientStatement.patient.patientNumber}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => printPatientFinancialStatement(patientStatement)}
                      variant="outline"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button onClick={generatePatientStatementPDF} variant="outline" disabled={pdfExporting}>
                      {pdfExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Amount Invoiced</div>
                    <div className="text-2xl font-bold">{formatCurrency(patientStatement.summary?.totalInvoiced || patientStatement.summary?.totalDebits || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Amount Paid</div>
                    <div className="text-2xl font-bold">{formatCurrency(patientStatement.summary?.totalPaid || patientStatement.summary?.totalCredits || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Outstanding Balance</div>
                    <div className="text-2xl font-bold">{formatCurrency(patientStatement.summary?.totalOutstanding || patientStatement.closingBalance || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Closing Balance</div>
                    <div className="text-2xl font-bold">{formatCurrency(patientStatement.closingBalance || 0)}</div>
                  </div>
                </div>

                {(() => {
                  const lines = buildFinancialStatementLines(patientStatement)
                  return lines.length > 0 ? (
                    renderStatementLedgerTable(patientStatement, lines)
                  ) : (
                  <div className="p-4 bg-muted rounded-md text-center text-muted-foreground">
                    No transactions or invoices found for this patient in the selected period
                  </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Staff Statement */}
        <TabsContent value="staff" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Financial Statement</CardTitle>
              <CardDescription>Search and select a staff member to view their financial statement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Staff</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or username..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {staffResults.length > 0 && (
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {staffResults.map((staff) => (
                      <div
                        key={staff.userId}
                        className="p-2 hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setSelectedStaff(staff)
                          setStaffSearch("")
                          setStaffResults([])
                        }}
                      >
                        <div className="font-medium">{staff.firstName} {staff.lastName}</div>
                        <div className="text-sm text-muted-foreground">{staff.username} - {staff.department || "N/A"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedStaff && (
                <div className="p-4 bg-muted rounded-md">
                  <div className="font-medium">{selectedStaff.firstName} {selectedStaff.lastName}</div>
                  <div className="text-sm text-muted-foreground">Username: {selectedStaff.username} | Department: {selectedStaff.department || "N/A"}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Range Mode</Label>
                  <Select value={staffDateMode} onValueChange={(v: "range" | "asof") => setStaffDateMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asof">As of Date</SelectItem>
                      <SelectItem value="range">Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {staffDateMode === "asof" ? (
                  <div className="space-y-2">
                    <Label>As of Date</Label>
                    <Input
                      type="date"
                      value={staffAsOfDate}
                      onChange={(e) => setStaffAsOfDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={staffStartDate}
                        onChange={(e) => setStaffStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={staffEndDate}
                        onChange={(e) => setStaffEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <Button onClick={loadStaffStatement} disabled={loading || !selectedStaff}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Load Statement
              </Button>
            </CardContent>
          </Card>

          {staffStatement && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Staff Statement</CardTitle>
                    <CardDescription>
                      {staffStatement.staff.firstName} {staffStatement.staff.lastName} - {staffStatement.staff.username}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => printStaffFinancialStatement(staffStatement)} variant="outline">
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button onClick={generateStaffStatementPDF} variant="outline" disabled={pdfExporting}>
                      {pdfExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Opening Balance</div>
                    <div className="text-2xl font-bold">{formatCurrency(staffStatement.openingBalance || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Total Debits</div>
                    <div className="text-2xl font-bold">{formatCurrency(staffStatement.summary?.totalDebits || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="text-2xl font-bold">{formatCurrency(staffStatement.summary?.totalCredits || 0)}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Closing Balance</div>
                    <div className="text-2xl font-bold">{formatCurrency(staffStatement.closingBalance || 0)}</div>
                  </div>
                </div>

                {(() => {
                  const lines = buildFinancialStatementLines(staffStatement)
                  return lines.length > 0 ? (
                    renderStatementLedgerTable(staffStatement, lines)
                  ) : (
                    <div className="p-4 bg-muted rounded-md text-center text-muted-foreground">
                      No transactions found for this staff member in the selected period
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
