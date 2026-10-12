"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

function authHeaders(json = false): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt_token") ||
    localStorage.getItem("auth_token")
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers["Content-Type"] = "application/json"
  return headers
}

type RegistryStatus = {
  clientRegistry: {
    mode: string
    baseUrlConfigured: boolean
    autoResolveNupiOnRegister: boolean
  }
  facilityRegistry: {
    mode: string
    baseUrlConfigured: boolean
  }
  facilities: { activeBranches: number; withMflCode: number }
  nupiByStatus: Record<string, number>
}

type FacilityRow = {
  branchId: number
  branchCode: string
  branchName: string
  mflCode?: string | null
  kephLevel?: string | null
  facilityRegistrySyncedAt?: string | null
}

export function NationalIntegrationsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<RegistryStatus | null>(null)
  const [branches, setBranches] = useState<FacilityRow[]>([])
  const [crMode, setCrMode] = useState("sandbox")
  const [frMode, setFrMode] = useState("sandbox")
  const [autoNupi, setAutoNupi] = useState(true)
  const [mflLookup, setMflLookup] = useState("15915")
  const [lookupResult, setLookupResult] = useState<string>("")
  const [hptQuery, setHptQuery] = useState("amox")
  const [hptResults, setHptResults] = useState<any[]>([])

  const searchHpt = async () => {
    try {
      const res = await fetch(
        `/api/integrations/hpt/search?${new URLSearchParams({ q: hptQuery, limit: "10" })}`,
        { headers: authHeaders() }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "HPT search failed")
      setHptResults(data.results || [])
    } catch (err: any) {
      toast({ title: "HPT search failed", description: err.message, variant: "destructive" })
    }
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sRes, bRes] = await Promise.all([
        fetch("/api/integrations/registry/settings", { headers: authHeaders() }),
        fetch("/api/integrations/mfl/branches", { headers: authHeaders() }),
      ])
      if (!sRes.ok) throw new Error("Failed to load registry status")
      const sData = await sRes.json()
      setStatus(sData)
      setCrMode(sData.clientRegistry?.mode || "sandbox")
      setFrMode(sData.facilityRegistry?.mode || "sandbox")
      setAutoNupi(Boolean(sData.clientRegistry?.autoResolveNupiOnRegister))
      if (bRes.ok) {
        const bData = await bRes.json()
        setBranches(bData.branches || [])
      }
    } catch (err: any) {
      toast({
        title: "Registry panel failed",
        description: err.message || "Request failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/integrations/registry/settings", {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({
          clientRegistryMode: crMode,
          facilityRegistryMode: frMode,
          autoResolveNupiOnRegister: autoNupi,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Registry settings saved" })
      await load()
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const syncMfl = async () => {
    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/mfl/sync", {
        method: "POST",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Sync failed")
      const data = await res.json()
      toast({
        title: "MFL sync complete",
        description: `${data.synced || 0} of ${data.total || 0} facilities synced (${data.mode})`,
      })
      await load()
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const lookupMfl = async () => {
    try {
      setLookupResult("")
      const res = await fetch(`/api/integrations/mfl/${encodeURIComponent(mflLookup)}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setLookupResult(data.reason || data.message || "Not found")
        return
      }
      const f = data.facility
      setLookupResult(
        `${f.officialName} · ${f.kephLevel || "—"} · ${f.county || ""} ${f.subCounty || ""}`.trim()
      )
    } catch (err: any) {
      setLookupResult(err.message || "Lookup failed")
    }
  }

  return (
    <Card id="national-integrations">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>National registries (NUPI / MFL)</CardTitle>
          <CardDescription>
            Client Registry resolve/register and Master Facility List sync. Sandbox mode
            works offline for demos; switch to live when MoH endpoints and API keys are issued.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !status ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Client Registry mode</Label>
                  <Badge variant="outline">{status?.clientRegistry.baseUrlConfigured ? "URL set" : "sandbox local"}</Badge>
                </div>
                <Select value={crMode} onValueChange={setCrMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Auto-resolve NUPI on register</Label>
                    <p className="text-xs text-muted-foreground">Uses ID number or phone</p>
                  </div>
                  <Switch checked={autoNupi} onCheckedChange={setAutoNupi} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(status?.nupiByStatus || {}).map(([k, v]) => (
                    <Badge key={k} variant="secondary">
                      {k}: {v}
                    </Badge>
                  ))}
                  {!Object.keys(status?.nupiByStatus || {}).length ? (
                    <span className="text-muted-foreground">No NUPI statuses yet</span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Facility Registry mode</Label>
                  <Badge variant="outline">
                    {status?.facilities.withMflCode || 0}/{status?.facilities.activeBranches || 0} with MFL
                  </Badge>
                </div>
                <Select value={frMode} onValueChange={setFrMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void saveSettings()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save modes
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void syncMfl()} disabled={syncing}>
                    {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sync MFL now
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={mflLookup}
                    onChange={(e) => setMflLookup(e.target.value)}
                    placeholder="MFL code"
                    className="max-w-[140px]"
                  />
                  <Button size="sm" variant="outline" onClick={() => void lookupMfl()}>
                    <Search className="mr-2 h-4 w-4" />
                    Lookup
                  </Button>
                </div>
                {lookupResult ? <p className="text-xs text-muted-foreground">{lookupResult}</p> : null}
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-4">
              <Label>HPT medicines catalogue (sandbox)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-[200px]"
                  value={hptQuery}
                  onChange={(e) => setHptQuery(e.target.value)}
                  placeholder="Search HPT name"
                />
                <Button size="sm" variant="outline" onClick={() => void searchHpt()}>
                  <Search className="mr-2 h-4 w-4" />
                  Search HPT
                </Button>
              </div>
              {hptResults.length ? (
                <ul className="text-xs space-y-1 mt-2">
                  {hptResults.map((r) => (
                    <li key={r.hptCode}>
                      <span className="font-mono text-primary">{r.hptCode}</span> — {r.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Map codes to medications via API PUT …/hpt/map-medication/:id</p>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Branch code</TableHead>
                    <TableHead>MFL</TableHead>
                    <TableHead>KEPH</TableHead>
                    <TableHead>Last sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.branchId}>
                      <TableCell>{b.branchName}</TableCell>
                      <TableCell className="font-mono text-xs">{b.branchCode}</TableCell>
                      <TableCell className="font-mono text-xs">{b.mflCode || "—"}</TableCell>
                      <TableCell>{b.kephLevel || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.facilityRegistrySyncedAt
                          ? new Date(b.facilityRegistrySyncedAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
