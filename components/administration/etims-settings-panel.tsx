"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt } from "lucide-react"
import { billingApi, type EtimsAdminSettings } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const EMPTY_ETIMS: EtimsAdminSettings = {
  enabled: false,
  integrationMode: "disabled",
  environment: "sandbox",
  kraPin: null,
  branchOfficeId: null,
  deviceSerialNumber: null,
  traderName: null,
  apiBaseUrl: null,
  vscuLocalBaseUrl: "http://127.0.0.1:8088",
  autoSubmitOnInvoicePaid: false,
  notes: null,
}

export function EtimsSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<EtimsAdminSettings | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [communicationKeyInput, setCommunicationKeyInput] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const s = await billingApi.getEtimsSettings()
      setSettings(s)
      setLoadError(null)
      setCommunicationKeyInput("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Admin access may be required"
      setLoadError(msg)
      setSettings({ ...EMPTY_ETIMS })
      toast({
        title: "Could not load saved eTIMS settings",
        description: `${msg} — you can still enter values and save if you are an administrator.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    if (!settings) return
    try {
      setSaving(true)
      const payload: Record<string, unknown> = {
        enabled: settings.enabled,
        integrationMode: settings.integrationMode,
        environment: settings.environment,
        kraPin: settings.kraPin,
        branchOfficeId: settings.branchOfficeId,
        deviceSerialNumber: settings.deviceSerialNumber,
        traderName: settings.traderName,
        apiBaseUrl: settings.apiBaseUrl,
        vscuLocalBaseUrl: settings.vscuLocalBaseUrl,
        defaultTaxRateCode: settings.defaultTaxRateCode,
        autoSubmitOnInvoicePaid: settings.autoSubmitOnInvoicePaid,
        notes: settings.notes,
      }
      if (communicationKeyInput.trim()) {
        payload.communicationKey = communicationKeyInput.trim()
      }
      const updated = await billingApi.updateEtimsSettings(payload)
      setSettings(updated)
      setCommunicationKeyInput("")
      toast({
        title: "eTIMS settings saved",
        description: "Values apply on the server for future invoice integration.",
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not update settings"
      toast({ title: "Save failed", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card id="etims-settings" className="scroll-mt-24">
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading KRA eTIMS settings…
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return null
  }

  const readiness = settings.readiness

  return (
    <Card id="etims-settings" className="scroll-mt-24 border-primary/30">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Receipt className="h-5 w-5" />
          <CardTitle>KRA eTIMS (tax invoices)</CardTitle>
          {settings.enabled ? (
            <Badge variant="default">Enabled</Badge>
          ) : (
            <Badge variant="secondary">Disabled</Badge>
          )}
          {settings.integrationMode === "oscu" ? (
            <Badge variant="outline">OSCU</Badge>
          ) : settings.integrationMode === "vscu" ? (
            <Badge variant="outline">VSCU</Badge>
          ) : null}
          {settings.environment === "production" ? (
            <Badge variant="destructive">Production</Badge>
          ) : (
            <Badge variant="outline">Sandbox</Badge>
          )}
        </div>
        <CardDescription className="mt-2 max-w-3xl">
          Configure system-to-system eTIMS for HMIS invoices. Register on{" "}
          <a
            href="https://etims-sbx.kra.go.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            eTIMS sandbox
          </a>{" "}
          or production portal, then enter PIN, branch, device, and keys from KRA activation. Invoice
          submission API wiring is separate; this panel stores facility variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load saved settings</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>{loadError}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                Retry load
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {readiness ? (
          <Alert>
            <AlertTitle>Readiness</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{readiness.message}</p>
              <ul className="list-disc pl-4 text-sm">
                {readiness.checks.map((c) => (
                  <li key={c.id} className={c.ok ? "text-emerald-800 dark:text-emerald-200" : undefined}>
                    {c.ok ? "✓" : "○"} {c.label}
                    {c.detail && !c.ok ? ` — ${c.detail}` : null}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="etims-enabled"
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
            />
            <Label htmlFor="etims-enabled">Enable eTIMS integration</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="etims-auto-submit"
              checked={settings.autoSubmitOnInvoicePaid}
              disabled={!settings.enabled}
              onCheckedChange={(v) => setSettings({ ...settings, autoSubmitOnInvoicePaid: v })}
            />
            <Label htmlFor="etims-auto-submit">Auto-submit when invoice paid (when implemented)</Label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Integration mode</Label>
            <Select
              value={settings.integrationMode}
              onValueChange={(v) =>
                setSettings({
                  ...settings,
                  integrationMode: v as EtimsAdminSettings["integrationMode"],
                  enabled: v === "disabled" ? false : settings.enabled,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="oscu">OSCU — online (KRA API)</SelectItem>
                <SelectItem value="vscu">VSCU — local JAR + bulk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={settings.environment}
              onValueChange={(v) =>
                setSettings({ ...settings, environment: v as EtimsAdminSettings["environment"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="etims-pin">KRA PIN</Label>
            <Input
              id="etims-pin"
              className="font-mono"
              placeholder="P051…"
              value={settings.kraPin ?? ""}
              onChange={(e) => setSettings({ ...settings, kraPin: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etims-trader">Registered trader name</Label>
            <Input
              id="etims-trader"
              value={settings.traderName ?? ""}
              onChange={(e) => setSettings({ ...settings, traderName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etims-branch">Branch office ID</Label>
            <Input
              id="etims-branch"
              className="font-mono"
              value={settings.branchOfficeId ?? ""}
              onChange={(e) => setSettings({ ...settings, branchOfficeId: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etims-device">Device serial</Label>
            <Input
              id="etims-device"
              className="font-mono"
              value={settings.deviceSerialNumber ?? ""}
              onChange={(e) => setSettings({ ...settings, deviceSerialNumber: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="etims-api">API base URL (optional override)</Label>
            <Input
              id="etims-api"
              className="font-mono text-sm"
              placeholder={
                settings.environment === "production"
                  ? "https://etims-api.kra.go.ke"
                  : "https://etims-api-sbx.kra.go.ke"
              }
              value={settings.apiBaseUrl ?? ""}
              onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
            />
            {settings.effectiveApiBaseUrl ? (
              <p className="text-xs text-muted-foreground">
                Effective: <span className="font-mono">{settings.effectiveApiBaseUrl}</span>
              </p>
            ) : null}
          </div>
          {settings.integrationMode === "vscu" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="etims-vscu">Local VSCU base URL</Label>
              <Input
                id="etims-vscu"
                className="font-mono text-sm"
                placeholder="http://127.0.0.1:8088"
                value={settings.vscuLocalBaseUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, vscuLocalBaseUrl: e.target.value })}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="etims-tax">Default tax rate code</Label>
            <Input
              id="etims-tax"
              className="font-mono"
              placeholder="e.g. B"
              value={settings.defaultTaxRateCode ?? ""}
              onChange={(e) => setSettings({ ...settings, defaultTaxRateCode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etims-key">Communication key</Label>
            <Input
              id="etims-key"
              type="password"
              autoComplete="new-password"
              placeholder={
                settings.communicationKeyConfigured
                  ? `Configured (${settings.communicationKeyHint ?? "****"}) — enter to replace`
                  : "From device initialization"
              }
              value={communicationKeyInput}
              onChange={(e) => setCommunicationKeyInput(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="etims-notes">Notes (internal)</Label>
          <Textarea
            id="etims-notes"
            rows={2}
            value={settings.notes ?? ""}
            onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
          />
        </div>

        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save eTIMS settings
        </Button>
      </CardContent>
    </Card>
  )
}
