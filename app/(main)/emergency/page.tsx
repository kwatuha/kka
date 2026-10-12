"use client"

import { useCallback, useEffect, useState } from "react"
import { Siren, Loader2, UserPlus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { emergencyApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"

export default function EmergencyPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [encounters, setEncounters] = useState<any[]>([])
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "Other",
    approximateAge: "",
    arrivalMode: "walk_in",
    acuity: "urgent",
    chiefComplaint: "",
    patientType: "non_paying",
    notes: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await emergencyApi.listEncounters("active", 50)
      setEncounters(Array.isArray(rows) ? rows : [])
    } catch (err: any) {
      toast({
        title: "Could not load emergency list",
        description: err?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleIntake(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await emergencyApi.intake({
        ...form,
        approximateAge: form.approximateAge ? Number(form.approximateAge) : undefined,
      })
      toast({
        title: "Emergency intake created",
        description: `${result?.patient?.patientNumber || "Patient"} queued for care — complete registration when stable.`,
      })
      setForm({
        firstName: "",
        lastName: "",
        gender: "Other",
        approximateAge: "",
        arrivalMode: "walk_in",
        acuity: "urgent",
        chiefComplaint: "",
        patientType: "non_paying",
        notes: "",
      })
      await load()
    } catch (err: any) {
      toast({
        title: "Intake failed",
        description: err?.message || "Could not create emergency intake",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <BreadcrumbsEnhanced
        segments={[{ title: "Emergency Care", href: "/emergency" }]}
        className="mb-2"
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Siren className="h-8 w-8 text-red-700" />
            Emergency Care
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Treat first for accidents and critical arrivals. Capture minimal identity now, queue for care
            immediately, and complete full registration later. Defaults to non-paying so cashier is skipped.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick intake</CardTitle>
            <CardDescription>
              Unknown or incomplete demographics are fine — a provisional patient record is created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIntake} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input
                    placeholder="Unknown"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input
                    placeholder="Trauma"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other / unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Approx. age</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={form.approximateAge}
                    onChange={(e) => setForm({ ...form, approximateAge: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Arrival mode</Label>
                  <Select
                    value={form.arrivalMode}
                    onValueChange={(v) => setForm({ ...form, arrivalMode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in / carried</SelectItem>
                      <SelectItem value="ambulance">Ambulance</SelectItem>
                      <SelectItem value="police">Police</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Acuity</Label>
                  <Select value={form.acuity} onValueChange={(v) => setForm({ ...form, acuity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Billing category</Label>
                <Select
                  value={form.patientType}
                  onValueChange={(v) => setForm({ ...form, patientType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_paying">Non-paying (skip cashier)</SelectItem>
                    <SelectItem value="paying">Paying</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chief complaint / mechanism</Label>
                <Textarea
                  placeholder="RTA, fall, assault…"
                  value={form.chiefComplaint}
                  onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-red-800 hover:bg-red-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Siren className="h-4 w-4 mr-2" />}
                Start care now
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active emergency encounters</CardTitle>
            <CardDescription>Provisional patients should have demographics completed when stable.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : encounters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No active emergency encounters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Encounter</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Acuity</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {encounters.map((row) => (
                    <TableRow key={row.encounterId}>
                      <TableCell className="font-medium text-sm">
                        {row.encounterNumber}
                        <div className="text-xs text-muted-foreground">{row.chiefComplaint || "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.firstName} {row.lastName}
                        <div className="text-xs text-muted-foreground">{row.patientNumber}</div>
                        {Number(row.isProvisional) === 1 && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Provisional
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.acuity === "critical" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {row.acuity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/patients/${row.patientId}`}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Register
                          </Link>
                        </Button>
                        {Number(row.isProvisional) === 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await emergencyApi.completeRegistration(row.encounterId)
                                toast({ title: "Marked registration complete" })
                                load()
                              } catch (err: any) {
                                toast({
                                  title: "Update failed",
                                  description: err?.message,
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            Done
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
