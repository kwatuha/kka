"use client"

import { useState, useEffect } from "react"
import { useCriticalNotifications } from "@/lib/critical-notifications-context"
import { sanitizeVitalUnit } from "@/lib/critical-vitals-utils"
import { useAuth } from "@/lib/auth/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingCriticalNotifications() {
  const { notifications, removeNotification, refreshNotifications } = useCriticalNotifications()
  const { user } = useAuth()
  const [isMinimized, setIsMinimized] = useState(true) // Start minimized by default

  // Only show notifications to doctors and system administrators
  // Handle both string role and role object with roleName
  const userRole = typeof user?.role === 'string' 
    ? user.role.toLowerCase() 
    : (user?.role as any)?.roleName?.toLowerCase() || ""
  const canViewNotifications = userRole === "doctor" || userRole === "admin" || userRole === "administrator"
  
  // Enhanced debug logging for role check
  console.log('🔍 [ROLE CHECK]', {
    user: user ? { id: user.id, role: user.role, roleType: typeof user.role } : 'no user',
    userRole,
    canViewNotifications,
    roleCheck: {
      isDoctor: userRole === "doctor",
      isAdmin: userRole === "admin",
      isAdministrator: userRole === "administrator"
    }
  })

  // Debug logging
  useEffect(() => {
    console.log('🔔 [FLOATING ALERTS] Component render:', {
      notificationsCount: notifications.length,
      userRole,
      canViewNotifications,
      user: user ? { id: user.id, role: user.role } : 'no user',
      notifications: notifications.map(n => ({ 
        patientId: n.patientId, 
        patientName: n.patientName, 
        alertsCount: n.alerts.length,
        alerts: n.alerts.map(a => ({ parameter: a.parameter, severity: a.severity }))
      }))
    })
  }, [notifications, userRole, canViewNotifications, user])

  // TEMPORARY: Allow all users to see alerts for debugging
  // TODO: Re-enable role check after debugging
  const DEBUG_MODE = true // Set to false to re-enable role check
  const canView = DEBUG_MODE || canViewNotifications

  // Don't render if user doesn't have permission
  if (!canView) {
    console.log('⚠️ [FLOATING ALERTS] Not rendering: user does not have permission. Role:', userRole, 'User:', user, 'DEBUG_MODE:', DEBUG_MODE)
    return null
  }
  
  if (DEBUG_MODE && !canViewNotifications) {
    console.log('🔧 [DEBUG MODE] Role check would block, but DEBUG_MODE is enabled. Showing alerts anyway.')
  }

  if (notifications.length === 0) {
    console.log('ℹ️ [FLOATING ALERTS] Not rendering: no notifications')
    return null
  }
  
  console.log('✅ [FLOATING ALERTS] Rendering component with', notifications.length, 'notifications')

  const criticalCount = notifications.reduce(
    (sum, n) => sum + n.alerts.filter((a) => a.severity === 'critical').length,
    0
  )
  const urgentCount = notifications.reduce(
    (sum, n) => sum + n.alerts.filter((a) => a.severity === 'urgent').length,
    0
  )

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-[9999] transition-all duration-300",
        isMinimized ? "w-72" : "w-[380px]", // Narrower to avoid blocking
        "max-w-[calc(100vw-20rem)]" // Ensure it doesn't overlap sidebar + margin
      )}
      style={{ 
        // Position at bottom left to avoid blocking tabs, form content, and save button
        bottom: '1rem', // 16px from bottom
        left: 'calc(16rem + 1rem)', // 16rem (sidebar width) + 1rem margin
        maxHeight: 'calc(100vh - 8rem)', // Ensure it doesn't go above viewport
      }}
    >
      <div className="bg-background border-2 border-red-500 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-red-600 dark:bg-red-700 text-white p-3 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="rounded-full bg-red-700 dark:bg-red-800 p-1.5 flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate text-white">
                Critical Alerts
              </h3>
              <p className="text-xs text-red-50 dark:text-red-100 truncate font-medium">
                {notifications.length} patient{notifications.length > 1 ? 's' : ''} • {criticalCount} critical
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-red-700 h-7 w-7 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(!isMinimized)
              }}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="max-h-[50vh] overflow-y-auto">
            {criticalCount > 0 && (
              <Alert variant="destructive" className="m-3 border-2 border-red-500 py-2 bg-red-950/30 dark:bg-red-950/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle className="text-sm font-bold text-red-50 dark:text-red-100">
                  {criticalCount} CRITICAL Value{criticalCount > 1 ? 's' : ''} - Immediate Action Required
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs text-red-100 dark:text-red-200">
                  Life-threatening conditions requiring immediate medical intervention.
                </AlertDescription>
              </Alert>
            )}

            <div className="p-3 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-2 border-red-400 dark:border-red-500 rounded-lg p-3 bg-red-50 dark:bg-red-950/40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-red-950 dark:text-red-50 truncate">
                        {notification.patientName || `Patient ID: ${notification.patientId}`}
                      </h4>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0 ml-2"
                      onClick={() => removeNotification(notification.patientId)}
                      title="Dismiss (will reappear if patient not served)"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {notification.alerts.map((alert, index) => (
                      <Alert
                        key={index}
                        variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                        className={cn(
                          "py-2",
                          alert.severity === 'critical'
                            ? 'border-2 border-red-500 bg-red-100/50 dark:bg-red-950/30'
                            : 'border-2 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn(
                            "h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                            alert.severity === 'critical' 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          )} />
                          <div className="flex-1 min-w-0">
                            <AlertTitle className="flex items-center justify-between text-xs mb-1">
                              <span className={cn(
                                "font-semibold truncate",
                                alert.severity === 'critical'
                                  ? 'text-red-950 dark:text-red-50'
                                  : 'text-orange-950 dark:text-orange-100'
                              )}>
                                {alert.parameter}
                              </span>
                              <Badge
                                variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                                className="ml-2 text-[10px] px-1.5 py-0.5 flex-shrink-0 font-bold"
                              >
                                {alert.severity === 'critical' ? 'CRITICAL' : 'URGENT'}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "font-mono font-bold text-base",
                                  alert.severity === 'critical'
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-orange-700 dark:text-orange-300'
                                )}>
                                  {alert.value} {sanitizeVitalUnit(alert.unit)}
                                </span>
                                <span className={cn(
                                  "text-[11px]",
                                  alert.severity === 'critical'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                )}>
                                  (Range: {alert.range})
                                </span>
                              </div>
                              {alert.description && (
                                <p className={cn(
                                  "text-[11px] mt-1.5 leading-relaxed",
                                  alert.severity === 'critical'
                                    ? 'text-red-800 dark:text-red-200'
                                    : 'text-orange-800 dark:text-orange-200'
                                )}>
                                  {alert.description}
                                </p>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 border-t border-yellow-300 dark:border-yellow-700">
              <p className="text-[11px] text-yellow-900 dark:text-yellow-200 text-center font-medium">
                ⚠️ Remains until patient is served
              </p>
            </div>
          </div>
        )}

        {/* Minimized view */}
        {isMinimized && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-xs font-semibold truncate text-red-950 dark:text-red-50">
                  {notifications.length} patient{notifications.length > 1 ? 's' : ''}
                </span>
              </div>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 flex-shrink-0 font-bold">
                {criticalCount}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

