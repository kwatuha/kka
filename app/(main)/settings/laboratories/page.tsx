"use client"

import { useState, useEffect, useCallback } from "react"
import { pharmacyApi, laboratoryApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Edit, Trash2, FlaskConical, ListChecks } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { LaboratoryUnitForm } from "@/components/laboratory-unit-form"
import { LabTestOfferingsDialog } from "@/components/laboratory/lab-test-offerings-dialog"

interface Branch {
  branchId: number
  branchName: string
  branchCode?: string
}

interface LaboratoryUnit {
  labId: number
  labCode: string
  labName: string
  branchId: number
  branchName?: string
  isDefault: boolean
  location?: string
  isActive: boolean
}

export default function LaboratoriesSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [laboratories, setLaboratories] = useState<LaboratoryUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedLab, setSelectedLab] = useState<LaboratoryUnit | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [labToDelete, setLabToDelete] = useState<LaboratoryUnit | null>(null)
  const [offeringsOpen, setOfferingsOpen] = useState(false)
  const [offeringsLab, setOfferingsLab] = useState<LaboratoryUnit | null>(null)

  const loadBranches = useCallback(async () => {
    const data = await pharmacyApi.getBranches(undefined, "true")
    setBranches(data || [])
  }, [])

  const loadLaboratories = useCallback(async () => {
    try {
      setLoading(true)
      const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined
      const data = await laboratoryApi.getLaboratories(branchId, search || undefined, "all")
      setLaboratories(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load laboratories",
        variant: "destructive",
      })
      setLaboratories([])
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId, search])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadLaboratories()
  }, [loadLaboratories])

  return (
    <div className="space-y-6">
      <BreadcrumbsEnhanced />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laboratory units</h1>
          <p className="text-muted-foreground">
            Manage multiple laboratory units per facility branch (main lab, hematology, microbiology, etc.).
          </p>
        </div>
        <Button onClick={() => { setSelectedLab(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add laboratory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Laboratories
          </CardTitle>
          <CardDescription>
            Branches are managed under Drug Stores. Each branch can have several lab units; one may be marked default.
            Map which test types each unit offers so clinicians see the right destinations when ordering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search laboratories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.branchId} value={String(branch.branchId)}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laboratories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No laboratories configured. Add one for each lab unit in your facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  laboratories.map((lab) => (
                    <TableRow key={lab.labId}>
                      <TableCell className="font-medium">
                        {lab.labName}
                        {lab.isDefault ? (
                          <Badge variant="secondary" className="ml-2">Default</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{lab.labCode}</TableCell>
                      <TableCell>{lab.branchName || lab.branchId}</TableCell>
                      <TableCell>{lab.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={lab.isActive ? "default" : "outline"}>
                          {lab.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Map offered tests"
                          onClick={() => { setOfferingsLab(lab); setOfferingsOpen(true) }}
                        >
                          <ListChecks className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedLab(lab); setFormOpen(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setLabToDelete(lab); setDeleteOpen(true) }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LaboratoryUnitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={selectedLab}
        branches={branches}
        onSuccess={loadLaboratories}
      />

      <LabTestOfferingsDialog
        open={offeringsOpen}
        onOpenChange={setOfferingsOpen}
        lab={offeringsLab}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate laboratory?</AlertDialogTitle>
            <AlertDialogDescription>
              {labToDelete
                ? `"${labToDelete.labName}" will be hidden from selectors. Active orders must be completed first.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!labToDelete) return
                try {
                  await laboratoryApi.deleteLaboratory(String(labToDelete.labId))
                  toast({ title: "Laboratory deactivated" })
                  loadLaboratories()
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Could not deactivate laboratory",
                    variant: "destructive",
                  })
                } finally {
                  setDeleteOpen(false)
                  setLabToDelete(null)
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
