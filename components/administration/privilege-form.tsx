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
import { privilegeApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  privilegeName: z.string().min(1, "Privilege name is required"),
  description: z.string().optional(),
  module: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PrivilegeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  privilege?: any
}

const MODULES = [
  "Patient Care",
  "Billing",
  "Pharmacy",
  "Laboratory",
  "Radiology",
  "Inpatient",
  "ICU",
  "Maternity",
  "HR",
  "Finance",
  "Supply Chain",
  "Inventory",
  "Administration",
  "Reports",
  "Other",
]

export function PrivilegeForm({ open, onOpenChange, onSuccess, privilege }: PrivilegeFormProps) {
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const isEditing = !!privilege

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privilegeName: "",
      description: "",
      module: "",
    },
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      if (privilege) {
        form.reset({
          privilegeName: privilege.privilegeName ?? "",
          description: privilege.description ?? "",
          module: privilege.module ?? "",
        })
      } else {
        form.reset({
          privilegeName: "",
          description: "",
          module: "",
        })
      }
    }
  }, [privilege, open, isMounted, form])

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      const payload = {
        privilegeName: data.privilegeName,
        description: data.description || null,
        module: data.module || null,
      }

      if (isEditing) {
        await privilegeApi.update(privilege.privilegeId.toString(), payload)
        toast({
          title: "Success",
          description: "Privilege updated successfully.",
        })
      } else {
        await privilegeApi.create(payload)
        toast({
          title: "Success",
          description: "Privilege created successfully.",
        })
      }
      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving privilege:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save privilege.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Privilege" : "Add New Privilege"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update privilege information." : "Create a new system privilege."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="privilegeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Privilege Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., patients.view" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {MODULES.map((module) => (
                        <SelectItem key={module} value={module}>
                          {module}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Privilege description..." {...field} />
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
                {isEditing ? "Update" : "Create"} Privilege
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

