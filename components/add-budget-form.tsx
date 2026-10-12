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
import { budgetApi, departmentApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const formSchema = z.object({
  budgetName: z.string().min(1, {
    message: "Budget name is required",
  }),
  departmentId: z.string().min(1, {
    message: "Department is required",
  }),
  budgetPeriod: z.string().min(1, {
    message: "Budget period is required",
  }),
  allocatedAmount: z.string().min(1, {
    message: "Amount is required",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  notes: z.string().optional(),
  status: z.string().optional(),
})

type BudgetFormValues = z.infer<typeof formSchema>

interface AddBudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddBudgetForm({ open, onOpenChange, onSuccess, editData }: AddBudgetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budgetName: "",
      departmentId: "",
      budgetPeriod: new Date().getFullYear().toString(),
      allocatedAmount: "",
      notes: "",
      status: "draft",
    },
  })

  useEffect(() => {
    if (open) {
      loadDepartments()
      if (editData) {
        // Populate form with edit data
        form.reset({
          budgetName: editData.budgetName || "",
          departmentId: editData.departmentId?.toString() || "",
          budgetPeriod: editData.budgetPeriod || new Date().getFullYear().toString(),
          allocatedAmount: editData.allocatedAmount?.toString() || "",
          startDate: editData.startDate ? new Date(editData.startDate) : new Date(),
          endDate: editData.endDate ? new Date(editData.endDate) : new Date(),
          notes: editData.notes || "",
          status: editData.status || "draft",
        })
      } else {
        form.reset({
          budgetName: "",
          departmentId: "",
          budgetPeriod: new Date().getFullYear().toString(),
          allocatedAmount: "",
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear(), 11, 31)),
          notes: "",
          status: "draft",
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
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      })
    } finally {
      setLoadingDepartments(false)
    }
  }

  async function onSubmit(data: BudgetFormValues) {
    try {
      setIsSubmitting(true)

      const payload = {
        budgetName: data.budgetName,
        departmentId: parseInt(data.departmentId),
        budgetPeriod: data.budgetPeriod,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        allocatedAmount: parseFloat(data.allocatedAmount),
        notes: data.notes || undefined,
        status: data.status || "draft",
      }

      if (editData) {
        await budgetApi.update(editData.budgetId.toString(), payload)
        toast({
          title: "Success",
          description: "Budget updated successfully",
        })
      } else {
        await budgetApi.create(payload)
        toast({
          title: "Success",
          description: "Budget created successfully",
        })
      }

      onOpenChange(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving budget:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save budget",
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
          <DialogTitle>{editData ? "Edit Budget" : "Create New Budget"}</DialogTitle>
          <DialogDescription>Add a new departmental budget for the fiscal year.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="budgetName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Medical Department Annual Budget" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="budgetPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Period *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || new Date().getFullYear().toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fiscal year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allocatedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Amount (KES) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Select date</span>}
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
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Select date</span>}
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
            </div>

            {editData && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "draft"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this budget" className="min-h-[80px]" {...field} />
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
                {editData ? "Update Budget" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
