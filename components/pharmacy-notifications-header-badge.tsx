"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { notificationApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/hooks/use-toast"

export function PharmacyNotificationsHeaderBadge() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const roleName = String(
    typeof user?.role === "string" ? user.role : (user?.role as any)?.roleName || ""
  ).toLowerCase()

  const canView =
    roleName.includes("pharmac") ||
    roleName.includes("chemist") ||
    roleName.includes("admin")

  const loadNotifications = useCallback(async () => {
    if (!canView) return
    try {
      setLoading(true)
      const data = await notificationApi.getPharmacyNotifications({ status: "pending", limit: 20 })
      const list = Array.isArray(data) ? data : []
      setNotifications(list)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [canView])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) void loadNotifications()
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const acknowledge = async (notificationId: number) => {
    try {
      await notificationApi.acknowledgePharmacyNotification(String(notificationId))
      await loadNotifications()
      toast({ title: "Notification acknowledged" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to acknowledge notification", variant: "destructive" })
    }
  }

  if (!canView) return null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8 xl:h-9 xl:w-auto xl:gap-2 xl:px-3">
          <Bell className="h-4 w-4" />
          <span className="hidden xl:inline">Pharmacy</span>
          {notifications.length > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 px-1 py-0 text-[10px] xl:static xl:px-1.5 xl:text-xs"
            >
              {notifications.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" side="bottom" sideOffset={8}>
        <div className="border-b px-4 py-3">
          <div className="font-medium">Pharmacy notifications</div>
          <div className="text-xs text-muted-foreground">
            Stock requests, dispatches, and low-stock alerts
            {notifications.length > 0 ? ` · ${notifications.length} pending` : ""}
          </div>
        </div>
        <ScrollArea className="h-80 w-full">
          <div className="p-0">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No pending notifications</div>
            ) : (
              notifications.map((notification) => {
                const id = notification.notificationId ?? notification.id
                return (
                  <div key={String(id)} className="border-b px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">
                          {notification.title || "Pharmacy alert"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {notification.message || "No details"}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {String(notification.notificationType || "alert").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => acknowledge(Number(id))}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Acknowledge
                      </Button>
                      {notification.referenceType === "chemist_stock_request" ? (
                        <Button size="sm" variant="ghost" asChild>
                          <Link href="/pharmacy?tab=drug-movement" onClick={() => setOpen(false)}>
                            Open
                          </Link>
                        </Button>
                      ) : notification.referenceType === "low_stock" ||
                        notification.notificationType === "low_stock" ? (
                        <Button size="sm" variant="ghost" asChild>
                          <Link href="/pharmacy" onClick={() => setOpen(false)}>
                            Pharmacy
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
