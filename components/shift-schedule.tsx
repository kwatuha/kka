"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus } from "lucide-react"
import { nursingApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StaffMember {
  nurseUserId: number
  name: string
  role: string
  username?: string
  initials: string
  assignedWard: string
  shiftTime: string
}

const SHIFT_OPTIONS = [
  { value: "morning", label: "Morning (7:00 AM - 3:00 PM)" },
  { value: "evening", label: "Evening (3:00 PM - 11:00 PM)" },
  { value: "night", label: "Night (11:00 PM - 7:00 AM)" },
] as const

export function ShiftSchedule() {
  const { toast } = useToast()
  const [schedule, setSchedule] = useState<{ morning: StaffMember[]; evening: StaffMember[]; night: StaffMember[] }>({
    morning: [],
    evening: [],
    night: [],
  })
  const [nurses, setNurses] = useState<{ userId: number; firstName: string; lastName: string; username: string; roleName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [assignNurseId, setAssignNurseId] = useState<string>("")
  const [assignShift, setAssignShift] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const loadSchedule = async () => {
    try {
      const data = await nursingApi.getShiftSchedule()
      setSchedule({
        morning: data.morning || [],
        evening: data.evening || [],
        night: data.night || [],
      })
    } catch (e) {
      toast({ title: "Error", description: "Failed to load shift schedule", variant: "destructive" })
    }
  }

  const loadNurses = async () => {
    try {
      const data = await nursingApi.getNurses()
      setNurses(data || [])
    } catch (e) {
      toast({ title: "Error", description: "Failed to load nurses list", variant: "destructive" })
    }
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      await Promise.all([loadSchedule(), loadNurses()])
      if (!cancelled) setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [])

  const handleAssign = async () => {
    if (!assignNurseId || !assignShift) {
      toast({ title: "Select nurse and shift", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      await nursingApi.assignNurseShift(Number(assignNurseId), assignShift as "morning" | "evening" | "night")
      toast({ title: "Updated", description: "Nurse assigned to shift." })
      setAssignNurseId("")
      setAssignShift("")
      await loadSchedule()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to assign shift", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const renderShiftList = (staff: StaffMember[]) => (
    <div className="space-y-4">
      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No staff assigned to this shift.</p>
      ) : (
        staff.map((s) => (
          <div key={s.nurseUserId} className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={undefined} alt={s.name} />
                <AvatarFallback>{s.initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.role}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-green-100 text-green-800">On duty</Badge>
              <div className="text-xs text-muted-foreground">{s.assignedWard}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shift Schedule</CardTitle>
          <CardDescription>Nursing staff assignments and schedules</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shift Schedule</CardTitle>
          <CardDescription>Nursing staff assignments and schedules. Assign nurses to shifts below; ward assignments are managed under Ward Management.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="morning">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="morning">Morning</TabsTrigger>
              <TabsTrigger value="evening">Evening</TabsTrigger>
              <TabsTrigger value="night">Night</TabsTrigger>
            </TabsList>
            <TabsContent value="morning" className="mt-4">
              {renderShiftList(schedule.morning)}
            </TabsContent>
            <TabsContent value="evening" className="mt-4">
              {renderShiftList(schedule.evening)}
            </TabsContent>
            <TabsContent value="night" className="mt-4">
              {renderShiftList(schedule.night)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign nurse to shift
          </CardTitle>
          <CardDescription>Add a nurse to a shift. Each nurse can only be on one shift. Assign wards under Ward Management → Ward Assignments.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm font-medium mb-1.5 block">Nurse</label>
            <Select value={assignNurseId} onValueChange={setAssignNurseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select nurse" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((n) => (
                  <SelectItem key={n.userId} value={String(n.userId)}>
                    {[n.firstName, n.lastName].filter(Boolean).join(" ") || n.username} {n.roleName ? `(${n.roleName})` : ""}
                  </SelectItem>
                ))}
                {nurses.length === 0 && (
                  <SelectItem value="_none" disabled>No nurses found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-sm font-medium mb-1.5 block">Shift</label>
            <Select value={assignShift} onValueChange={setAssignShift}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={submitting || !assignNurseId || !assignShift}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
