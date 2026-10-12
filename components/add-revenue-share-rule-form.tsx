"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { revenueShareApi, departmentApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  ruleName: z.string().min(1, {
    message: "Rule name is required",
  }),
  ruleType: z.enum(["department", "service", "category", "global"]),
  departmentId: z.string().optional(),
  allocationPercentage: z.string().min(1, {
    message: "Allocation percentage is required",
  }),
  effectiveFrom: z.date({
    required_error: "Effective from date is required",
  }),
  effectiveTo: z.date().optional().nullable(),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  notes: z.string().optional(),
})

type RuleFormValues = z.infer<typeof formSchema>

interface AddRevenueShareRuleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddRevenueShareRuleForm({ open, onOpenChange, onSuccess, editData }: AddRevenueShareRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ruleName: "",
      ruleType: "department",
      departmentId: "",
      allocationPercentage: "",
      isActive: true,
      description: "",
      notes: "",
    },
  })

  const ruleType = form.watch("ruleType")

  useEffect(() => {
    if (open) {
      loadDepartments()
      if (editData) {
        form.reset({
          ruleName: editData.ruleName || "",
          ruleType: editData.ruleType || "department",
          departmentId: editData.departmentId?.toString() || "",
          allocationPercentage: editData.allocationPercentage?.toString() || "",
          effectiveFrom: editData.effectiveFrom ? new Date(editData.effectiveFrom) : new Date(),
          effectiveTo: editData.effectiveTo ? new Date(editData.effectiveTo) : null,
          isActive: editData.isActive !== undefined ? editData.isActive : true,
          description: editData.description || "",
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          ruleName: "",
          ruleType: "department",
          departmentId: "",
          allocationPercentage: "",
          effectiveFrom: new Date(),
          effectiveTo: null,
          isActive: true,
          description: "",
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  const loadDepartments = async () => {
    try {
      setLoadingDepartments(true)
      const data = await departmentApi.getAll()
      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error loading departments:", error)
    } finally {
      setLoadingDepartments(false)
    }
  }

  async function onSubmit(data: RuleFormValues) {
    try {
      setIsSubmitting(true)

      const payload: any = {
        ruleName: data.ruleName,
        ruleType: data.ruleType,
        allocationPercentage: parseFloat(data.allocationPercentage),
        effectiveFrom: format(data.effectiveFrom, "yyyy-MM-dd"),
        isActive: data.isActive,
      }

      if (data.departmentId) {
        payload.departmentId = parseInt(data.departmentId)
      }

      if (data.effectiveTo) {
        payload.effectiveTo = format(data.effectiveTo, "yyyy-MM-dd")
      }

      if (data.description) {
        payload.description = data.description
      }

      if (data.notes) {
        payload.notes = data.notes
      }

      if (editData) {
        await revenueShareApi.updateRule(editData.ruleId.toString(), payload)
        toast({
          title: "Success",
          description: "Revenue share rule updated successfully",
        })
      } else {
        await revenueShareApi.createRule(payload)
        toast({
          title: "Success",
          description: "Revenue share rule created successfully",
        })
      }

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving revenue share rule:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save revenue share rule",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Revenue Share Rule" : "Create Revenue Share Rule"}</DialogTitle>
          <DialogDescription>Define how revenue is allocated to departments or categories.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ruleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Emergency Department Revenue Share" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allocationPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocation Percentage (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" placeholder="25.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {ruleType === "department" && (
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={loadingDepartments}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingDepartments ? "Loading..." : "Select department"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.departmentId} value={dept.departmentId.toString()}>
                            {dept.departmentName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective From *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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

              <FormField
                control={form.control}
                name="effectiveTo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective To (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date (optional)</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the rule" {...field} />
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
                    <Textarea placeholder="Additional notes (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Whether this rule is currently active</FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editData ? "Update Rule" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

