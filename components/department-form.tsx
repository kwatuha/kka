"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { departmentApi, userApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  departmentName: z.string().min(1, "Department name is required"),
  departmentCode: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  headOfDepartmentId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface DepartmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  department?: any
}

export function DepartmentForm({ open, onOpenChange, onSuccess, department }: DepartmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!department

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departmentName: "",
      departmentCode: "",
      description: "",
      location: "",
      headOfDepartmentId: "",
    },
  })

  // Ensure component is mounted before rendering to avoid hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      loadUsers()
      if (department) {
        // Ensure all values are properly set, handling null/undefined
        // Use nullish coalescing (??) to handle null/undefined, but keep empty strings
        const formValues = {
          departmentName: department.departmentName ?? "",
          departmentCode: department.departmentCode ?? "",
          description: department.description ?? "",
          location: department.location ?? "",
          headOfDepartmentId: department.headOfDepartmentId ? department.headOfDepartmentId.toString() : "none",
        }
        // Reset form with the department values
        form.reset(formValues)
        // Also explicitly set values to ensure they're applied
        form.setValue("departmentName", formValues.departmentName)
        form.setValue("departmentCode", formValues.departmentCode)
        form.setValue("description", formValues.description)
        form.setValue("location", formValues.location)
        form.setValue("headOfDepartmentId", formValues.headOfDepartmentId)
      } else {
        form.reset({
          departmentName: "",
          departmentCode: "",
          description: "",
          location: "",
          headOfDepartmentId: "none",
        })
      }
    }
  }, [department, open, isMounted, form])

  const loadUsers = async () => {
    try {
      const data = await userApi.getAll()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading users:", error)
      // Don't show error toast for users - it's optional
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      const payload = {
        ...data,
        headOfDepartmentId: data.headOfDepartmentId ? parseInt(data.headOfDepartmentId) : null,
      }

      if (isEditing) {
        await departmentApi.update(department.departmentId.toString(), payload)
        toast({
          title: "Success",
          description: "Department updated successfully.",
        })
      } else {
        await departmentApi.create(payload)
        toast({
          title: "Success",
          description: "Department created successfully.",
        })
      }
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving department:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save department.",
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
          <DialogTitle>{isEditing ? "Edit Department" : "Add New Department"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update department information." : "Create a new department in the system."}
          </DialogDescription>
        </DialogHeader>
        {isMounted && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="departmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cardiology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CARD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Department description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., First Floor, Main Building" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headOfDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Head of Department</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department head" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.userId} value={user.userId.toString()}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {isEditing ? "Update" : "Create"} Department
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

