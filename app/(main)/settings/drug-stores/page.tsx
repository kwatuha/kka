"use client"

import { useState, useEffect, useCallback } from "react"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Edit, Trash2, Building2, MapPin } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { BranchForm } from "@/components/branch-form"
import { DrugStoreForm } from "@/components/drug-store-form"

interface Branch {
  branchId: number
  branchCode: string
  branchName: string
  letterheadTitle?: string
  address?: string
  postalAddress?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  receiptHeader?: string
  receiptFooter?: string
  isMainBranch: boolean
  isActive: boolean
  notes?: string
}

interface DrugStore {
  storeId: number
  storeCode: string
  storeName: string
  branchId: number
  branchName?: string
  branchCode?: string
  isMainBranch?: boolean
  isDispensingStore: boolean
  location?: string
  contactPerson?: string
  phone?: string
  email?: string
  isActive: boolean
  notes?: string
}

export default function DrugStoresPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [drugStores, setDrugStores] = useState<DrugStore[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [loadingStores, setLoadingStores] = useState(true)
  const [branchSearch, setBranchSearch] = useState("")
  const [storeSearch, setStoreSearch] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  // Branch form state
  const [branchFormOpen, setBranchFormOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

  // Store form state
  const [storeFormOpen, setStoreFormOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<DrugStore | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'branch' | 'store', id: number, name: string } | null>(null)

  const loadBranches = useCallback(async () => {
    try {
      setLoadingBranches(true)
      const data = await pharmacyApi.getBranches(branchSearch || undefined, 'all')
      setBranches(data)
    } catch (error: any) {
      console.error("Error loading branches:", error)
      toast({
        title: "Error",
        description: "Failed to load branches.",
        variant: "destructive",
      })
      setBranches([])
    } finally {
      setLoadingBranches(false)
    }
  }, [branchSearch])

  const loadDrugStores = useCallback(async () => {
    try {
      setLoadingStores(true)
      const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined
      const data = await pharmacyApi.getDrugStores(branchId, storeSearch || undefined, 'all')
      setDrugStores(data)
    } catch (error: any) {
      console.error("Error loading drug stores:", error)
      toast({
        title: "Error",
        description: "Failed to load drug stores.",
        variant: "destructive",
      })
      setDrugStores([])
    } finally {
      setLoadingStores(false)
    }
  }, [selectedBranchId, storeSearch])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadDrugStores()
  }, [loadDrugStores])

  const handleAddBranch = () => {
    setSelectedBranch(null)
    setBranchFormOpen(true)
  }

  const handleEditBranch = (branch: Branch) => {
    console.log('handleEditBranch called', branch)
    setSelectedBranch(branch)
    setBranchFormOpen(true)
    console.log('Branch form should be open now')
  }

  const handleDeleteBranch = (branch: Branch) => {
    setItemToDelete({ type: 'branch', id: branch.branchId, name: branch.branchName })
    setDeleteDialogOpen(true)
  }

  const handleAddStore = () => {
    setSelectedStore(null)
    setStoreFormOpen(true)
  }

  const handleEditStore = (store: DrugStore) => {
    console.log('handleEditStore called', store)
    setSelectedStore(store)
    setStoreFormOpen(true)
    console.log('Store form should be open now')
  }

  const handleDeleteStore = (store: DrugStore) => {
    setItemToDelete({ type: 'store', id: store.storeId, name: store.storeName })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      if (itemToDelete.type === 'branch') {
        await pharmacyApi.deleteBranch(itemToDelete.id.toString())
        toast({
          title: "Success",
          description: "Branch deleted successfully.",
        })
        loadBranches()
      } else {
        await pharmacyApi.deleteDrugStore(itemToDelete.id.toString())
        toast({
          title: "Success",
          description: "Drug store deleted successfully.",
        })
        loadDrugStores()
      }
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error: any) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 space-y-4">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "Drug Stores", href: "/settings/drug-stores", active: true },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drug Stores Management</h1>
        <p className="text-muted-foreground">
          Manage branches and drug stores/locations. Set main branch and dispensing stores per branch.
        </p>
      </div>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList>
          <TabsTrigger value="branches">
            <Building2 className="mr-2 h-4 w-4" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="stores">
            <MapPin className="mr-2 h-4 w-4" />
            Drug Stores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Branches</CardTitle>
                  <CardDescription>
                    Manage hospital branches/facilities. Set which branch is the main branch.
                  </CardDescription>
                </div>
                <Button onClick={handleAddBranch}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Branch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                  <Input
                    type="search"
                    placeholder="Search branches..."
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {loadingBranches ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch Code</TableHead>
                        <TableHead>Branch Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Main Branch</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.length > 0 ? (
                        branches.map((branch) => (
                          <TableRow key={branch.branchId}>
                            <TableCell className="font-medium">{branch.branchCode}</TableCell>
                            <TableCell className="font-medium">{branch.branchName}</TableCell>
                            <TableCell>{branch.address || '-'}</TableCell>
                            <TableCell>{branch.phone || '-'}</TableCell>
                            <TableCell>{branch.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                                {branch.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {branch.isMainBranch && (
                                <Badge variant="default">Main Branch</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditBranch(branch)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteBranch(branch)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No branches found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Drug Stores</CardTitle>
                  <CardDescription>
                    Manage drug stores/locations per branch. Set which store is the dispensing store for each branch.
                  </CardDescription>
                </div>
                <Button onClick={handleAddStore}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Store
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 gap-4">
                <div className="relative flex-1">
                  <Input
                    type="search"
                    placeholder="Search stores..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="w-48">
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.filter(b => b.isActive).map((branch) => (
                        <SelectItem key={branch.branchId} value={branch.branchId.toString()}>
                          {branch.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingStores ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store Code</TableHead>
                        <TableHead>Store Name</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dispensing Store</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drugStores.length > 0 ? (
                        drugStores.map((store) => (
                          <TableRow key={store.storeId}>
                            <TableCell className="font-medium">{store.storeCode}</TableCell>
                            <TableCell className="font-medium">{store.storeName}</TableCell>
                            <TableCell>
                              {store.branchName || '-'}
                              {store.isMainBranch && (
                                <Badge variant="outline" className="ml-2">Main</Badge>
                              )}
                            </TableCell>
                            <TableCell>{store.location || '-'}</TableCell>
                            <TableCell>{store.contactPerson || '-'}</TableCell>
                            <TableCell>{store.phone || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={store.isActive ? 'default' : 'secondary'}>
                                {store.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {store.isDispensingStore && (
                                <Badge variant="default">Dispensing</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditStore(store)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStore(store)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No drug stores found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Branch Form Dialog */}
      <BranchForm
        open={branchFormOpen}
        onOpenChange={setBranchFormOpen}
        onSuccess={() => {
          loadBranches()
          setBranchFormOpen(false)
        }}
        editData={selectedBranch}
      />

      {/* Store Form Dialog */}
      <DrugStoreForm
        open={storeFormOpen}
        onOpenChange={setStoreFormOpen}
        onSuccess={() => {
          loadDrugStores()
          setStoreFormOpen(false)
        }}
        editData={selectedStore}
        branches={branches.filter(b => b.isActive)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {itemToDelete?.type === 'branch' ? 'the branch' : 'the drug store'} "{itemToDelete?.name}".
              {itemToDelete?.type === 'branch' && ' This action will also deactivate all associated drug stores.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

