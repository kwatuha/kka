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
  leaveType: z.enum(["annual", "sick", "maternity", "paternity", "compassionate", "study", "unpaid", "other"], {
    required_error: "Please select a leave type",
  }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  daysRequested: z.coerce.number().positive("Days must be positive"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface LeaveFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  employeeId: string
  leave?: any
}

export function LeaveForm({ open, onOpenChange, onSuccess, employeeId, leave }: LeaveFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!leave

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveType: "annual",
      startDate: "",
      endDate: "",
      daysRequested: 1,
      notes: "",
    },
  })

  // Calculate days when dates change
  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (days > 0) {
        form.setValue("daysRequested", days)
      }
    }
  }, [startDate, endDate, form])

  useEffect(() => {
    if (leave && open) {
      form.reset({
        leaveType: leave.leaveType || "annual",
        startDate: leave.startDate ? leave.startDate.split("T")[0] : "",
        endDate: leave.endDate ? leave.endDate.split("T")[0] : "",
        daysRequested: leave.daysRequested || 1,
        notes: leave.notes || "",
      })
    } else if (!leave && open) {
      form.reset()
    }
  }, [leave, open, form])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      if (isEditing) {
        await employeeApi.updateLeave(leave.leaveId.toString(), {
          ...data,
          status: leave.status, // Keep existing status unless changing
        })
        toast({
          title: "Success",
          description: "Leave request updated successfully.",
        })
      } else {
        await employeeApi.createLeave(employeeId, data)
        toast({
          title: "Success",
          description: "Leave request created successfully.",
        })
      }
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving leave:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save leave request.",
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
          <DialogTitle>{isEditing ? "Edit Leave Request" : "Request Leave"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update leave request details." : "Submit a new leave request."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                      <SelectItem value="paternity">Paternity Leave</SelectItem>
                      <SelectItem value="compassionate">Compassionate Leave</SelectItem>
                      <SelectItem value="study">Study Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="daysRequested"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days Requested *</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
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
                    <Textarea placeholder="Additional notes or reason for leave" {...field} />
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
                {isEditing ? "Update" : "Submit"} Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

