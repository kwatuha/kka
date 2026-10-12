"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Upload } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { vendorApi } from "@/lib/api"
import { cn } from "@/lib/utils"

// Check if File is available (browser environment)
const FileSchema = typeof File !== 'undefined' 
  ? z.instanceof(File).optional()
  : z.any().optional()

const documentFormSchema = z.object({
  documentName: z.string().min(2, {
    message: "Document name must be at least 2 characters.",
  }),
  documentType: z.string().optional(),
  uploadDate: z.date({
    required_error: "Upload date is required.",
  }),
  expiryDate: z.date().optional(),
  notes: z.string().optional(),
  file: FileSchema,
})

type DocumentFormValues = z.infer<typeof documentFormSchema>

interface VendorDocumentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  document?: any
  onSuccess: () => void
}

export function VendorDocumentForm({ open, onOpenChange, vendorId, document, onSuccess }: VendorDocumentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      documentName: "",
      documentType: "",
      uploadDate: new Date(),
      expiryDate: undefined,
      notes: "",
    },
  })

  useEffect(() => {
    if (document && open) {
      form.reset({
        documentName: document.documentName || "",
        documentType: document.documentType || "",
        uploadDate: document.uploadDate ? new Date(document.uploadDate) : new Date(),
        expiryDate: document.expiryDate ? new Date(document.expiryDate) : undefined,
        notes: document.notes || "",
      })
      setSelectedFile(null)
    } else if (open) {
      form.reset({
        documentName: "",
        documentType: "",
        uploadDate: new Date(),
        expiryDate: undefined,
        notes: "",
      })
      setSelectedFile(null)
    }
  }, [document, open, form])

  async function onSubmit(data: DocumentFormValues) {
    setIsSubmitting(true)
    try {
      if (document) {
        // Update existing document (metadata only, no file upload for updates)
        await vendorApi.updateDocument(vendorId, document.documentId.toString(), {
          documentName: data.documentName,
          documentType: data.documentType || null,
          expiryDate: data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : null,
          notes: data.notes || null,
        })
        toast({
          title: "Success",
          description: "Document updated successfully",
        })
      } else {
        // Create new document with file upload
        if (!selectedFile) {
          toast({
            title: "Error",
            description: "Please select a file to upload",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("documentName", data.documentName)
        formData.append("documentType", data.documentType || "")
        formData.append("uploadDate", format(data.uploadDate, "yyyy-MM-dd"))
        if (data.expiryDate) {
          formData.append("expiryDate", format(data.expiryDate, "yyyy-MM-dd"))
        }
        formData.append("notes", data.notes || "")
        formData.append("uploadedBy", "1") // TODO: Get from auth context

        await vendorApi.createDocument(vendorId, formData)
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        })
      }

      form.reset()
      setSelectedFile(null)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save document",
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
          <DialogTitle>{document ? "Edit Document" : "Upload Document"}</DialogTitle>
          <DialogDescription>
            {document ? "Update document information" : "Upload a new document for this vendor"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!document && (
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>File *</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setSelectedFile(file)
                              onChange(file)
                            }
                          }}
                          {...field}
                        />
                        {selectedFile && (
                          <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="documentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Registration Certificate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Registration Certificate">Registration Certificate</SelectItem>
                        <SelectItem value="Tax Compliance">Tax Compliance</SelectItem>
                        <SelectItem value="Product Catalog">Product Catalog</SelectItem>
                        <SelectItem value="ISO Certificate">ISO Certificate</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="License">License</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="uploadDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Upload Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {document ? "Update" : "Upload"} Document
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}



