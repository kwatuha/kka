"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { notificationApi } from "@/lib/api"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/hooks/use-toast"

export function PublicHealthNotificationsHeaderBadge() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const roleName = String(
    typeof user?.role === "string" ? user.role : (user?.role as any)?.roleName || ""
  ).toLowerCase()

  const canView =
    roleName.includes("admin") ||
    roleName.includes("doctor") ||
    roleName.includes("nurse") ||
    roleName.includes("registration")

  const loadNotifications = useCallback(async () => {
    if (!canView) return
    try {
      setLoading(true)
      const data = await notificationApi.getStaffNotifications({ status: "pending", limit: 20 })
      setNotifications(data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 45000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const acknowledge = async (notificationId: number) => {
    try {
      await notificationApi.acknowledgeStaffNotification(String(notificationId))
      await loadNotifications()
      toast({ title: "Alert acknowledged" })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge",
        variant: "destructive",
      })
    }
  }

  if (!canView) return null

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (next) void loadNotifications()
    }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8 xl:h-9 xl:w-auto xl:gap-2 xl:px-3">
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden xl:inline">Public health</span>
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
      <PopoverContent className="w-[400px] p-0" align="end" side="bottom" sideOffset={8}>
        <div className="border-b px-4 py-3">
          <div className="font-medium">Public health alerts</div>
          <div className="text-xs text-muted-foreground">IDSR and notifiable disease notifications</div>
        </div>
        <ScrollArea className="h-80 w-full">
          <div className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No pending alerts</div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.notificationId} className="border-b px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{notification.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{notification.message}</div>
                  </div>
                  <Badge
                    variant={notification.severity === "critical" ? "destructive" : "outline"}
                    className="shrink-0 text-[10px]"
                  >
                    {notification.severity}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => acknowledge(notification.notificationId)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Acknowledge
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/idsr-alerts" onClick={() => setOpen(false)}>
                      IDSR desk
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
