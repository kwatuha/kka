"use client"

import { useState, useEffect, useCallback } from "react"
import { pharmacyApi, servicePointApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Edit, Trash2, MapPin, Users } from "lucide-react"
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
import { ServicePointForm } from "@/components/service-point-form"
import Link from "next/link"

interface Branch {
  branchId: number
  branchName: string
  branchCode?: string
}

interface ServicePointRow {
  servicePointId: number
  pointCode: string
  pointName: string
  branchId: number
  branchName?: string
  pointType: string
  isDefault: boolean
  location?: string
  isActive: boolean
}

const POINT_TYPE_LABELS: Record<string, string> = {
  registration: "Registration",
  triage: "Triage",
  consultation: "Consultation",
  cashier: "Cashier",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  radiology: "Radiology",
  billing: "Billing",
  telemedicine: "Telemedicine",
  procedure: "Procedure",
}

export default function ServicePointsSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [servicePoints, setServicePoints] = useState<ServicePointRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<ServicePointRow | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pointToDelete, setPointToDelete] = useState<ServicePointRow | null>(null)

  const loadBranches = useCallback(async () => {
    const data = await pharmacyApi.getBranches(undefined, "true")
    setBranches(data || [])
  }, [])

  const loadServicePoints = useCallback(async () => {
    try {
      setLoading(true)
      const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined
      const pointType = selectedType !== "all" ? selectedType : undefined
      const data = await servicePointApi.getAll(branchId, pointType, search || undefined, "all")
      setServicePoints(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load service points",
        variant: "destructive",
      })
      setServicePoints([])
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId, selectedType, search])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadServicePoints()
  }, [loadServicePoints])

  return (
    <div className="space-y-6">
      <BreadcrumbsEnhanced />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service points</h1>
          <p className="text-muted-foreground">
            Configure registration desks, triage bays, cashier windows, and other queue stations per branch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/service-point-assignments">
              <Users className="mr-2 h-4 w-4" />
              Staff assignments
            </Link>
          </Button>
          <Button onClick={() => { setSelectedPoint(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add service point
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Queue stations
          </CardTitle>
          <CardDescription>
            Each branch can have multiple physical points per queue type. Staff select their working desk from the queue dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search service points..."
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Queue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(POINT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicePoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No service points configured. Defaults are seeded per branch on migration.
                    </TableCell>
                  </TableRow>
                ) : (
                  servicePoints.map((point) => (
                    <TableRow key={point.servicePointId}>
                      <TableCell className="font-medium">
                        {point.pointName}
                        {point.isDefault ? (
                          <Badge variant="secondary" className="ml-2">Default</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{point.pointCode}</TableCell>
                      <TableCell>{POINT_TYPE_LABELS[point.pointType] || point.pointType}</TableCell>
                      <TableCell>{point.branchName || point.branchId}</TableCell>
                      <TableCell>{point.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={point.isActive ? "default" : "outline"}>
                          {point.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedPoint(point); setFormOpen(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setPointToDelete(point); setDeleteOpen(true) }}
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

      <ServicePointForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={selectedPoint}
        branches={branches}
        onSuccess={loadServicePoints}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate service point?</AlertDialogTitle>
            <AlertDialogDescription>
              {pointToDelete
                ? `"${pointToDelete.pointName}" will be hidden from selectors. Complete active queue entries first.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pointToDelete) return
                try {
                  await servicePointApi.delete(String(pointToDelete.servicePointId))
                  toast({ title: "Service point deactivated" })
                  loadServicePoints()
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Could not deactivate service point",
                    variant: "destructive",
                  })
                } finally {
                  setDeleteOpen(false)
                  setPointToDelete(null)
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
