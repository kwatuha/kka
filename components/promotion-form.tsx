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
import { employeeApi, departmentApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  newPositionId: z.string().min(1, "New position is required"),
  newDepartmentId: z.string().optional(),
  changeType: z.enum(["promotion", "demotion", "transfer", "lateral", "appointment"]).default("transfer"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  reason: z.string().optional(),
  salaryChange: z.coerce.number().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PromotionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  employeeId: string
  currentPositionId?: number
  currentDepartmentId?: number
}

export function PromotionForm({ open, onOpenChange, onSuccess, employeeId, currentPositionId, currentDepartmentId }: PromotionFormProps) {
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPositionId: "",
      newDepartmentId: "",
      changeType: "transfer",
      effectiveDate: "",
      reason: "",
      salaryChange: undefined,
      notes: "",
    },
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const depts = await departmentApi.getAll()
        setDepartments(depts)
        // In a real app, you'd fetch positions from an API
        // For now, using a simple list
        setPositions([
          { positionId: 1, positionTitle: "Manager", positionCode: "MGR" },
          { positionId: 2, positionTitle: "Senior Staff", positionCode: "SEN" },
          { positionId: 3, positionTitle: "Staff", positionCode: "STF" },
          { positionId: 4, positionTitle: "Intern", positionCode: "INT" },
        ])
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
    if (open) {
      loadData()
      form.reset({
        effectiveDate: new Date().toISOString().split("T")[0],
        newDepartmentId: currentDepartmentId?.toString() || "",
      })
    }
  }, [open, currentDepartmentId, form])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      await employeeApi.createPromotion(employeeId, {
        ...data,
        newPositionId: parseInt(data.newPositionId),
        newDepartmentId: data.newDepartmentId ? parseInt(data.newDepartmentId) : null,
        salaryChange: data.salaryChange || null,
      })
      toast({
        title: "Success",
        description: "Position change recorded successfully.",
      })
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving promotion:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save position change.",
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
          <DialogTitle>Record Position Change</DialogTitle>
          <DialogDescription>
            Record a promotion, transfer, or other position change for this employee.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="changeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select change type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="demotion">Demotion</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="lateral">Lateral Move</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPositionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Position *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.positionId} value={pos.positionId.toString()}>
                          {pos.positionTitle}
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
              name="newDepartmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
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
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salaryChange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary Change (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for position change" {...field} />
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
                Record Change
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

