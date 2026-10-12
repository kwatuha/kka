"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { vendorApi } from "@/lib/api"
import { Loader2 } from "lucide-react"

const productFormSchema = z.object({
  productCode: z.string().optional(),
  productName: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  category: z.string().optional(),
  unit: z.string().optional(),
  unitPrice: z.string().min(1, {
    message: "Unit price is required.",
  }).refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Unit price must be a valid positive number.",
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface VendorProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  product?: any
  onSuccess: () => void
}

export function VendorProductForm({ open, onOpenChange, vendorId, product, onSuccess }: VendorProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productCode: "",
      productName: "",
      category: "",
      unit: "",
      unitPrice: "",
      description: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (product && open) {
      form.reset({
        productCode: product.productCode || "",
        productName: product.productName || "",
        category: product.category || "",
        unit: product.unit || "",
        unitPrice: product.unitPrice?.toString() || "",
        description: product.description || "",
        isActive: product.isActive !== undefined ? product.isActive : true,
      })
    } else if (open) {
      form.reset({
        productCode: "",
        productName: "",
        category: "",
        unit: "",
        unitPrice: "",
        description: "",
        isActive: true,
      })
    }
  }, [product, open, form])

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true)
    try {
      const payload = {
        productCode: data.productCode || null,
        productName: data.productName,
        category: data.category || null,
        unit: data.unit || null,
        unitPrice: parseFloat(data.unitPrice),
        description: data.description || null,
        isActive: data.isActive,
      }

      if (product) {
        await vendorApi.updateProduct(vendorId, product.productId.toString(), payload)
        toast({
          title: "Success",
          description: "Product updated successfully",
        })
      } else {
        await vendorApi.createProduct(vendorId, payload)
        toast({
          title: "Success",
          description: "Product added successfully",
        })
      }

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save product",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update product information" : "Add a new product to this vendor's catalog"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input placeholder="PROD-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Medical Supplies" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="piece">Piece</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                          <SelectItem value="carton">Carton</SelectItem>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="g">Gram (g)</SelectItem>
                          <SelectItem value="l">Liter (L)</SelectItem>
                          <SelectItem value="ml">Milliliter (mL)</SelectItem>
                          <SelectItem value="m">Meter (m)</SelectItem>
                          <SelectItem value="set">Set</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (KES) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                    <Textarea placeholder="Product description" {...field} />
                  </FormControl>
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
                {product ? "Update" : "Add"} Product
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}



