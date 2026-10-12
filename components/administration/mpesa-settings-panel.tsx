"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Loader2, Smartphone } from "lucide-react"
import { billingApi, type MpesaAdminSettings } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

export function MpesaSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<MpesaAdminSettings | null>(null)
  const [registerPreview, setRegisterPreview] = useState<{ total: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const reg = await billingApi.getMpesaRegister({ limit: 1, page: 1 })
      setRegisterPreview({ total: reg.total })
    } catch {
      setRegisterPreview(null)
    }
    try {
      const s = await billingApi.getMpesaSettings()
      setSettings(s)
    } catch (err: any) {
      setSettings(null)
      toast({
        title: "Could not load M-Pesa settings",
        description: err.message || "Admin access may be required",
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
      const updated = await billingApi.updateMpesaSettings({
        paybillNumber: settings.paybillNumber,
        accountPrefix: settings.accountPrefix,
        accountReferenceMode: settings.accountReferenceMode,
        stkEnabled: settings.stkEnabled,
        showPaybillInstructions: settings.showPaybillInstructions,
        notes: settings.notes,
      })
      setSettings(updated)
      toast({
        title: "M-Pesa settings saved",
        description: "Paybill and account prefix apply immediately for all users.",
      })
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || "Could not update settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card id="mpesa-settings">
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading M-Pesa settings…
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card id="mpesa-settings">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <CardTitle>M-Pesa Paybill &amp; STK</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Paybill settings could not be loaded. STK payments are still listed in the finance register.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/finance/mpesa">Open M-Pesa register</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card id="mpesa-settings">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle>M-Pesa Paybill &amp; STK</CardTitle>
          {settings.stkConfigured ? (
            <Badge variant="default">STK configured</Badge>
          ) : (
            <Badge variant="secondary">STK credentials missing (env)</Badge>
          )}
          {!settings.callbackConfigured ? (
            <Badge variant="outline">Callback URL not HTTPS</Badge>
          ) : null}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/finance/mpesa">Open M-Pesa register</Link>
          </Button>
        </div>
        <CardDescription>
          Set Paybill and account prefix here when the hospital goes live — no code change. API keys stay in
          server environment variables (
          <code className="text-xs">CLOUD_SASA_CLIENT_ID</code>,{" "}
          <code className="text-xs">CLOUD_SASA_CLIENT_SECRET</code>,{" "}
          <code className="text-xs">MPESA_CALLBACK_URL</code>).
          {" "}
          Reconcile STK receipts under{" "}
          <Link href="/finance/mpesa" className="text-primary underline-offset-2 hover:underline">
            Finance → M-Pesa register
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mpesaPaybill">Paybill number</Label>
            <Input
              id="mpesaPaybill"
              inputMode="numeric"
              value={settings.paybillNumber}
              onChange={(e) =>
                setSettings({ ...settings, paybillNumber: e.target.value.replace(/\D/g, "") })
              }
              placeholder="1269093"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesaPrefix">Account prefix</Label>
            <Input
              id="mpesaPrefix"
              value={settings.accountPrefix}
              onChange={(e) => setSettings({ ...settings, accountPrefix: e.target.value })}
              placeholder="AZ"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Account reference pattern</Label>
          <Select
            value={settings.accountReferenceMode}
            onValueChange={(v) => setSettings({ ...settings, accountReferenceMode: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefix_invoice">Prefix + invoice number (e.g. AZ-INV-…)</SelectItem>
              <SelectItem value="prefix_invoice_short">Prefix + invoice sequence (compact)</SelectItem>
              <SelectItem value="prefix_patient">Prefix + patient number</SelectItem>
              <SelectItem value="prefix_only">Prefix only (fixed account)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Shown on Paybill instructions and sent with STK when the provider supports it (max 20 characters).
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <div className="space-y-0.5">
              <Label>Enable STK PIN prompt</Label>
              <p className="text-xs text-muted-foreground">When off, staff use manual Paybill + receipt entry</p>
            </div>
            <Switch
              checked={settings.stkEnabled}
              onCheckedChange={(c) => setSettings({ ...settings, stkEnabled: c })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <div className="space-y-0.5">
              <Label>Show Paybill on payment screens</Label>
            </div>
            <Switch
              checked={settings.showPaybillInstructions}
              onCheckedChange={(c) => setSettings({ ...settings, showPaybillInstructions: c })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mpesaNotes">Internal notes</Label>
          <Textarea
            id="mpesaNotes"
            rows={2}
            value={settings.notes || ""}
            onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
            placeholder="e.g. Cloudsasa wallet linked to paybill 1269093"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {registerPreview != null
            ? `STK register: ${registerPreview.total} session(s). `
            : "View all STK sessions and receipts in the finance register. "}
          <Link href="/finance/mpesa" className="text-primary underline-offset-2 hover:underline">
            Open M-Pesa register
          </Link>
        </p>

        <Button onClick={() => void save()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save M-Pesa settings"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
