"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Download, Edit, Trash2, Filter, Loader2, FileText, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddServiceChargeForm } from "@/components/add-service-charge-form"
import { AddSpecialistChargeForm } from "@/components/add-specialist-charge-form"
import { AddConsumablesChargeForm } from "@/components/add-consumables-charge-form"
import { ChargeRateRulesTable } from "@/components/charge-rate-rules-table"
import { serviceChargeApi, specialistChargeApi, consumablesChargeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
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
import { formatDate } from "@/lib/date-utils"
import { FinanceExportMenu } from "@/components/finance/finance-export-menu"

interface ServiceCharge {
  chargeId: number
  chargeCode: string
  name: string
  category: string | null
  department: string | null
  cost: number
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface SpecialistCharge {
  specialistChargeId: number
  chargeId: number
  doctorId: number
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
  chargeCode?: string
  chargeName?: string
  doctorFirstName?: string
  doctorLastName?: string
}

interface ConsumablesCharge {
  consumableChargeId: number
  chargeId: number
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
  chargeCode?: string
  chargeName?: string
}

export default function HospitalChargesPage() {
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])
  const [specialistCharges, setSpecialistCharges] = useState<SpecialistCharge[]>([])
  const [consumablesCharges, setConsumablesCharges] = useState<ConsumablesCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSpecialist, setLoadingSpecialist] = useState(false)
  const [loadingConsumables, setLoadingConsumables] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSpecialistForm, setShowSpecialistForm] = useState(false)
  const [showConsumablesForm, setShowConsumablesForm] = useState(false)
  const [editingCharge, setEditingCharge] = useState<ServiceCharge | null>(null)
  const [editingSpecialistCharge, setEditingSpecialistCharge] = useState<SpecialistCharge | null>(null)
  const [editingConsumablesCharge, setEditingConsumablesCharge] = useState<ConsumablesCharge | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chargeToDelete, setChargeToDelete] = useState<ServiceCharge | null>(null)
  const [specialistDeleteDialogOpen, setSpecialistDeleteDialogOpen] = useState(false)
  const [specialistChargeToDelete, setSpecialistChargeToDelete] = useState<SpecialistCharge | null>(null)
  const [consumablesDeleteDialogOpen, setConsumablesDeleteDialogOpen] = useState(false)
  const [consumablesChargeToDelete, setConsumablesChargeToDelete] = useState<ConsumablesCharge | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [specialistSearchTerm, setSpecialistSearchTerm] = useState("")
  const [consumablesSearchTerm, setConsumablesSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [chargesTab, setChargesTab] = useState("service-charges")

  useEffect(() => {
    loadCharges()
  }, [categoryFilter, departmentFilter, statusFilter, searchTerm])

  useEffect(() => {
    loadSpecialistCharges()
  }, [specialistSearchTerm])

  useEffect(() => {
    loadConsumablesCharges()
  }, [consumablesSearchTerm])

  const loadCharges = async () => {
    try {
      setLoading(true)
      const data = await serviceChargeApi.getAll(
        statusFilter !== "all" ? statusFilter : undefined,
        categoryFilter !== "all" ? categoryFilter : undefined,
        departmentFilter !== "all" ? departmentFilter : undefined,
        searchTerm || undefined
      )
      setServiceCharges(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading charges:", error)
      toast({
        title: "Error",
        description: "Failed to load service charges.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSpecialistCharges = async () => {
    try {
      setLoadingSpecialist(true)
      const data = await specialistChargeApi.getAll(undefined, undefined, specialistSearchTerm || undefined)
      setSpecialistCharges(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading specialist charges:", error)
      toast({
        title: "Error",
        description: "Failed to load specialist charges.",
        variant: "destructive",
      })
    } finally {
      setLoadingSpecialist(false)
    }
  }

  const loadConsumablesCharges = async () => {
    try {
      setLoadingConsumables(true)
      const data = await consumablesChargeApi.getAll(undefined, consumablesSearchTerm || undefined)
      setConsumablesCharges(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading consumables charges:", error)
      toast({
        title: "Error",
        description: "Failed to load consumables charges.",
        variant: "destructive",
      })
    } finally {
      setLoadingConsumables(false)
    }
  }

  const handleAdd = () => {
    setEditingCharge(null)
    setShowAddForm(true)
  }

  const handleAddSpecialist = () => {
    setEditingSpecialistCharge(null)
    setShowSpecialistForm(true)
  }

  const handleAddConsumables = () => {
    setEditingConsumablesCharge(null)
    setShowConsumablesForm(true)
  }

  const handleEdit = (charge: ServiceCharge) => {
    setEditingCharge(charge)
    setShowAddForm(true)
  }

  const handleEditSpecialist = (charge: SpecialistCharge) => {
    setEditingSpecialistCharge(charge)
    setShowSpecialistForm(true)
  }

  const handleDelete = (charge: ServiceCharge) => {
    setChargeToDelete(charge)
    setDeleteDialogOpen(true)
  }

  const handleDeleteSpecialist = (charge: SpecialistCharge) => {
    setSpecialistChargeToDelete(charge)
    setSpecialistDeleteDialogOpen(true)
  }

  const handleEditConsumables = (charge: ConsumablesCharge) => {
    setEditingConsumablesCharge(charge)
    setShowConsumablesForm(true)
  }

  const handleDeleteConsumables = (charge: ConsumablesCharge) => {
    setConsumablesChargeToDelete(charge)
    setConsumablesDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!chargeToDelete) return

    try {
      await serviceChargeApi.delete(chargeToDelete.chargeId.toString())
      toast({
        title: "Success",
        description: "Service charge deleted successfully.",
      })
      setDeleteDialogOpen(false)
      setChargeToDelete(null)
      loadCharges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service charge.",
        variant: "destructive",
      })
    }
  }

  const confirmDeleteSpecialist = async () => {
    if (!specialistChargeToDelete) return

    try {
      await specialistChargeApi.delete(specialistChargeToDelete.specialistChargeId.toString())
      toast({
        title: "Success",
        description: "Specialist charge deleted successfully.",
      })
      setSpecialistDeleteDialogOpen(false)
      setSpecialistChargeToDelete(null)
      loadSpecialistCharges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete specialist charge.",
        variant: "destructive",
      })
    }
  }

  const confirmDeleteConsumables = async () => {
    if (!consumablesChargeToDelete) return

    try {
      await consumablesChargeApi.delete(consumablesChargeToDelete.consumableChargeId.toString())
      toast({
        title: "Success",
        description: "Consumables charge deleted successfully.",
      })
      setConsumablesDeleteDialogOpen(false)
      setConsumablesChargeToDelete(null)
      loadConsumablesCharges()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete consumables charge.",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(amount)
  }

  const categories = Array.from(new Set(serviceCharges.map((charge) => charge.category).filter(Boolean)))
  const departments = Array.from(new Set(serviceCharges.map((charge) => charge.department).filter(Boolean)))

  const filteredCharges = serviceCharges // Already filtered by API

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Charges</h1>
          <p className="text-muted-foreground">Configure and manage service charges and specialist charges</p>
        </div>
        <div className="flex gap-2">
          <FinanceExportMenu
            getPayload={() => {
              if (chargesTab === "service-charges") {
                if (filteredCharges.length === 0) return null
                return {
                  filenamePrefix: "service-charges",
                  pdfTitle: "Service Charges",
                  pdfSubtitle: "Hospital charge master",
                  numberColumns: [4],
                  headers: ["Charge Code", "Service Name", "Category", "Department", "Cost", "Status", "Updated"],
                  rows: filteredCharges.map((c) => [
                    c.chargeCode,
                    c.name,
                    c.category || "",
                    c.department || "",
                    parseFloat(String(c.cost ?? 0)) || 0,
                    c.status,
                    formatDate(c.updatedAt),
                  ]),
                }
              }
              if (chargesTab === "specialist-charges") {
                if (specialistCharges.length === 0) return null
                return {
                  filenamePrefix: "specialist-charges",
                  pdfTitle: "Specialist Charges",
                  pdfSubtitle: "Doctor-specific fees",
                  numberColumns: [2],
                  headers: ["Charge", "Doctor", "Amount", "Effective From", "Effective To"],
                  rows: specialistCharges.map((c) => [
                    c.chargeName || c.chargeCode || String(c.chargeId),
                    `${c.doctorFirstName || ""} ${c.doctorLastName || ""}`.trim(),
                    parseFloat(String(c.amount ?? 0)) || 0,
                    formatDate(c.effectiveFrom),
                    c.effectiveTo ? formatDate(c.effectiveTo) : "",
                  ]),
                }
              }
              if (consumablesCharges.length === 0) return null
              return {
                filenamePrefix: "consumables-charges",
                pdfTitle: "Consumables Charges",
                pdfSubtitle: "Consumables fee schedule",
                numberColumns: [1],
                headers: ["Charge", "Amount", "Effective From", "Effective To"],
                rows: consumablesCharges.map((c) => [
                  c.chargeName || c.chargeCode || String(c.chargeId),
                  parseFloat(String(c.amount ?? 0)) || 0,
                  formatDate(c.effectiveFrom),
                  c.effectiveTo ? formatDate(c.effectiveTo) : "",
                ]),
              }
            }}
          />
        </div>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Insurance &amp; Inpatient (cash) rates
          </CardTitle>
          <CardDescription>
            Define what each insurer pays per charge and what cash-paying inpatients pay (by ward/ward type). Used when creating or updating invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" asChild>
            <Link href="/insurance?tab=insurance-rates">
              <DollarSign className="mr-2 h-4 w-4" />
              Open Insurance rates
            </Link>
          </Button>
          <Button variant="outline" className="ml-2" asChild>
            <Link href="/insurance?tab=inpatient-rates">
              Open Inpatient (cash) rates
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Centralized charge-rate rules</CardTitle>
          <CardDescription>
            Manage all pricing overrides in one place: insurance, cash, and ward-specific rules. Ward-specific rules are prioritized over general rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChargeRateRulesTable />
        </CardContent>
      </Card>

      <Tabs value={chargesTab} onValueChange={setChargesTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="service-charges">Service Charges</TabsTrigger>
          <TabsTrigger value="specialist-charges">Specialist Charges</TabsTrigger>
          <TabsTrigger value="consumables-charges">Consumables Charges</TabsTrigger>
        </TabsList>

        <TabsContent value="service-charges" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              New Service Charge
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{serviceCharges.length}</div>
                <p className="text-xs text-muted-foreground">Across {categories.length} categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Charge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serviceCharges.length > 0
                    ? formatCurrency(serviceCharges.reduce((sum, charge) => sum + parseFloat(charge.cost.toString()), 0) / serviceCharges.length)
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">Per service</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest Charge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serviceCharges.length > 0
                    ? formatCurrency(Math.max(...serviceCharges.map((charge) => parseFloat(charge.cost.toString()))))
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {serviceCharges.length > 0
                    ? serviceCharges.reduce((max, charge) => (parseFloat(charge.cost.toString()) > parseFloat(max.cost.toString()) ? charge : max), serviceCharges[0]).name
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departments.length}</div>
                <p className="text-xs text-muted-foreground">With configured charges</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Service Charges</CardTitle>
              <CardDescription>
                View and manage all hospital service charges. For patient registration: keep the{" "}
                <span className="font-mono">REG-FEE</span> charge at <strong>0</strong> to skip registration
                invoices and cashier queue; set a positive amount when the facility starts charging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category || ""}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department} value={department || ""}>
                            {department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search services..."
                      className="w-full pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCharges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No service charges found.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charge Code</TableHead>
                          <TableHead>Service Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCharges.map((charge) => (
                          <TableRow key={charge.chargeId}>
                            <TableCell className="font-medium">{charge.chargeCode || "—"}</TableCell>
                            <TableCell>
                              {charge.name}
                              {charge.description && (
                                <div className="text-xs text-muted-foreground">{charge.description}</div>
                              )}
                            </TableCell>
                            <TableCell>{charge.category || "—"}</TableCell>
                            <TableCell>{charge.department || "—"}</TableCell>
                            <TableCell>{formatCurrency(parseFloat(charge.cost.toString()))}</TableCell>
                            <TableCell>
                              <Badge variant={charge.status === "Active" ? "default" : "secondary"}>
                                {charge.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(charge.updatedAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEdit(charge)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDelete(charge)}
                                  title="Delete"
                                  className="text-destructive hover:text-destructive"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialist-charges" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleAddSpecialist}>
              <Plus className="mr-2 h-4 w-4" />
              New Specialist Charge
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Specialist Charges</CardTitle>
              <CardDescription>Manage additional charges or fee adjustments for specific doctors and charges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by charge or doctor..."
                      className="w-full pl-8"
                      value={specialistSearchTerm}
                      onChange={(e) => setSpecialistSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {loadingSpecialist ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : specialistCharges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No specialist charges found.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charge</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Effective To</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specialistCharges.map((charge) => (
                          <TableRow key={charge.specialistChargeId}>
                            <TableCell className="font-medium">
                              {charge.chargeCode && `${charge.chargeCode} - `}
                              {charge.chargeName || `Charge #${charge.chargeId}`}
                            </TableCell>
                            <TableCell>
                              {charge.doctorFirstName?.startsWith('Dr.') ? charge.doctorFirstName : `Dr. ${charge.doctorFirstName}`} {charge.doctorLastName}
                            </TableCell>
                            <TableCell>{formatCurrency(parseFloat(charge.amount.toString()))}</TableCell>
                            <TableCell>{formatDate(charge.effectiveFrom)}</TableCell>
                            <TableCell>{charge.effectiveTo ? formatDate(charge.effectiveTo) : "Ongoing"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEditSpecialist(charge)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteSpecialist(charge)}
                                  title="Delete"
                                  className="text-destructive hover:text-destructive"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumables-charges" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleAddConsumables}>
              <Plus className="mr-2 h-4 w-4" />
              New Consumables Charge
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Consumables Charges</CardTitle>
              <CardDescription>Manage charges for consumable items with effective dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by charge..."
                      className="w-full pl-8"
                      value={consumablesSearchTerm}
                      onChange={(e) => setConsumablesSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {loadingConsumables ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : consumablesCharges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No consumables charges found.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charge</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Effective From</TableHead>
                          <TableHead>Effective To</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consumablesCharges.map((charge) => (
                          <TableRow key={charge.consumableChargeId}>
                            <TableCell className="font-medium">
                              {charge.chargeCode && `${charge.chargeCode} - `}
                              {charge.chargeName || `Charge #${charge.chargeId}`}
                            </TableCell>
                            <TableCell>{formatCurrency(parseFloat(charge.amount.toString()))}</TableCell>
                            <TableCell>{formatDate(charge.effectiveFrom)}</TableCell>
                            <TableCell>{charge.effectiveTo ? formatDate(charge.effectiveTo) : "Ongoing"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEditConsumables(charge)} title="Edit">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteConsumables(charge)}
                                  title="Delete"
                                  className="text-destructive hover:text-destructive"
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddServiceChargeForm
        open={showAddForm}
        onOpenChange={(open) => {
          setShowAddForm(open)
          if (!open) {
            setEditingCharge(null)
          }
        }}
        onSuccess={() => {
          loadCharges()
          setEditingCharge(null)
        }}
        editData={editingCharge}
      />

      <AddSpecialistChargeForm
        open={showSpecialistForm}
        onOpenChange={(open) => {
          setShowSpecialistForm(open)
          if (!open) {
            setEditingSpecialistCharge(null)
          }
        }}
        onSuccess={() => {
          loadSpecialistCharges()
          setEditingSpecialistCharge(null)
        }}
        editData={editingSpecialistCharge}
      />

      <AddConsumablesChargeForm
        open={showConsumablesForm}
        onOpenChange={(open) => {
          setShowConsumablesForm(open)
          if (!open) {
            setEditingConsumablesCharge(null)
          }
        }}
        onSuccess={() => {
          loadConsumablesCharges()
          setEditingConsumablesCharge(null)
        }}
        editData={editingConsumablesCharge}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {chargeToDelete?.name}?
              {chargeToDelete && (
                <span className="block mt-2 text-sm">
                  This charge will be deactivated if it's used in any invoices, or permanently deleted if not in use.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={specialistDeleteDialogOpen} onOpenChange={setSpecialistDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Specialist Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this specialist charge?
              {specialistChargeToDelete && (
                <span className="block mt-2 text-sm">
                  This will permanently delete the specialist charge for {specialistChargeToDelete.chargeName || `Charge #${specialistChargeToDelete.chargeId}`} 
                  {" "}with Dr. {specialistChargeToDelete.doctorFirstName} {specialistChargeToDelete.doctorLastName}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSpecialist}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={consumablesDeleteDialogOpen} onOpenChange={setConsumablesDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Consumables Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this consumables charge?
              {consumablesChargeToDelete && (
                <span className="block mt-2 text-sm">
                  This will permanently delete the consumables charge for {consumablesChargeToDelete.chargeName || `Charge #${consumablesChargeToDelete.chargeId}`}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteConsumables}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
