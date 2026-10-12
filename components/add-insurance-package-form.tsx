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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { insuranceApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const packageFormSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  packageCode: z.string().optional(),
  packageName: z.string().min(1, "Package name is required"),
  coverageType: z.enum(["inpatient", "outpatient", "both"]),
  coverageLimit: z.union([z.string(), z.number()]).optional(),
  coPayPercentage: z.union([z.string(), z.number()]).optional(),
  coPayAmount: z.union([z.string(), z.number()]).optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
})

type PackageFormValues = z.infer<typeof packageFormSchema>

interface AddInsurancePackageFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function AddInsurancePackageForm({
  open,
  onOpenChange,
  onSuccess,
  editData,
}: AddInsurancePackageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [providers, setProviders] = useState<any[]>([])

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      providerId: "",
      packageCode: "",
      packageName: "",
      coverageType: "both",
      coverageLimit: "",
      coPayPercentage: "0",
      coPayAmount: "0",
      isActive: true,
      description: "",
    },
  })

  useEffect(() => {
    if (open) {
      insuranceApi.getProviders("active").then((data) => setProviders(Array.isArray(data) ? data : [])).catch(() => setProviders([]))
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          providerId: String(editData.providerId ?? ""),
          packageCode: editData.packageCode ?? "",
          packageName: editData.packageName ?? "",
          coverageType: editData.coverageType ?? "both",
          coverageLimit: editData.coverageLimit != null ? String(editData.coverageLimit) : "",
          coPayPercentage: editData.coPayPercentage != null ? String(editData.coPayPercentage) : "0",
          coPayAmount: editData.coPayAmount != null ? String(editData.coPayAmount) : "0",
          isActive: editData.isActive !== undefined ? Boolean(editData.isActive) : true,
          description: editData.description ?? "",
        })
      } else {
        form.reset({
          providerId: "",
          packageCode: "",
          packageName: "",
          coverageType: "both",
          coverageLimit: "",
          coPayPercentage: "0",
          coPayAmount: "0",
          isActive: true,
          description: "",
        })
      }
    }
  }, [open, editData, form])

  async function onSubmit(data: PackageFormValues) {
    try {
      setIsSubmitting(true)
      const payload = {
        providerId: parseInt(data.providerId, 10),
        packageCode: data.packageCode || undefined,
        packageName: data.packageName,
        coverageType: data.coverageType,
        coverageLimit: data.coverageLimit ? parseFloat(String(data.coverageLimit)) : null,
        coPayPercentage: data.coPayPercentage ? parseFloat(String(data.coPayPercentage)) : 0,
        coPayAmount: data.coPayAmount ? parseFloat(String(data.coPayAmount)) : 0,
        isActive: data.isActive,
        description: data.description || undefined,
      }
      if (editData?.packageId) {
        await insuranceApi.updatePackage(editData.packageId.toString(), payload)
        toast({ title: "Success", description: "Package updated successfully." })
      } else {
        await insuranceApi.createPackage(payload)
        toast({ title: "Success", description: "Package created successfully." })
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to save package",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Package" : "Add Package"}</DialogTitle>
          <DialogDescription>
            {editData ? "Update insurance package details." : "Create a new insurance package for a provider."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!editData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.providerId} value={String(p.providerId)}>
                          {p.providerName} {p.providerCode ? `(${p.providerCode})` : ""}
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
              name="packageName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Gold Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="packageCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package code (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. GOLD-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inpatient">Inpatient only</SelectItem>
                      <SelectItem value="outpatient">Outpatient only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coverageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage limit (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1000} placeholder="Unlimited" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coPayPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Co-pay %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step={0.5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="coPayAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Co-pay amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={50} {...field} />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Brief description" {...field} />
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
                  <FormLabel className="text-base">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                {editData ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
