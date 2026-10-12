"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
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

const issueFormSchema = z.object({
  issueTitle: z.string().min(2, {
    message: "Issue title must be at least 2 characters.",
  }),
  issueDate: z.date({
    required_error: "Issue date is required.",
  }),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters.",
  }),
  status: z.string().default("open"),
  priority: z.string().default("medium"),
  resolution: z.string().optional(),
})

type IssueFormValues = z.infer<typeof issueFormSchema>

interface VendorIssueFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  issue?: any
  onSuccess: () => void
}

export function VendorIssueForm({ open, onOpenChange, vendorId, issue, onSuccess }: VendorIssueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      issueTitle: "",
      issueDate: new Date(),
      description: "",
      status: "open",
      priority: "medium",
      resolution: "",
    },
  })

  useEffect(() => {
    if (issue && open) {
      form.reset({
        issueTitle: issue.issueTitle || issue.title || "",
        issueDate: issue.issueDate ? new Date(issue.issueDate) : new Date(),
        description: issue.description || "",
        status: issue.status?.toLowerCase() || "open",
        priority: issue.priority?.toLowerCase() || "medium",
        resolution: issue.resolution || "",
      })
    } else if (open) {
      form.reset({
        issueTitle: "",
        issueDate: new Date(),
        description: "",
        status: "open",
        priority: "medium",
        resolution: "",
      })
    }
  }, [issue, open, form])

  async function onSubmit(data: IssueFormValues) {
    setIsSubmitting(true)
    try {
      const payload: any = {
        issueTitle: data.issueTitle,
        issueDate: format(data.issueDate, "yyyy-MM-dd"),
        description: data.description,
        status: data.status,
        priority: data.priority,
        reportedBy: 1, // TODO: Get from auth context
      }

      // Only include resolution if it's provided (for updates)
      if (data.resolution && data.resolution.trim()) {
        payload.resolution = data.resolution
        if (data.status === "resolved") {
          payload.resolvedDate = format(new Date(), "yyyy-MM-dd")
          payload.resolvedBy = 1 // TODO: Get from auth context
        }
      }

      if (issue) {
        await vendorApi.updateIssue(vendorId, issue.issueId?.toString() || issue.id, payload)
        toast({
          title: "Success",
          description: "Issue updated successfully",
        })
      } else {
        await vendorApi.createIssue(vendorId, payload)
        toast({
          title: "Success",
          description: "Issue reported successfully",
        })
      }

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save issue",
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
          <DialogTitle>{issue ? "Edit Issue" : "Report Issue"}</DialogTitle>
          <DialogDescription>
            {issue ? "Update issue information and resolution" : "Report a new issue with this vendor"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="issueTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Delayed Delivery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date *</FormLabel>
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
                          disabled={(date) => date > new Date()}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the issue in detail..." 
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter resolution details (if resolved)..." 
                      {...field}
                      rows={3}
                    />
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
                {issue ? "Update" : "Report"} Issue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


