"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Server, Shield, Bell, Trash2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { queueApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SmtpTestBlock } from "@/components/administration/smtp-test-block"

type SecuritySettings = {
  sessionTimeoutMinutes: number
  passwordPolicy: "low" | "medium" | "high"
  requireAdmin2fa: boolean
  loginOtpEnabled: boolean
  passwordExpirationDays: number
  passwordExpirationEnabled: boolean
}

export function SystemConfiguration() {
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [isDryRun, setIsDryRun] = useState(true)
  const [security, setSecurity] = useState<SecuritySettings>({
    sessionTimeoutMinutes: 30,
    passwordPolicy: "medium",
    requireAdmin2fa: false,
    loginOtpEnabled: false,
    passwordExpirationDays: 90,
    passwordExpirationEnabled: false,
  })
  const [securityLoading, setSecurityLoading] = useState(true)
  const [securitySaving, setSecuritySaving] = useState(false)

  useEffect(() => {
    const loadSecurity = async () => {
      try {
        setSecurityLoading(true)
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("jwt_token") ||
          localStorage.getItem("auth_token")
        const res = await fetch("/api/security/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setSecurity({
            sessionTimeoutMinutes: data.sessionTimeoutMinutes ?? 30,
            passwordPolicy: data.passwordPolicy ?? "medium",
            requireAdmin2fa: Boolean(data.requireAdmin2fa),
            loginOtpEnabled: Boolean(data.loginOtpEnabled),
            passwordExpirationDays: data.passwordExpirationDays ?? 90,
            passwordExpirationEnabled: Boolean(data.passwordExpirationEnabled),
          })
        }
      } catch (err) {
        console.error("Failed to load security settings", err)
      } finally {
        setSecurityLoading(false)
      }
    }
    void loadSecurity()
  }, [])

  const saveSecurity = async () => {
    try {
      setSecuritySaving(true)
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("auth_token")
      const res = await fetch("/api/security/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(security),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Failed to save")
      }
      const data = await res.json()
      setSecurity({
        sessionTimeoutMinutes: data.sessionTimeoutMinutes,
        passwordPolicy: data.passwordPolicy,
        requireAdmin2fa: Boolean(data.requireAdmin2fa),
        loginOtpEnabled: Boolean(data.loginOtpEnabled),
        passwordExpirationDays: data.passwordExpirationDays,
        passwordExpirationEnabled: Boolean(data.passwordExpirationEnabled),
      })
      toast({
        title: "Security settings saved",
        description: "Idle lock and password policy will apply on next page load.",
      })
    } catch (err: any) {
      toast({
        title: "Could not save security settings",
        description: err.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setSecuritySaving(false)
    }
  }

  const handleCleanupOldQueues = async (dryRun: boolean) => {
    try {
      setCleaningUp(true)
      setCleanupResult(null)

      const result = await queueApi.cleanupOld(dryRun)
      setCleanupResult(result)

      if (dryRun) {
        toast({
          title: "Dry Run Completed",
          description: `Found ${result.totalFound} queue entries older than 48 hours. No changes were made.`,
        })
      } else {
        toast({
          title: "Queue Cleanup Completed",
          description: `Successfully completed ${result.completed} queue entries.`,
        })
      }
    } catch (error: any) {
      console.error("Error cleaning up old queues:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clean up old queue entries",
        variant: "destructive",
      })
    } finally {
      setCleaningUp(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">System Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database Settings</CardTitle>
            </div>
            <CardDescription>Database connection and backup settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Backup</Label>
                <p className="text-sm text-muted-foreground">Enable automatic backups</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Button variant="outline" className="w-full">
              Create Backup Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>System Settings</CardTitle>
            </div>
            <CardDescription>General system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>System Name</Label>
              <Input defaultValue="Kiplombe Medical Centre HMIS" />
            </div>
            <div className="space-y-2">
              <Label>System Timezone</Label>
              <Select defaultValue="africa/nairobi">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="africa/nairobi">Africa/Nairobi (EAT)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Enable maintenance mode</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>
              Session lock, password rules, and optional second-factor sign-in for this deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={security.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSecurity((s) => ({
                        ...s,
                        sessionTimeoutMinutes: Number(e.target.value) || 30,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Idle lock screen after this many minutes of inactivity.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Password Policy</Label>
                  <Select
                    value={security.passwordPolicy}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setSecurity((s) => ({ ...s, passwordPolicy: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (6+ characters)</SelectItem>
                      <SelectItem value="medium">Medium (8+ characters, mixed case)</SelectItem>
                      <SelectItem value="high">High (12+ characters, special chars)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Authenticator app (TOTP) for admins</Label>
                    <p className="text-sm text-muted-foreground">
                      Require admins to enroll Google Authenticator / similar after password login
                    </p>
                  </div>
                  <Switch
                    checked={security.requireAdmin2fa}
                    onCheckedChange={(checked) =>
                      setSecurity((s) => ({ ...s, requireAdmin2fa: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Login SMS &amp; email OTP</Label>
                    <p className="text-sm text-muted-foreground">
                      After password (and authenticator if enabled), send a 6-digit code to the user&apos;s phone and
                      email. Turn off in development; enable in production when Advanta SMS and SMTP are configured.
                    </p>
                  </div>
                  <Switch
                    checked={security.loginOtpEnabled}
                    onCheckedChange={(checked) =>
                      setSecurity((s) => ({ ...s, loginOtpEnabled: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Expiration</Label>
                    <p className="text-sm text-muted-foreground">
                      Require password change every {security.passwordExpirationDays} days
                    </p>
                  </div>
                  <Switch
                    checked={security.passwordExpirationEnabled}
                    onCheckedChange={(checked) =>
                      setSecurity((s) => ({ ...s, passwordExpirationEnabled: checked }))
                    }
                  />
                </div>
                <Button onClick={() => void saveSecurity()} disabled={securitySaving} className="w-full">
                  {securitySaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save security settings"
                  )}
                </Button>
                <SmtpTestBlock />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Settings</CardTitle>
            </div>
            <CardDescription>System notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send system notifications via email</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send critical alerts via SMS</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Notification Email</Label>
              <Input type="email" placeholder="admin@example.com" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            <CardTitle>Queue Maintenance</CardTitle>
          </div>
          <CardDescription>Clean up old queue entries that have been inactive for more than 48 hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dry Run Mode</Label>
              <p className="text-sm text-muted-foreground">Preview changes without applying them</p>
            </div>
            <Switch
              checked={isDryRun}
              onCheckedChange={setIsDryRun}
              disabled={cleaningUp}
            />
          </div>

          {cleanupResult && (
            <Alert>
              <AlertTitle>
                {cleanupResult.dryRun ? "Dry Run Results" : "Cleanup Results"}
              </AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Total Found:</span> {cleanupResult.totalFound}
                  </div>
                  {!cleanupResult.dryRun && (
                    <>
                      <div>
                        <span className="font-medium">Completed:</span> {cleanupResult.completed}
                      </div>
                      <div>
                        <span className="font-medium">Errors:</span> {cleanupResult.errors}
                      </div>
                    </>
                  )}
                </div>
                {cleanupResult.summary && Object.keys(cleanupResult.summary).length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-sm mb-1">By Service Point:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cleanupResult.summary).map(([servicePoint, count]) => (
                        <Badge key={servicePoint} variant="secondary">
                          {servicePoint}: {count as number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => handleCleanupOldQueues(true)}
              disabled={cleaningUp}
              variant="outline"
              className="flex-1"
            >
              {cleaningUp && isDryRun ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Preview Changes"
              )}
            </Button>
            <Button
              onClick={() => handleCleanupOldQueues(false)}
              disabled={cleaningUp}
              variant="default"
              className="flex-1"
            >
              {cleaningUp && !isDryRun ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cleaning Up...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clean Up Now
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This will complete queue entries older than 48 hours. Entries are marked as completed (not deleted) to maintain audit trail.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current system status and version</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Version</p>
              <p className="text-sm font-semibold">1.0.0</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Database Version</p>
              <p className="text-sm font-semibold">MySQL 8.0</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Backup</p>
              <p className="text-sm font-semibold">—</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Status</p>
              <Badge variant="default">Operational</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

