"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, Edit, Trash2, MoreHorizontal, Loader2, Ambulance as AmbulanceIcon, MapPin, Phone, Clock } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { ambulanceApi } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function AmbulancePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ambulances, setAmbulances] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [tripStatusFilter, setTripStatusFilter] = useState<string | null>(null)
  const [tripSearchQuery, setTripSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isTripFormOpen, setIsTripFormOpen] = useState(false)
  const [editingAmbulance, setEditingAmbulance] = useState<any>(null)
  const [editingTrip, setEditingTrip] = useState<any>(null)
  const [deletingAmbulance, setDeletingAmbulance] = useState<any>(null)
  const [deletingTrip, setDeletingTrip] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [tripDeleteLoading, setTripDeleteLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [tripFormLoading, setTripFormLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "",
    driverName: "",
    driverPhone: "",
    status: "available",
    capacity: "",
    equipment: "",
  })

  const [tripFormData, setTripFormData] = useState({
    ambulanceId: "",
    patientId: "",
    patientName: "",
    patientPhone: "",
    pickupLocation: "",
    destination: "",
    tripType: "emergency",
    status: "scheduled",
    notes: "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      loadAmbulances()
      loadTrips()
    }
  }, [isMounted])

  // Reload when filters change
  useEffect(() => {
    if (isMounted) {
      loadAmbulances()
    }
  }, [statusFilter])

  useEffect(() => {
    if (isMounted) {
      loadTrips()
    }
  }, [tripStatusFilter])

  const loadAmbulances = async () => {
    try {
      setLoading(true)
      const data = await ambulanceApi.getAll(statusFilter || undefined)
      setAmbulances(data || [])
    } catch (error: any) {
      console.error("Error loading ambulances:", error)
      toast({
        title: "Error loading ambulances",
        description: error.message || "Failed to load ambulances",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTrips = async () => {
    try {
      const data = await ambulanceApi.getTrips(tripStatusFilter || undefined)
      setTrips(data || [])
    } catch (error: any) {
      console.error("Error loading trips:", error)
      toast({
        title: "Error loading trips",
        description: error.message || "Failed to load trips",
        variant: "destructive",
      })
    }
  }

  const handleCreateAmbulance = () => {
    setEditingAmbulance(null)
    setFormData({
      vehicleNumber: "",
      vehicleType: "",
      driverName: "",
      driverPhone: "",
      status: "available",
      capacity: "",
      equipment: "",
    })
    setIsFormOpen(true)
  }

  const handleEditAmbulance = (ambulance: any) => {
    setEditingAmbulance(ambulance)
    setFormData({
      vehicleNumber: ambulance.vehicleNumber || "",
      vehicleType: ambulance.vehicleType || "",
      driverName: ambulance.driverName || "",
      driverPhone: ambulance.driverPhone || "",
      status: ambulance.status || "available",
      capacity: ambulance.capacity?.toString() || "",
      equipment: ambulance.equipment || "",
    })
    setIsFormOpen(true)
  }

  const handleSaveAmbulance = async () => {
    try {
      setFormLoading(true)
      if (editingAmbulance) {
        await ambulanceApi.update(editingAmbulance.ambulanceId.toString(), formData)
        toast({ title: "Ambulance updated", description: "Ambulance has been updated successfully." })
      } else {
        await ambulanceApi.create(formData)
        toast({ title: "Ambulance added", description: "Ambulance has been added successfully." })
      }
      setIsFormOpen(false)
      setEditingAmbulance(null)
      loadAmbulances()
    } catch (error: any) {
      console.error("Error saving ambulance:", error)
      toast({
        title: "Error saving ambulance",
        description: error.message || "Failed to save ambulance",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteAmbulance = async () => {
    if (!deletingAmbulance) return

    try {
      setDeleteLoading(true)
      await ambulanceApi.delete(deletingAmbulance.ambulanceId.toString())
      toast({
        title: "Ambulance removed",
        description: "Ambulance has been removed successfully.",
      })
      setDeletingAmbulance(null)
      loadAmbulances()
    } catch (error: any) {
      console.error("Error deleting ambulance:", error)
      toast({
        title: "Error removing ambulance",
        description: error.message || "Failed to remove ambulance",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCreateTrip = () => {
    setEditingTrip(null)
    setTripFormData({
      ambulanceId: "",
      patientId: "",
      patientName: "",
      patientPhone: "",
      pickupLocation: "",
      destination: "",
      tripType: "emergency",
      status: "scheduled",
      notes: "",
    })
    setIsTripFormOpen(true)
  }

  const handleEditTrip = (trip: any) => {
    setEditingTrip(trip)
    setTripFormData({
      ambulanceId: trip.ambulanceId?.toString() || "",
      patientId: trip.patientId?.toString() || "",
      patientName: trip.patientName || "",
      patientPhone: trip.patientPhone || "",
      pickupLocation: trip.pickupLocation || "",
      destination: trip.destination || "",
      tripType: trip.tripType || "emergency",
      status: trip.status || "scheduled",
      notes: trip.notes || "",
    })
    setIsTripFormOpen(true)
  }

  const handleSaveTrip = async () => {
    try {
      setTripFormLoading(true)
      if (editingTrip) {
        await ambulanceApi.updateTrip(editingTrip.tripId.toString(), tripFormData)
        toast({ title: "Trip updated", description: "Trip has been updated successfully." })
      } else {
        await ambulanceApi.createTrip(tripFormData)
        toast({ title: "Trip created", description: "Trip has been created successfully." })
      }
      setIsTripFormOpen(false)
      setEditingTrip(null)
      loadTrips()
      loadAmbulances()
    } catch (error: any) {
      console.error("Error saving trip:", error)
      toast({
        title: "Error saving trip",
        description: error.message || "Failed to save trip",
        variant: "destructive",
      })
    } finally {
      setTripFormLoading(false)
    }
  }

  const handleDeleteTrip = async () => {
    if (!deletingTrip) return

    try {
      setTripDeleteLoading(true)
      await ambulanceApi.deleteTrip(deletingTrip.tripId.toString())
      toast({
        title: "Trip cancelled",
        description: "Trip has been cancelled successfully.",
      })
      setDeletingTrip(null)
      loadTrips()
      loadAmbulances()
    } catch (error: any) {
      console.error("Error deleting trip:", error)
      toast({
        title: "Error cancelling trip",
        description: error.message || "Failed to cancel trip",
        variant: "destructive",
      })
    } finally {
      setTripDeleteLoading(false)
    }
  }

  const filteredAmbulances = ambulances.filter((ambulance) => {
    const matchesSearch =
      !searchQuery ||
      (ambulance.vehicleNumber && ambulance.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ambulance.driverName && ambulance.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ambulance.vehicleType && ambulance.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = !statusFilter || ambulance.status === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      !tripSearchQuery ||
      (trip.patientName && trip.patientName.toLowerCase().includes(tripSearchQuery.toLowerCase())) ||
      (trip.pickupLocation && trip.pickupLocation.toLowerCase().includes(tripSearchQuery.toLowerCase())) ||
      (trip.destination && trip.destination.toLowerCase().includes(tripSearchQuery.toLowerCase()))

    const matchesStatus = !tripStatusFilter || trip.status === tripStatusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const availableAmbulances = ambulances.filter((a) => a.status === "available").length
  const onTripAmbulances = ambulances.filter((a) => a.status === "on_trip").length
  const maintenanceAmbulances = ambulances.filter((a) => a.status === "maintenance").length
  const activeTrips = trips.filter((t) => t.status === "in_progress" || t.status === "scheduled").length

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ambulance Management</h1>
            <p className="text-muted-foreground">Manage ambulance fleet and trips</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ambulance Management</h1>
          <p className="text-muted-foreground">Manage ambulance fleet and emergency transport services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateTrip}>
            <Plus className="mr-2 h-4 w-4" />
            New Trip
          </Button>
          <Button onClick={handleCreateAmbulance}>
            <Plus className="mr-2 h-4 w-4" />
            Add Ambulance
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ambulances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ambulances.length}</div>
            <p className="text-xs text-muted-foreground">Fleet size</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableAmbulances}</div>
            <p className="text-xs text-muted-foreground">Ready for dispatch</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTripAmbulances}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTrips}</div>
            <p className="text-xs text-muted-foreground">Scheduled or in progress</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ambulances" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ambulances">Ambulance Fleet</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>

        <TabsContent value="ambulances" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ambulance Fleet</CardTitle>
              <CardDescription>View and manage ambulance vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "available" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("available")}
                  >
                    Available
                  </Button>
                  <Button
                    variant={statusFilter === "on_trip" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("on_trip")}
                  >
                    On Trip
                  </Button>
                  <Button
                    variant={statusFilter === "maintenance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("maintenance")}
                  >
                    Maintenance
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search ambulances..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Loading ambulances...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredAmbulances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No ambulances found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAmbulances.map((ambulance) => (
                        <TableRow key={ambulance.ambulanceId}>
                          <TableCell className="font-medium">{ambulance.vehicleNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ambulance.vehicleType || "Standard"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ambulance.driverName || "-"}</p>
                              {ambulance.driverPhone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {ambulance.driverPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{ambulance.capacity || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ambulance.status === "available"
                                  ? "default"
                                  : ambulance.status === "on_trip"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {ambulance.status ? ambulance.status.replace("_", " ").toUpperCase() : "UNKNOWN"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAmbulance(ambulance)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingAmbulance(ambulance)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ambulance Trips</CardTitle>
              <CardDescription>View and manage ambulance trips and dispatches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant={tripStatusFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripStatusFilter(null)}
                  >
                    All
                  </Button>
                  <Button
                    variant={tripStatusFilter === "scheduled" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripStatusFilter("scheduled")}
                  >
                    Scheduled
                  </Button>
                  <Button
                    variant={tripStatusFilter === "in_progress" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripStatusFilter("in_progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant={tripStatusFilter === "completed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripStatusFilter("completed")}
                  >
                    Completed
                  </Button>
                  <Button
                    variant={tripStatusFilter === "cancelled" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTripStatusFilter("cancelled")}
                  >
                    Cancelled
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search trips..."
                    className="w-full pl-8"
                    value={tripSearchQuery}
                    onChange={(e) => setTripSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Trip Type</TableHead>
                      <TableHead>Pickup Location</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No trips found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrips.map((trip) => (
                        <TableRow key={trip.tripId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{trip.patientName || "-"}</p>
                              {trip.patientPhone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {trip.patientPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={trip.tripType === "emergency" ? "destructive" : "outline"}>
                              {trip.tripType ? trip.tripType.toUpperCase() : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {trip.pickupLocation || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {trip.destination || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trip.status === "completed"
                                  ? "default"
                                  : trip.status === "in_progress"
                                    ? "secondary"
                                    : trip.status === "cancelled"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {trip.status ? trip.status.replace("_", " ").toUpperCase() : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTrip(trip)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingTrip(trip)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Cancel
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ambulance Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAmbulance ? "Edit Ambulance" : "Add New Ambulance"}</DialogTitle>
            <DialogDescription>
              {editingAmbulance ? "Update ambulance information" : "Add a new ambulance to the fleet"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input
                  id="vehicleNumber"
                  placeholder="e.g., KCA 123A"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select value={formData.vehicleType} onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}>
                  <SelectTrigger id="vehicleType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Life Support</SelectItem>
                    <SelectItem value="advanced">Advanced Life Support</SelectItem>
                    <SelectItem value="mobile_icu">Mobile ICU</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name *</Label>
                <Input
                  id="driverName"
                  placeholder="Driver full name"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driverPhone">Driver Phone *</Label>
                <Input
                  id="driverPhone"
                  placeholder="e.g., 0712345678"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Number of patients"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_trip">On Trip</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Textarea
                id="equipment"
                placeholder="List equipment (e.g., Oxygen, Defibrillator, Stretcher)"
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveAmbulance} disabled={formLoading || !formData.vehicleNumber || !formData.driverName}>
              {formLoading ? "Saving..." : editingAmbulance ? "Update" : "Add"} Ambulance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trip Form Dialog */}
      <Dialog open={isTripFormOpen} onOpenChange={setIsTripFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTrip ? "Edit Trip" : "Create New Trip"}</DialogTitle>
            <DialogDescription>
              {editingTrip ? "Update trip information" : "Schedule a new ambulance trip"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tripAmbulanceId">Ambulance *</Label>
                <Select
                  value={tripFormData.ambulanceId}
                  onValueChange={(value) => setTripFormData({ ...tripFormData, ambulanceId: value })}
                >
                  <SelectTrigger id="tripAmbulanceId">
                    <SelectValue placeholder="Select ambulance" />
                  </SelectTrigger>
                  <SelectContent>
                    {ambulances
                      .filter((a) => a.status === "available")
                      .map((ambulance) => (
                        <SelectItem key={ambulance.ambulanceId} value={ambulance.ambulanceId.toString()}>
                          {ambulance.vehicleNumber} - {ambulance.driverName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripType">Trip Type *</Label>
                <Select
                  value={tripFormData.tripType}
                  onValueChange={(value) => setTripFormData({ ...tripFormData, tripType: value })}
                >
                  <SelectTrigger id="tripType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="discharge">Discharge</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input
                  id="patientName"
                  placeholder="Patient full name"
                  value={tripFormData.patientName}
                  onChange={(e) => setTripFormData({ ...tripFormData, patientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientPhone">Patient Phone</Label>
                <Input
                  id="patientPhone"
                  placeholder="e.g., 0712345678"
                  value={tripFormData.patientPhone}
                  onChange={(e) => setTripFormData({ ...tripFormData, patientPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupLocation">Pickup Location *</Label>
              <Input
                id="pickupLocation"
                placeholder="Address or location"
                value={tripFormData.pickupLocation}
                onChange={(e) => setTripFormData({ ...tripFormData, pickupLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                placeholder="Destination address"
                value={tripFormData.destination}
                onChange={(e) => setTripFormData({ ...tripFormData, destination: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tripStatus">Status *</Label>
                <Select
                  value={tripFormData.status}
                  onValueChange={(value) => setTripFormData({ ...tripFormData, status: value })}
                >
                  <SelectTrigger id="tripStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tripNotes">Notes</Label>
              <Textarea
                id="tripNotes"
                placeholder="Additional notes or instructions"
                value={tripFormData.notes}
                onChange={(e) => setTripFormData({ ...tripFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTripFormOpen(false)} disabled={tripFormLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTrip}
              disabled={
                tripFormLoading ||
                !tripFormData.ambulanceId ||
                !tripFormData.patientName ||
                !tripFormData.pickupLocation ||
                !tripFormData.destination
              }
            >
              {tripFormLoading ? "Saving..." : editingTrip ? "Update" : "Create"} Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Ambulance Dialog */}
      <AlertDialog open={!!deletingAmbulance} onOpenChange={(open) => !open && setDeletingAmbulance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Ambulance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this ambulance from the fleet?
              {deletingAmbulance && (
                <>
                  <br />
                  <br />
                  <strong>Vehicle:</strong> {deletingAmbulance.vehicleNumber}
                  <br />
                  <strong>Driver:</strong> {deletingAmbulance.driverName}
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAmbulance}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Trip Dialog */}
      <AlertDialog open={!!deletingTrip} onOpenChange={(open) => !open && setDeletingTrip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this trip?
              {deletingTrip && (
                <>
                  <br />
                  <br />
                  <strong>Patient:</strong> {deletingTrip.patientName}
                  <br />
                  <strong>From:</strong> {deletingTrip.pickupLocation}
                  <br />
                  <strong>To:</strong> {deletingTrip.destination}
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={tripDeleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              disabled={tripDeleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {tripDeleteLoading ? "Cancelling..." : "Cancel Trip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

