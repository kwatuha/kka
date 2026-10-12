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
  DialogFooter,
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
import { insuranceApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2, ListChecks } from "lucide-react"
import { AddInsuranceProviderForm } from "@/components/add-insurance-provider-form"
import { ManageClaimRequirementsDialog } from "@/components/manage-claim-requirements-dialog"

export function InsuranceProvidersTable() {
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [openAddForm, setOpenAddForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<any>(null)
  const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false)
  const [selectedProviderForRequirements, setSelectedProviderForRequirements] = useState<any>(null)
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const data = await insuranceApi.getProviders()
      setProviders(data || [])
    } catch (error: any) {
      console.error("Error loading providers:", error)
      toast({
        title: "Error loading providers",
        description: error.message || "Failed to load insurance providers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (provider: any) => {
    try {
      const details = await insuranceApi.getProviderById(provider.providerId.toString())
      setSelectedProvider(details)
      setViewDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load provider details",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (provider: any) => {
    setEditingProvider(provider)
    setOpenAddForm(true)
  }

  const handleDeleteClick = (provider: any) => {
    setDeletingProvider(provider)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProvider) return

    try {
      setDeleteLoading(true)
      await insuranceApi.deleteProvider(deletingProvider.providerId.toString())
      toast({
        title: "Success",
        description: "Insurance provider deleted successfully",
      })
      setDeleteDialogOpen(false)
      setDeletingProvider(null)
      loadProviders()
    } catch (error: any) {
      const msg = error?.message || error?.response?.error || "Failed to delete provider"
      toast({
        title: "Cannot delete",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleProviderSaved = () => {
    loadProviders()
    setEditingProvider(null)
  }

  const handleCleanupDuplicates = async () => {
    try {
      setCleanupLoading(true)
      const result = await insuranceApi.cleanupDuplicateProviders()
      toast({
        title: "Cleanup complete",
        description: result.deleted
          ? `Removed ${result.deleted} duplicate(s). ${result.kept} unique providers kept.`
          : result.message,
      })
      setCleanupDialogOpen(false)
      loadProviders()
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

  // Deduplicate providers by providerId, name, or code
  // Keeps the first occurrence (oldest providerId) when duplicates are found
  const uniqueProviders = providers.reduce((acc, provider) => {
    // Check if a duplicate exists by ID, name, or code
    const isDuplicate = acc.find(p =>
      p.providerId === provider.providerId ||
      (provider.providerName && p.providerName?.toLowerCase() === provider.providerName.toLowerCase()) ||
      (provider.providerCode && p.providerCode?.toLowerCase() === provider.providerCode.toLowerCase())
    )

    if (!isDuplicate) {
      acc.push(provider)
    }
    return acc
  }, [] as any[])

  const filteredProviders = uniqueProviders.filter((provider) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      provider.providerName?.toLowerCase().includes(query) ||
      provider.providerCode?.toLowerCase().includes(query) ||
      provider.contactPerson?.toLowerCase().includes(query) ||
      provider.phone?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search providers..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCleanupDialogOpen(true)}
          >
            Clean up duplicates
          </Button>
          <Button onClick={() => {
            setEditingProvider(null)
            setOpenAddForm(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider Code</TableHead>
              <TableHead>Provider Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading providers...</p>
                </TableCell>
              </TableRow>
            ) : filteredProviders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No providers found
                </TableCell>
              </TableRow>
            ) : (
              filteredProviders.map((provider) => (
                <TableRow key={provider.providerId}>
                  <TableCell className="font-medium">{provider.providerCode || "-"}</TableCell>
                  <TableCell>{provider.providerName || "-"}</TableCell>
                  <TableCell>{provider.contactPerson || "-"}</TableCell>
                  <TableCell>{provider.phone || "-"}</TableCell>
                  <TableCell>{provider.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={provider.isActive ? "default" : "secondary"}>
                      {provider.isActive ? "Active" : "Inactive"}
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
                        <DropdownMenuItem onClick={() => handleView(provider)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(provider)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProviderForRequirements(provider)
                            setRequirementsDialogOpen(true)
                          }}
                        >
                          <ListChecks className="mr-2 h-4 w-4" />
                          Manage Requirements
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(provider)}
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

      {selectedProvider && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Provider Details</DialogTitle>
              <DialogDescription>View complete insurance provider information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider Code</p>
                  <p className="text-sm font-semibold">{selectedProvider.providerCode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider Name</p>
                  <p className="text-sm font-semibold">{selectedProvider.providerName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                  <p className="text-sm">{selectedProvider.contactPerson || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{selectedProvider.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedProvider.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedProvider.isActive ? "default" : "secondary"}>
                    {selectedProvider.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {selectedProvider.address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">{selectedProvider.address}</p>
                </div>
              )}
              {selectedProvider.claimsAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claims Address</p>
                  <p className="text-sm">{selectedProvider.claimsAddress}</p>
                </div>
              )}
              {selectedProvider.website && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <p className="text-sm">{selectedProvider.website}</p>
                </div>
              )}
              {selectedProvider.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedProvider.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean up duplicate providers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will keep one provider per unique name (case-insensitive) and remove duplicates.
              Policies, packages, and claim requirements will be reassigned to the kept provider.
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this insurance provider? This action cannot be undone.
              The provider must have no patient policies and no packages (remove them under Insurance → Policies and Packages first).
              {deletingProvider && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Provider: {deletingProvider.providerCode}</p>
                  <p className="text-sm">{deletingProvider.providerName}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddInsuranceProviderForm
        open={openAddForm}
        onOpenChange={(open: boolean) => {
          setOpenAddForm(open)
          if (!open) {
            setEditingProvider(null)
          }
        }}
        onSuccess={handleProviderSaved}
        editData={editingProvider}
      />

      {selectedProviderForRequirements && (
        <ManageClaimRequirementsDialog
          open={requirementsDialogOpen}
          onOpenChange={setRequirementsDialogOpen}
          providerId={selectedProviderForRequirements.providerId.toString()}
          providerName={selectedProviderForRequirements.providerName}
        />
      )}
    </div>
  )
}
