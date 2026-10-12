"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Eye, Edit, Trash2, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { insuranceApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { AddInsurancePackageForm } from "@/components/add-insurance-package-form"

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount)
}

export function InsurancePackagesTable() {
  const [packages, setPackages] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [selectedPackage, setSelectedPackage] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPackage, setDeletingPackage] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [openAddForm, setOpenAddForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<any>(null)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)

  const loadPackages = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (providerFilter && providerFilter !== "all") params.providerId = providerFilter
      if (searchQuery) params.search = searchQuery
      const data = await insuranceApi.getPackages(
        params.providerId,
        undefined,
        params.search
      )
      setPackages(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast({
        title: "Error loading packages",
        description: error?.message ?? "Failed to load packages",
        variant: "destructive",
      })
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      const data = await insuranceApi.getProviders()
      setProviders(Array.isArray(data) ? data : [])
    } catch {
      setProviders([])
    }
  }

  useEffect(() => {
    loadPackages()
  }, [providerFilter])

  useEffect(() => {
    loadProviders()
  }, [])

  const handleView = async (pkg: any) => {
    try {
      const details = await insuranceApi.getPackageById(pkg.packageId.toString())
      setSelectedPackage(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to load package details",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg)
    setOpenAddForm(true)
  }

  const handleDeleteClick = (pkg: any) => {
    setDeletingPackage(pkg)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPackage) return
    try {
      setDeleteLoading(true)
      await insuranceApi.deletePackage(deletingPackage.packageId.toString())
      toast({ title: "Success", description: "Package deleted successfully." })
      setDeleteDialogOpen(false)
      setDeletingPackage(null)
      loadPackages()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to delete package",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePackageSaved = () => {
    loadPackages()
    setEditingPackage(null)
  }

  const handleCleanupDuplicates = async () => {
    try {
      setCleanupLoading(true)
      const result = await insuranceApi.cleanupDuplicatePackages()
      toast({
        title: "Cleanup complete",
        description: result.deleted
          ? `Removed ${result.deleted} duplicate(s). ${result.kept} unique packages kept.`
          : result.message,
      })
      setCleanupDialogOpen(false)
      loadPackages()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Cleanup failed",
        variant: "destructive",
      })
    } finally {
      setCleanupLoading(false)
    }
  }

  const filteredPackages = packages.filter((pkg) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !pkg.packageName?.toLowerCase().includes(q) &&
        !pkg.packageCode?.toLowerCase().includes(q) &&
        !pkg.providerName?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search packages..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadPackages()}
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.providerId} value={String(p.providerId)}>
                {p.providerName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadPackages}>
          Apply
        </Button>
        <Button variant="outline" onClick={() => setCleanupDialogOpen(true)}>
          Clean up duplicates
        </Button>
        <Button
          onClick={() => {
            setEditingPackage(null)
            setOpenAddForm(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Package
        </Button>
      </div>

      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean up duplicate packages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will keep one package per provider and name (case-insensitive) and remove duplicates.
              Patient policies linked to removed packages will be reassigned to the kept package.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleanupLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanupDuplicates} disabled={cleanupLoading}>
              {cleanupLoading ? "Running..." : "Clean up"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead className="text-right">Limit</TableHead>
              <TableHead className="text-right">Co-pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading packages...</p>
                </TableCell>
              </TableRow>
            ) : filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No packages found
                </TableCell>
              </TableRow>
            ) : (
              filteredPackages.map((pkg) => (
                <TableRow key={pkg.packageId}>
                  <TableCell className="font-medium">{pkg.providerName ?? "—"}</TableCell>
                  <TableCell>
                    <span>{pkg.packageName ?? "—"}</span>
                    {pkg.packageCode && (
                      <span className="text-muted-foreground text-xs ml-1">({pkg.packageCode})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {pkg.coverageType ?? "both"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(pkg.coverageLimit)}</TableCell>
                  <TableCell className="text-right">
                    {pkg.coPayPercentage > 0 && `${pkg.coPayPercentage}%`}
                    {pkg.coPayPercentage > 0 && pkg.coPayAmount > 0 && " / "}
                    {pkg.coPayAmount > 0 && formatCurrency(pkg.coPayAmount)}
                    {!pkg.coPayPercentage && !pkg.coPayAmount && "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pkg.isActive ? "default" : "secondary"}>
                      {pkg.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(pkg)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(pkg)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(pkg)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedPackage && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Package Details</DialogTitle>
              <DialogDescription>{selectedPackage.packageName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedPackage.providerName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Package code</p>
                  <p className="font-medium">{selectedPackage.packageCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coverage type</p>
                  <p className="font-medium capitalize">{selectedPackage.coverageType ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coverage limit</p>
                  <p className="font-medium">{formatCurrency(selectedPackage.coverageLimit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Co-pay %</p>
                  <p className="font-medium">{selectedPackage.coPayPercentage ?? 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Co-pay amount</p>
                  <p className="font-medium">{formatCurrency(selectedPackage.coPayAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selectedPackage.isActive ? "default" : "secondary"}>
                    {selectedPackage.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {selectedPackage.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-sm">{selectedPackage.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the package. Policies using this package will have their package link cleared.
              {deletingPackage && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{deletingPackage.packageName}</p>
                  <p className="text-sm">{deletingPackage.providerName}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddInsurancePackageForm
        open={openAddForm}
        onOpenChange={(open) => {
          setOpenAddForm(open)
          if (!open) setEditingPackage(null)
        }}
        onSuccess={handlePackageSaved}
        editData={editingPackage}
      />
    </div>
  )
}
