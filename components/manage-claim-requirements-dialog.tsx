"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Plus, Edit, Trash2, GripVertical, FileText, Info, CheckCircle, Shield, Key } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { insuranceApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

const requirementFormSchema = z.object({
  requirementCode: z.string().optional(),
  requirementName: z.string().min(1, { message: "Requirement name is required" }),
  description: z.string().optional(),
  requirementType: z.enum(['document', 'information', 'verification', 'authorization', 'other']),
  isRequired: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
})

type RequirementFormValues = z.infer<typeof requirementFormSchema>

interface ManageClaimRequirementsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
}

export function ManageClaimRequirementsDialog({
  open,
  onOpenChange,
  providerId,
  providerName,
}: ManageClaimRequirementsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<any>(null)
  const [deletingRequirement, setDeletingRequirement] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: {
      requirementCode: "",
      requirementName: "",
      description: "",
      requirementType: "document",
      isRequired: true,
      displayOrder: 0,
    },
  })

  useEffect(() => {
    if (open && providerId) {
      loadRequirements()
    }
  }, [open, providerId])

  const loadRequirements = async () => {
    try {
      setLoading(true)
      const data = await insuranceApi.getProviderRequirements(providerId)
      if (data && data.template) {
        setTemplate(data.template)
        setRequirements(data.requirements || [])
      } else {
        setTemplate(null)
        setRequirements([])
      }
    } catch (error: any) {
      console.error("Error loading requirements:", error)
      toast({
        title: "Error loading requirements",
        description: error.message || "Failed to load claim requirements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      setSubmitting(true)
      await insuranceApi.createRequirementTemplate(providerId, {
        templateName: `${providerName} Claim Requirements`,
        description: `Standard checklist of requirements for submitting ${providerName} insurance claims`,
        isRequired: true,
      })
      toast({
        title: "Template created",
        description: "Requirement template has been created. You can now add requirements.",
      })
      await loadRequirements()
    } catch (error: any) {
      console.error("Error creating template:", error)
      toast({
        title: "Error creating template",
        description: error.message || "Failed to create requirement template",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = async (data: RequirementFormValues) => {
    try {
      setSubmitting(true)
      if (editingRequirement) {
        await insuranceApi.updateRequirement(providerId, editingRequirement.requirementId.toString(), data)
        toast({
          title: "Requirement updated",
          description: "The requirement has been updated successfully.",
        })
      } else {
        // Set display order to be after the last requirement
        const maxOrder = requirements.length > 0
          ? Math.max(...requirements.map(r => r.displayOrder || 0))
          : -1
        await insuranceApi.addRequirement(providerId, {
          ...data,
          displayOrder: maxOrder + 1,
        })
        toast({
          title: "Requirement added",
          description: "The requirement has been added successfully.",
        })
      }
      form.reset()
      setShowAddForm(false)
      setEditingRequirement(null)
      await loadRequirements()
    } catch (error: any) {
      console.error("Error saving requirement:", error)
      toast({
        title: "Error saving requirement",
        description: error.message || "Failed to save requirement",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (requirement: any) => {
    setEditingRequirement(requirement)
    form.reset({
      requirementCode: requirement.requirementCode || "",
      requirementName: requirement.requirementName,
      description: requirement.description || "",
      requirementType: requirement.requirementType || "document",
      isRequired: requirement.isRequired !== undefined ? requirement.isRequired : true,
      displayOrder: requirement.displayOrder || 0,
    })
    setShowAddForm(true)
  }

  const handleDelete = async () => {
    if (!deletingRequirement) return

    try {
      setSubmitting(true)
      await insuranceApi.deleteRequirement(providerId, deletingRequirement.requirementId.toString())
      toast({
        title: "Requirement deleted",
        description: "The requirement has been deactivated.",
      })
      setDeletingRequirement(null)
      await loadRequirements()
    } catch (error: any) {
      console.error("Error deleting requirement:", error)
      toast({
        title: "Error deleting requirement",
        description: error.message || "Failed to delete requirement",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getRequirementTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'information':
        return <Info className="h-4 w-4" />
      case 'verification':
        return <CheckCircle className="h-4 w-4" />
      case 'authorization':
        return <Shield className="h-4 w-4" />
      default:
        return <Key className="h-4 w-4" />
    }
  }

  const sortedRequirements = [...requirements].sort((a, b) =>
    (a.displayOrder || 0) - (b.displayOrder || 0)
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Claim Requirements</DialogTitle>
            <DialogDescription>
              Define the checklist items that must be completed before submitting claims for {providerName}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !template ? (
            <div className="space-y-4 py-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No requirement template exists for this provider yet.
                </p>
                <Button onClick={handleCreateTemplate} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Requirement Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{template.templateName}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
                <Button onClick={() => {
                  setEditingRequirement(null)
                  form.reset({
                    requirementCode: "",
                    requirementName: "",
                    description: "",
                    requirementType: "document",
                    isRequired: true,
                    displayOrder: sortedRequirements.length,
                  })
                  setShowAddForm(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Requirement
                </Button>
              </div>

              {showAddForm && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <h4 className="font-medium">
                    {editingRequirement ? "Edit Requirement" : "Add New Requirement"}
                  </h4>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="requirementCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Requirement Code (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., SHA-DOC-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="requirementType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="document">Document</SelectItem>
                                  <SelectItem value="information">Information</SelectItem>
                                  <SelectItem value="verification">Verification</SelectItem>
                                  <SelectItem value="authorization">Authorization</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="requirementName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requirement Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Completed Claim Form" {...field} />
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
                              <Textarea
                                placeholder="Detailed description of the requirement"
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Required</FormLabel>
                                <FormDescription>
                                  Must be completed before claim submission
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
                          name="displayOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Order</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                Lower numbers appear first
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false)
                            setEditingRequirement(null)
                            form.reset()
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : editingRequirement ? (
                            "Update Requirement"
                          ) : (
                            "Add Requirement"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {sortedRequirements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No requirements defined yet. Click "Add Requirement" to get started.
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requirement</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[100px]">Required</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRequirements.map((req) => (
                        <TableRow key={req.requirementId}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{req.displayOrder || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRequirementTypeIcon(req.requirementType)}
                              <span className="text-sm capitalize">{req.requirementType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{req.requirementName}</div>
                              {req.requirementCode && (
                                <div className="text-xs text-muted-foreground">{req.requirementCode}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-md truncate">
                              {req.description || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.isRequired ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(req)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingRequirement(req)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRequirement} onOpenChange={(open) => !open && setDeletingRequirement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRequirement?.requirementName}"? This will deactivate the requirement and it will no longer appear in new claims.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}






