"use client"

import { useCallback, useEffect, useState } from "react"
import { Droplets, Loader2, Plus } from "lucide-react"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { isNbtmsEnabled } from "@/lib/nbtms-enabled"
import { nbtmsApi, pharmacyApi } from "@/lib/api"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const COMPONENTS = [
  { value: "whole_blood", label: "Whole blood" },
  { value: "packed_red_cells", label: "Packed red cells" },
  { value: "plasma", label: "Plasma" },
  { value: "platelets", label: "Platelets" },
  { value: "cryoprecipitate", label: "Cryoprecipitate" },
]

export default function BloodBankPage() {
  const enabled = isNbtmsEnabled()
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [donors, setDonors] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [hvEvents, setHvEvents] = useState<any[]>([])
  const [donorForm, setDonorForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bloodGroup: "O+",
    homeBranchId: "",
  })
  const [requestForm, setRequestForm] = useState({
    requestingBranchId: "",
    bloodGroup: "O+",
    componentType: "packed_red_cells",
    urgency: "routine",
    unitsRequested: "1",
    clinicalIndication: "",
  })

  const loadAll = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const [br, sum, d, u, r, h] = await Promise.all([
        pharmacyApi.getBranches(undefined, "true"),
        nbtmsApi.stockSummary(),
        nbtmsApi.listDonors(),
        nbtmsApi.listUnits({ status: "available" }),
        nbtmsApi.listRequests(),
        nbtmsApi.listHemovigilance(),
      ])
      setBranches(Array.isArray(br) ? br : [])
      setSummary(sum)
      setDonors(Array.isArray(d) ? d : [])
      setUnits(Array.isArray(u) ? u : [])
      setRequests(Array.isArray(r) ? r : [])
      setHvEvents(Array.isArray(h) ? h : [])
    } catch (err: any) {
      toast({
        title: "Blood bank data unavailable",
        description: err?.message || "Apply migration 135 and restart the API.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!enabled) {
    return (
      <div className="p-6 space-y-4">
        <BreadcrumbsEnhanced />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              National Blood Bank module
            </CardTitle>
            <CardDescription>
              Set <code className="text-xs">NEXT_PUBLIC_NBTMS_ENABLED=1</code> and rebuild the frontend.
              See <code className="text-xs">docs/NBTMS_VARIANT.md</code> and{" "}
              <code className="text-xs">deploy/.env.nbtms.example</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  async function submitDonor(e: React.FormEvent) {
    e.preventDefault()
    try {
      await nbtmsApi.createDonor({
        ...donorForm,
        homeBranchId: donorForm.homeBranchId ? Number(donorForm.homeBranchId) : null,
      })
      toast({ title: "Donor registered" })
      setDonorForm({ firstName: "", lastName: "", phone: "", bloodGroup: "O+", homeBranchId: "" })
      loadAll()
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.message, variant: "destructive" })
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    try {
      await nbtmsApi.createRequest({
        ...requestForm,
        requestingBranchId: Number(requestForm.requestingBranchId),
        unitsRequested: Number(requestForm.unitsRequested) || 1,
      })
      toast({ title: "Blood request created" })
      loadAll()
    } catch (err: any) {
      toast({ title: "Request failed", description: err?.message, variant: "destructive" })
    }
  }

  const totals = summary?.totals || {}

  return (
    <div className="p-6 space-y-6">
      <BreadcrumbsEnhanced />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Droplets className="h-7 w-7 text-red-600" />
            National Blood Bank (NBTMS)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Donor registry, stock, hospital requests, and hemovigilance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadAll()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available units</CardDescription>
            <CardTitle className="text-3xl">{totals.availableUnits ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quarantine</CardDescription>
            <CardTitle className="text-3xl">{totals.quarantineUnits ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reserved</CardDescription>
            <CardTitle className="text-3xl">{totals.reservedUnits ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered donors</CardDescription>
            <CardTitle className="text-3xl">{donors.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="hemovigilance">Hemovigilance</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Available inventory</CardTitle>
              <CardDescription>Unit-level traceability by group, component, and expiry</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((u) => (
                      <TableRow key={u.unitId}>
                        <TableCell className="font-mono text-xs">{u.unitCode}</TableCell>
                        <TableCell>{u.bloodGroup}</TableCell>
                        <TableCell>{u.componentType}</TableCell>
                        <TableCell>{u.branchName}</TableCell>
                        <TableCell>{u.expiryAt ? String(u.expiryAt).slice(0, 10) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!units.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No available units. Record a donation with unit creation via API.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Register donor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitDonor} className="grid gap-4 md:grid-cols-2 max-w-2xl">
                <div>
                  <Label>First name</Label>
                  <Input
                    required
                    value={donorForm.firstName}
                    onChange={(e) => setDonorForm({ ...donorForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input
                    required
                    value={donorForm.lastName}
                    onChange={(e) => setDonorForm({ ...donorForm, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={donorForm.phone}
                    onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Blood group</Label>
                  <Select
                    value={donorForm.bloodGroup}
                    onValueChange={(v) => setDonorForm({ ...donorForm, bloodGroup: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Home NBTS centre</Label>
                  <Select
                    value={donorForm.homeBranchId}
                    onValueChange={(v) => setDonorForm({ ...donorForm, homeBranchId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select facility" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.branchId} value={String(b.branchId)}>
                          {b.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">Save donor</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Donor registry</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>National ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Donations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donors.map((d) => (
                    <TableRow key={d.donorId}>
                      <TableCell className="font-mono text-xs">{d.nationalDonorId}</TableCell>
                      <TableCell>
                        {d.firstName} {d.lastName}
                      </TableCell>
                      <TableCell>{d.bloodGroup || "—"}</TableCell>
                      <TableCell>{d.donationCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hospital blood request</CardTitle>
              <CardDescription>Links to HMIS patients when patientId is supplied via API</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRequest} className="grid gap-4 md:grid-cols-2 max-w-2xl">
                <div className="md:col-span-2">
                  <Label>Requesting facility</Label>
                  <Select
                    value={requestForm.requestingBranchId}
                    onValueChange={(v) => setRequestForm({ ...requestForm, requestingBranchId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hospital / blood bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.branchId} value={String(b.branchId)}>
                          {b.branchName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Blood group</Label>
                  <Select
                    value={requestForm.bloodGroup}
                    onValueChange={(v) => setRequestForm({ ...requestForm, bloodGroup: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Component</Label>
                  <Select
                    value={requestForm.componentType}
                    onValueChange={(v) => setRequestForm({ ...requestForm, componentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENTS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Clinical indication</Label>
                  <Textarea
                    value={requestForm.clinicalIndication}
                    onChange={(e) => setRequestForm({ ...requestForm, clinicalIndication: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={!requestForm.requestingBranchId}>
                  Submit request
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Group / component</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.requestId}>
                      <TableCell>{r.requestId}</TableCell>
                      <TableCell>{r.requestingBranchName}</TableCell>
                      <TableCell>
                        {r.bloodGroup} / {r.componentType}
                      </TableCell>
                      <TableCell>{r.urgency}</TableCell>
                      <TableCell>
                        <Badge>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hemovigilance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent events</CardTitle>
              <CardDescription>
                Structured capture for donor and transfusion reactions (Component 3)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hvEvents.map((ev) => (
                    <TableRow key={ev.eventId}>
                      <TableCell>{ev.eventType}</TableCell>
                      <TableCell>{ev.severity}</TableCell>
                      <TableCell className="max-w-md truncate">{ev.description}</TableCell>
                      <TableCell>{String(ev.reportedAt).slice(0, 16)}</TableCell>
                    </TableRow>
                  ))}
                  {!hvEvents.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No events recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-4">
            Tender mapping and phased delivery: repository file <code>docs/NBTMS_VARIANT.md</code>.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
