"use client"

import { useState } from "react"
import { useCriticalNotifications } from "@/lib/critical-notifications-context"
import { sanitizeVitalUnit } from "@/lib/critical-vitals-utils"
import { useAuth } from "@/lib/auth/auth-context"
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function CriticalAlertsHeaderBadge() {
  const { notifications, removeNotification } = useCriticalNotifications()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Only show notifications to doctors and system administrators
  const userRole = typeof user?.role === 'string' 
    ? user.role.toLowerCase() 
    : (user?.role as any)?.roleName?.toLowerCase() || ""
  const canViewNotifications = userRole === "doctor" || userRole === "admin" || userRole === "administrator"
  
  // TEMPORARY: Allow all users to see alerts for debugging
  const DEBUG_MODE = true
  const canView = DEBUG_MODE || canViewNotifications

  if (!canView || notifications.length === 0) {
    return null
  }

  const criticalCount = notifications.reduce(
    (sum, n) => sum + (n.alerts || []).filter((a) => a.severity === 'critical').length,
    0
  )
  const urgentCount = notifications.reduce(
    (sum, n) => sum + (n.alerts || []).filter((a) => a.severity === 'urgent').length,
    0
  )

  const totalAlerts = criticalCount + urgentCount
  const totalPatients = notifications.length

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative h-8 w-8 border-red-500 hover:bg-red-50 dark:hover:bg-red-950 xl:h-9 xl:w-auto xl:gap-2 xl:px-3",
            criticalCount > 0 && "border-2 border-red-600",
          )}
          title={`${totalPatients} patient(s), ${totalAlerts} alert(s)`}
        >
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="hidden font-medium xl:inline">
            {totalPatients} {totalPatients === 1 ? "Patient" : "Patients"}
          </span>
          <Badge variant="destructive" className="absolute -right-1 -top-1 px-1 py-0 text-[10px] font-bold xl:static xl:ml-1 xl:px-1.5 xl:text-xs">
            {totalAlerts}
          </Badge>
          {isOpen ? (
            <ChevronUp className="hidden h-3 w-3 xl:block" />
          ) : (
            <ChevronDown className="hidden h-3 w-3 xl:block" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="bg-background border-2 border-red-500 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 dark:bg-red-700 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-700 dark:bg-red-800 p-1.5">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">Critical Alerts</div>
                <div className="text-xs text-red-100">
                  {totalPatients} {totalPatients === 1 ? 'patient' : 'patients'} • {totalAlerts} {totalAlerts === 1 ? 'alert' : 'alerts'}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-red-700 dark:hover:bg-red-800"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-3 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-950/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-foreground">
                        {notification.patientName || `Patient ${notification.patientId}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Patient ID: {notification.patientId}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeNotification(notification.patientId)}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {(notification.alerts || []).map((alert, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "text-xs p-2 rounded border",
                          alert.severity === 'critical'
                            ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
                            : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100"
                        )}
                      >
                        <div className="font-semibold mb-0.5">
                          {alert.parameter}
                        </div>
                        <div className="flex items-center justify-between">
                          <span>
                            Value: <span className="font-bold">{alert.value}</span> {sanitizeVitalUnit(alert.unit)}
                          </span>
                          <Badge
                            variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        {alert.range && (
                          <div className="text-xs mt-0.5 opacity-80">
                            Range: {alert.range}
                          </div>
                        )}
                        {alert.description && (
                          <div className="text-xs mt-0.5 opacity-70 italic">
                            {alert.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}



