"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { employeeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  attendanceDate: z.string().min(1, "Attendance date is required"),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  hoursWorked: z.coerce.number().min(0).optional(),
  status: z.enum(["present", "absent", "late", "half_day", "on_leave"]).default("present"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface AttendanceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  employeeId: string
  attendance?: any
}

export function AttendanceForm({ open, onOpenChange, onSuccess, employeeId, attendance }: AttendanceFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!attendance

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      attendanceDate: new Date().toISOString().split("T")[0],
      checkInTime: "",
      checkOutTime: "",
      hoursWorked: 8,
      status: "present",
      notes: "",
    },
  })

  useEffect(() => {
    if (attendance && open) {
      const checkIn = attendance.checkInTime ? new Date(attendance.checkInTime).toTimeString().slice(0, 5) : ""
      const checkOut = attendance.checkOutTime ? new Date(attendance.checkOutTime).toTimeString().slice(0, 5) : ""
      form.reset({
        attendanceDate: attendance.attendanceDate ? attendance.attendanceDate.split("T")[0] : "",
        checkInTime: checkIn,
        checkOutTime: checkOut,
        hoursWorked: attendance.hoursWorked || 0,
        status: attendance.status || "present",
        notes: attendance.notes || "",
      })
    } else if (!attendance && open) {
      form.reset({
        attendanceDate: new Date().toISOString().split("T")[0],
        checkInTime: "08:00",
        checkOutTime: "17:00",
        hoursWorked: 8,
        status: "present",
        notes: "",
      })
    }
  }, [attendance, open, form])

  // Calculate hours when check-in/out times change
  const checkInTime = form.watch("checkInTime")
  const checkOutTime = form.watch("checkOutTime")

  useEffect(() => {
    if (checkInTime && checkOutTime) {
      const [inHour, inMin] = checkInTime.split(":").map(Number)
      const [outHour, outMin] = checkOutTime.split(":").map(Number)
      const inMinutes = inHour * 60 + inMin
      const outMinutes = outHour * 60 + outMin
      const hours = (outMinutes - inMinutes) / 60
      if (hours > 0) {
        form.setValue("hoursWorked", parseFloat(hours.toFixed(2)))
      }
    }
  }, [checkInTime, checkOutTime, form])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      const payload = {
        ...data,
        employeeId: parseInt(employeeId),
        checkInTime: data.checkInTime ? `${data.attendanceDate} ${data.checkInTime}:00` : null,
        checkOutTime: data.checkOutTime ? `${data.attendanceDate} ${data.checkOutTime}:00` : null,
      }
      await employeeApi.createAttendance(payload)
      toast({
        title: "Success",
        description: isEditing ? "Attendance updated successfully." : "Attendance recorded successfully.",
      })
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving attendance:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Attendance" : "Record Attendance"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update attendance record." : "Record attendance for this employee."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="attendanceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check In Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={form.watch("status") === "absent" || form.watch("status") === "on_leave"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} disabled={form.watch("status") === "absent" || form.watch("status") === "on_leave"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hoursWorked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours Worked</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" min="0" max="24" {...field} disabled={form.watch("status") === "absent" || form.watch("status") === "on_leave"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Record"} Attendance
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

