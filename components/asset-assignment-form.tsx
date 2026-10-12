"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { assetApi, userApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-context"
import { AssetCombobox } from "@/components/asset-combobox"
import { UserCombobox } from "@/components/user-combobox"

const assignmentSchema = z.object({
  assetId: z.string().min(1, { message: "Asset is required." }),
  assignedTo: z.string().min(1, { message: "User is required." }),
  assignmentDate: z.date({
    required_error: "Assignment date is required.",
  }),
  conditionAtAssignment: z.string().min(1, { message: "Condition is required." }),
  location: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
})

type AssignmentFormValues = z.infer<typeof assignmentSchema>

interface AssetAssignmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  assignment?: any
  assetId?: string
}

export function AssetAssignmentForm({
  open,
  onOpenChange,
  onSuccess,
  assignment,
  assetId: propAssetId,
}: AssetAssignmentFormProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assetId: propAssetId || "",
      assignedTo: "",
      assignmentDate: new Date(),
      conditionAtAssignment: "good",
      location: "",
      department: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (assignment) {
        form.reset({
          assetId: assignment.assetId?.toString() || "",
          assignedTo: assignment.assignedTo?.toString() || "",
          assignmentDate: assignment.assignmentDate ? new Date(assignment.assignmentDate) : new Date(),
          conditionAtAssignment: assignment.conditionAtAssignment || "good",
          location: assignment.location || "",
          department: assignment.department || "",
          notes: assignment.notes || "",
        })
      } else if (propAssetId) {
        form.reset({
          assetId: propAssetId,
          assignedTo: "",
          assignmentDate: new Date(),
          conditionAtAssignment: "good",
          location: "",
          department: "",
          notes: "",
        })
      } else {
        form.reset({
          assetId: "",
          assignedTo: "",
          assignmentDate: new Date(),
          conditionAtAssignment: "good",
          location: "",
          department: "",
          notes: "",
        })
      }
    }
  }, [open, assignment, propAssetId, form])

  async function onSubmit(data: AssignmentFormValues) {
    try {
      setIsSubmitting(true)

      const userId = user?.id ? parseInt(user.id) : undefined

      const payload: any = {
        assetId: parseInt(data.assetId),
        assignedTo: parseInt(data.assignedTo),
        assignmentDate: format(data.assignmentDate, "yyyy-MM-dd"),
        conditionAtAssignment: data.conditionAtAssignment,
        location: data.location || null,
        department: data.department || null,
        notes: data.notes || null,
        assignedBy: userId,
      }

      if (assignment) {
        await assetApi.updateAssignment(assignment.assignmentId.toString(), payload)
        toast({
          title: "Success",
          description: "Asset assignment updated successfully",
        })
      } else {
        await assetApi.createAssignment(payload)
        toast({
          title: "Success",
          description: "Asset assigned successfully",
        })
      }

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving assignment:", error)
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to save assignment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const conditions = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? "Edit Assignment" : "Assign Asset"}</DialogTitle>
          <DialogDescription>
            {assignment
              ? "Update the asset assignment details. Click save when you're done."
              : "Assign an asset to a staff member. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset *</FormLabel>
                  <FormControl>
                    <AssetCombobox
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Search asset by code, name, or category..."
                      disabled={!!propAssetId || !!assignment}
                      excludeAssigned={!assignment} // Exclude already assigned assets for new assignments
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To *</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Search user by name or email..."
                      disabled={!!assignment}
                    />
                  </FormControl>
                  <FormDescription>Select the staff member to assign this asset to</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Assignment Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="conditionAtAssignment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition at Assignment *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "good"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., IT, Finance" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Building A, Room 101" {...field} />
                  </FormControl>
                  <FormDescription>Optional - where the asset will be used</FormDescription>
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
                    <Textarea placeholder="Additional notes about the assignment..." className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormDescription>Optional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {assignment ? "Update Assignment" : "Assign Asset"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
