"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { insuranceApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const providerFormSchema = z.object({
  providerCode: z.string().optional(),
  providerName: z.string().min(1, {
    message: "Provider name is required",
  }),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  claimsAddress: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
  notes: z.string().optional(),
})

type ProviderFormValues = z.infer<typeof providerFormSchema>

interface AddInsuranceProviderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddInsuranceProviderForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: AddInsuranceProviderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      providerCode: "",
      providerName: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      claimsAddress: "",
      website: "",
      isActive: true,
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          providerCode: editData.providerCode || "",
          providerName: editData.providerName || "",
          contactPerson: editData.contactPerson || "",
          phone: editData.phone || "",
          email: editData.email || "",
          address: editData.address || "",
          claimsAddress: editData.claimsAddress || "",
          website: editData.website || "",
          isActive: editData.isActive !== undefined ? editData.isActive : true,
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          providerCode: "",
          providerName: "",
          contactPerson: "",
          phone: "",
          email: "",
          address: "",
          claimsAddress: "",
          website: "",
          isActive: true,
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  async function onSubmit(data: ProviderFormValues) {
    try {
      setIsSubmitting(true)

      const payload: any = {
        providerName: data.providerName,
        contactPerson: data.contactPerson || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        claimsAddress: data.claimsAddress || undefined,
        website: data.website || undefined,
        isActive: data.isActive,
        notes: data.notes || undefined,
      }

      if (data.providerCode) {
        payload.providerCode = data.providerCode
      }

      if (editData) {
        await insuranceApi.updateProvider(editData.providerId.toString(), payload)
        toast({
          title: "Success",
          description: "Insurance provider updated successfully",
        })
      } else {
        await insuranceApi.createProvider(payload)
        toast({
          title: "Success",
          description: "Insurance provider created successfully",
        })
      }

      onOpenChange(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving provider:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save insurance provider",
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
          <DialogTitle>{editData ? "Edit Insurance Provider" : "Add New Insurance Provider"}</DialogTitle>
          <DialogDescription>
            {editData ? "Update insurance provider information" : "Register a new insurance provider"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="providerCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if empty" {...field} />
                    </FormControl>
                    <FormDescription>Optional - will be auto-generated if not provided</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="providerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SHA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Contact person name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+254 20 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="info@provider.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provider address" className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claimsAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claims Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Claims submission address" className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://www.provider.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>Enable or disable this provider</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
                    <Textarea placeholder="Additional notes" className="min-h-[80px]" {...field} />
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
                {editData ? "Update Provider" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
