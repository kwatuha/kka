"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { notificationApi } from "@/lib/api"
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
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"

interface DrugNotification {
  notificationId: number
  medicationId: number
  medicationName: string
  prescriptionId: number | null
  prescriptionNumber: string | null
  prescriptionItemId: number | null
  doctorId: number | null
  doctorName: string | null
  patientId: number | null
  patientName: string | null
  status: 'pending' | 'acknowledged' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  message: string
  acknowledgedBy: number | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  dosage?: string
  frequency?: string
  duration?: string
}

export default function DrugNotificationsPage() {
  const [notifications, setNotifications] = useState<DrugNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [notificationToResolve, setNotificationToResolve] = useState<DrugNotification | null>(null)
  const [notificationToDelete, setNotificationToDelete] = useState<DrugNotification | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [statusFilter, priorityFilter, searchTerm])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationApi.getDrugNotifications(
        statusFilter !== "all" ? statusFilter : undefined,
        priorityFilter !== "all" ? priorityFilter : undefined,
        searchTerm || undefined
      )
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Error loading notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load drug notifications.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (notification: DrugNotification) => {
    try {
      await notificationApi.acknowledgeDrugNotification(notification.notificationId.toString())
      toast({
        title: "Success",
        description: "Notification acknowledged successfully.",
      })
      loadNotifications()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge notification.",
        variant: "destructive",
      })
    }
  }

  const handleResolve = async () => {
    if (!notificationToResolve) return

    try {
      setIsResolving(true)
      await notificationApi.resolveDrugNotification(notificationToResolve.notificationId.toString())
      toast({
        title: "Success",
        description: "Notification resolved successfully.",
      })
      setNotificationToResolve(null)
      loadNotifications()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve notification.",
        variant: "destructive",
      })
    } finally {
      setIsResolving(false)
    }
  }

  const handleDelete = async () => {
    if (!notificationToDelete) return

    try {
      setIsDeleting(true)
      await notificationApi.deleteDrugNotification(notificationToDelete.notificationId.toString())
      toast({
        title: "Success",
        description: "Notification deleted successfully.",
      })
      setNotificationToDelete(null)
      loadNotifications()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pending</Badge>
      case 'acknowledged':
        return <Badge variant="default">Acknowledged</Badge>
      case 'resolved':
        return <Badge variant="secondary">Resolved</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="default">Medium</Badge>
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const pendingCount = notifications.filter(n => n.status === 'pending').length
  const acknowledgedCount = notifications.filter(n => n.status === 'acknowledged').length
  const resolvedCount = notifications.filter(n => n.status === 'resolved').length

  return (
    <div className="flex flex-col gap-4">
      <BreadcrumbsEnhanced
        segments={[
          { title: "Home", href: "/" },
          { title: "Supply Chain", href: "/procurement" },
          { title: "Drug Notifications", href: "/procurement/notifications", active: true },
        ]}
        className="mb-4"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drug Notifications</h1>
          <p className="text-muted-foreground">Notifications for drugs prescribed but not in inventory</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Notifications awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acknowledgedCount}</div>
            <p className="text-xs text-muted-foreground">Notifications acknowledged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground">Notifications resolved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Drug notifications from prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search notifications..."
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
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No notifications found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Prescription</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow key={notification.notificationId}>
                        <TableCell className="font-medium">
                          {notification.medicationName}
                          {notification.dosage && (
                            <div className="text-sm text-muted-foreground">
                              {notification.dosage} - {notification.frequency} - {notification.duration}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{notification.doctorName || 'N/A'}</TableCell>
                        <TableCell>{notification.patientName || 'N/A'}</TableCell>
                        <TableCell>{notification.prescriptionNumber || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(notification.status)}</TableCell>
                        <TableCell>{getPriorityBadge(notification.priority)}</TableCell>
                        <TableCell>{formatDate(notification.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {notification.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcknowledge(notification)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                            {notification.status !== 'resolved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNotificationToResolve(notification)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Resolve
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
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!notificationToResolve} onOpenChange={(open) => !open && setNotificationToResolve(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this notification as resolved?
              {notificationToResolve && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">{notificationToResolve.medicationName}</p>
                  <p className="text-sm text-muted-foreground">{notificationToResolve.message}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolve} disabled={isResolving}>
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!notificationToDelete} onOpenChange={(open) => !open && setNotificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}








