"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { telemedicineApi } from "@/lib/api"
import { TelemedicineHelpLink } from "@/components/telemedicine-help-link"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function TelemedicineSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [defaultZoomJoinUrl, setDefaultZoomJoinUrl] = useState("")
  const [defaultZoomPassword, setDefaultZoomPassword] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await telemedicineApi.getMyDefaults()
        if (cancelled) return
        setDefaultZoomJoinUrl(data?.defaultZoomJoinUrl || "")
        setDefaultZoomPassword(data?.defaultZoomPassword || "")
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: "Could not load settings",
            description: e?.message || "Failed to load",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  const handleSave = async () => {
    try {
      setSaving(true)
      await telemedicineApi.updateMyDefaults({
        defaultZoomJoinUrl: defaultZoomJoinUrl.trim() || null,
        defaultZoomPassword: defaultZoomPassword.trim() || null,
      })
      toast({ title: "Saved", description: "Your default Zoom link will be used for new telemedicine sessions." })
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/telemedicine/create">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Zoom defaults</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Default join URL for new sessions (editable per visit).</span>
            <TelemedicineHelpLink />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="def-url">Default join URL</Label>
                <Input
                  id="def-url"
                  placeholder="https://zoom.us/j/…"
                  value={defaultZoomJoinUrl}
                  onChange={(e) => setDefaultZoomJoinUrl(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="def-pass">Default passcode (optional)</Label>
                <Input
                  id="def-pass"
                  type="text"
                  placeholder="If your personal room uses a passcode"
                  value={defaultZoomPassword}
                  onChange={(e) => setDefaultZoomPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save defaults"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
