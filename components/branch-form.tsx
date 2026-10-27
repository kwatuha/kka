"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { pharmacyApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
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

const branchSchema = z.object({
  branchCode: z.string().optional(),
  branchName: z.string().min(1, "Branch name is required"),
  mflCode: z.string().optional(),
  frCode: z.string().optional(),
  kephLevel: z.string().optional(),
  letterheadTitle: z.string().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  isMainBranch: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

type BranchFormValues = z.infer<typeof branchSchema>

interface BranchFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editData?: any
}

export function BranchForm({ open, onOpenChange, onSuccess, editData }: BranchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      branchCode: "",
      branchName: "",
      mflCode: "",
      frCode: "",
      kephLevel: "",
      letterheadTitle: "",
      address: "",
      postalAddress: "",
      phone: "",
      email: "",
      website: "",
      logoUrl: "",
      receiptHeader: "",
      receiptFooter: "",
      isMainBranch: false,
      isActive: true,
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (editData) {
        console.log('BranchForm: Setting edit data', editData)
        form.reset({
          branchCode: editData.branchCode || "",
          branchName: editData.branchName || "",
          mflCode: editData.mflCode || "",
          frCode: editData.frCode || "",
          kephLevel: editData.kephLevel || "",
          letterheadTitle: editData.letterheadTitle || "",
          address: editData.address || "",
          postalAddress: editData.postalAddress || "",
          phone: editData.phone || "",
          email: editData.email || "",
          website: editData.website || "",
          logoUrl: editData.logoUrl || "",
          receiptHeader: editData.receiptHeader || "",
          receiptFooter: editData.receiptFooter || "",
          isMainBranch: editData.isMainBranch === 1 || editData.isMainBranch === true,
          isActive: editData.isActive !== undefined ? (editData.isActive === 1 || editData.isActive === true) : true,
          notes: editData.notes || "",
        })
      } else {
        form.reset({
          branchCode: "",
          branchName: "",
          mflCode: "",
          frCode: "",
          kephLevel: "",
          letterheadTitle: "",
          address: "",
          postalAddress: "",
          phone: "",
          email: "",
          website: "",
          logoUrl: "",
          receiptHeader: "",
          receiptFooter: "",
          isMainBranch: false,
          isActive: true,
          notes: "",
        })
      }
    }
  }, [open, editData, form])

  async function onSubmit(data: BranchFormValues) {
    try {
      setIsSubmitting(true)

      const payload: any = {
        branchName: data.branchName,
        mflCode: data.mflCode || undefined,
        frCode: data.frCode || undefined,
        kephLevel: data.kephLevel || undefined,
        letterheadTitle: data.letterheadTitle || undefined,
        address: data.address || undefined,
        postalAddress: data.postalAddress || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
        receiptHeader: data.receiptHeader || undefined,
        receiptFooter: data.receiptFooter || undefined,
        isMainBranch: data.isMainBranch,
        isActive: data.isActive,
        notes: data.notes || undefined,
      }

      if (data.branchCode) {
        payload.branchCode = data.branchCode
      }

      console.log('BranchForm: Submitting', { editData, payload, isEdit: !!editData })

      if (editData && editData.branchId) {
        console.log('BranchForm: Updating branch', editData.branchId)
        await pharmacyApi.updateBranch(editData.branchId.toString(), payload)
        toast({
          title: "Success",
          description: "Branch updated successfully",
        })
      } else {
        console.log('BranchForm: Creating new branch')
        await pharmacyApi.createBranch(payload)
        toast({
          title: "Success",
          description: "Branch created successfully",
        })
      }

      onOpenChange(false)
      form.reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving branch:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save branch",
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
          <DialogTitle>{editData ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          <DialogDescription>
            {editData ? "Update facility details, letterhead, and receipt branding" : "Register a facility / branch with contact and document branding"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branchCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Code</FormLabel>
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
                name="branchName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Main Branch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mflCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MFL code (KMHFR)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 15915" {...field} />
                    </FormControl>
                    <FormDescription>Kenya Master Facility List code</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Registry code (FID)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., FID-47-105963-0" {...field} />
                    </FormControl>
                    <FormDescription>Used for SHR consent and FHIR bundles</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kephLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KEPH level</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Level 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="letterheadTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Letterhead / receipt title</FormLabel>
                  <FormControl>
                    <Input placeholder="Name shown on receipts and official documents" {...field} />
                  </FormControl>
                  <FormDescription>Defaults to branch name if empty</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Branch address" {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal address</FormLabel>
                  <FormControl>
                    <Input placeholder="P.O. Box 15-50100, Kakamega" {...field} />
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
                      <Input placeholder="e.g., +254 712 345 678" {...field} />
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
                      <Input type="email" placeholder="e.g., branch@hospital.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://kakamega.go.ke" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo path (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="/az-careplus-logo.png or full URL" {...field} />
                  </FormControl>
                  <FormDescription>Used on receipts, invoices, and printed reports for this facility</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptHeader"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / invoice header note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional extra line below facility name" {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptFooter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / invoice footer</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Thank-you message shown at the bottom of receipts" {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isMainBranch"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Main Branch</FormLabel>
                      <FormDescription>
                        Set as the main branch. Only one branch can be the main branch.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                      <FormDescription>
                        Set whether this branch is active or inactive.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editData ? "Update Branch" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

