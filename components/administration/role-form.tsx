"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { roleApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoleMenuConfig, RoleMenuConfigRef } from "./role-menu-config"
import { Search, Settings } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import * as LucideIcons from "lucide-react"
import Link from "next/link"
import { DASHBOARD_CARDS } from "@/lib/dashboard-cards-config"

const quickLinkSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().min(1, "URL is required"),
  icon: z.string().optional(),
})

const formSchema = z.object({
  roleName: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  privileges: z.array(z.number()).optional(),
  landingPageType: z.enum(['dashboard', 'hub', 'app_view', 'redirect']).default('dashboard'),
  landingPageLabel: z.string().nullable().optional(),
  landingPageUrl: z.string().nullable().optional(),
  landingPageIcon: z.string().nullable().optional(),
  landingPageDescription: z.string().nullable().optional(),
  defaultServicePoint: z.string().nullable().optional(),
  landingQuickLinks: z.array(quickLinkSchema).optional().default([]),
  dashboardCards: z.record(z.string(), z.boolean()).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface RoleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  role?: any
  privileges: any[]
}

export function RoleForm({ open, onOpenChange, onSuccess, role, privileges }: RoleFormProps) {
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [privilegeDialogOpen, setPrivilegeDialogOpen] = useState(false)
  const [modulePrivilegeSearch, setModulePrivilegeSearch] = useState("")
  const menuConfigRef = useRef<RoleMenuConfigRef>(null)
  const isEditing = !!role

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roleName: "",
      description: "",
      isActive: true,
      privileges: [],
      landingPageType: 'dashboard',
      landingPageLabel: null,
      landingPageUrl: null,
      landingPageIcon: null,
      landingPageDescription: null,
      defaultServicePoint: null,
      landingQuickLinks: [],
      dashboardCards: {},
    },
  })

  const { fields: quickLinkFields, append: appendQuickLink, remove: removeQuickLink } = useFieldArray({
    control: form.control,
    name: "landingQuickLinks",
  })

  // Keep a ref in sync with quick links so submit always has the latest (avoids stale closure / unmount issues)
  const landingQuickLinksRef = useRef<{ label?: string; url?: string; icon?: string }[]>([])
  const watchedQuickLinks = form.watch("landingQuickLinks")
  useEffect(() => {
    if (Array.isArray(watchedQuickLinks)) {
      landingQuickLinksRef.current = watchedQuickLinks
    }
  }, [watchedQuickLinks])

  // Group privileges by module (memoized) - Must be defined before useEffect that uses it
  // If module is null, infer from privilege name
  const groupedPrivileges = useMemo(() => {
    return privileges.reduce((acc, priv) => {
      let module = priv.module

      // If module is null/empty, infer from privilege name
      if (!module || module === "null" || module === "") {
        const name = priv.privilegeName?.toLowerCase() || ""
        if (name.includes("patient")) {
          module = "Patient Management"
        } else if (name.includes("appointment")) {
          module = "Appointments"
        } else if (name.includes("medical") || name.includes("record")) {
          module = "Medical Records"
        } else if (name.includes("medication") || name.includes("prescribe") || name.includes("dispense")) {
          module = "Pharmacy"
        } else if (name.includes("billing") || name.includes("charge") || name.includes("payment")) {
          module = "Billing & Finance"
        } else if (name.includes("inventory") || name.includes("stock")) {
          module = "Inventory"
        } else if (name.includes("user") || name.includes("role") || name.includes("privilege")) {
          module = "User Management"
        } else if (name.includes("report")) {
          module = "Reports"
        } else if (name.includes("lab") || name.includes("test")) {
          module = "Laboratory"
        } else if (name.includes("radiology") || name.includes("imaging")) {
          module = "Radiology"
        } else {
          module = "Other"
        }
      }

      if (!acc[module]) {
        acc[module] = []
      }
      acc[module].push(priv)
      return acc
    }, {} as Record<string, any[]>)
  }, [privileges])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open && isMounted) {
      if (role) {
        // Extract only assigned privilege IDs from the role
        const assignedPrivilegeIds = role.privileges && Array.isArray(role.privileges)
          ? role.privileges.map((p: any) => {
              // Handle both object format {privilegeId: X} and direct ID
              const id = typeof p === 'object' ? p.privilegeId : p
              return id != null ? Number(id) : null
            }).filter((id: any) => id != null) as number[]
          : []

        console.log("Loading role privileges:", {
          roleName: role.roleName,
          roleId: role.roleId,
          privilegesFromAPI: role.privileges,
          assignedPrivilegeIds,
          totalAvailablePrivileges: privileges.length,
          assignedCount: assignedPrivilegeIds.length
        })

        // Initialize dashboard cards - if role has dashboardCards, use them, otherwise default all to true
        const dashboardCardsConfig: Record<string, boolean> = {}
        if (role.dashboardCards && typeof role.dashboardCards === 'object') {
          // Use existing configuration and ensure all values are booleans
          Object.keys(role.dashboardCards).forEach(cardId => {
            const value = role.dashboardCards[cardId]
            dashboardCardsConfig[cardId] = Boolean(value === 1 || value === true)
          })
          // Ensure all cards from DASHBOARD_CARDS are included (default to true if not in config)
          DASHBOARD_CARDS.forEach(card => {
            if (!(card.id in dashboardCardsConfig)) {
              dashboardCardsConfig[card.id] = true
            }
          })
        } else {
          // Default all cards to visible (will be filtered by privileges)
          DASHBOARD_CARDS.forEach(card => {
            dashboardCardsConfig[card.id] = true
          })
        }

        form.reset({
          roleName: role.roleName ?? "",
          description: role.description ?? "",
          isActive: role.isActive === 1 || role.isActive === true || (role.isActive !== 0 && role.isActive !== false),
          privileges: assignedPrivilegeIds,
          landingPageType: role.landingPageType ?? 'dashboard',
          landingPageLabel: role.landingPageLabel ?? null,
          landingPageUrl: role.landingPageUrl ?? null,
          landingPageIcon: role.landingPageIcon ?? null,
          landingPageDescription: role.landingPageDescription ?? null,
          defaultServicePoint: role.defaultServicePoint ?? null,
          landingQuickLinks: (() => {
            const raw = role.landingQuickLinks
            if (!raw) return []
            try {
              const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
              return Array.isArray(arr) ? arr : []
            } catch { return [] }
          })(),
          dashboardCards: dashboardCardsConfig,
        })
      } else {
        // Initialize dashboard cards - default all to true
        const defaultDashboardCards: Record<string, boolean> = {}
        DASHBOARD_CARDS.forEach(card => {
          defaultDashboardCards[card.id] = true
        })
        
        form.reset({
          roleName: "",
          description: "",
          isActive: true,
          privileges: [],
          landingPageType: 'dashboard',
          landingPageLabel: null,
          landingPageUrl: null,
          landingPageIcon: null,
          landingPageDescription: null,
          defaultServicePoint: null,
          landingQuickLinks: [],
          dashboardCards: defaultDashboardCards,
        })
      }
      
      // Ensure dashboardCards is always an object, never undefined
      const currentDashboardCards = form.getValues('dashboardCards')
      if (!currentDashboardCards || typeof currentDashboardCards !== 'object') {
        const defaultCards: Record<string, boolean> = {}
        DASHBOARD_CARDS.forEach(card => {
          defaultCards[card.id] = true
        })
        form.setValue('dashboardCards', defaultCards)
      }
      
      // Ensure isActive is a boolean, not a number
      const currentIsActive = form.getValues('isActive')
      if (typeof currentIsActive !== 'boolean') {
        form.setValue('isActive', Boolean(currentIsActive === 1 || currentIsActive === true))
      }
    }
  }, [role, open, isMounted, form])


  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      
      // Ensure all dashboard cards are included in the payload
      // Cards not explicitly set should default to true
      const dashboardCardsConfig: Record<string, boolean> = {}
      DASHBOARD_CARDS.forEach(card => {
        // Use the value from form data if set, otherwise default to true
        dashboardCardsConfig[card.id] = data.dashboardCards?.[card.id] ?? true
      })
      
      // Read quick links from ref (kept in sync via watch) so we never lose them on submit
      const rawQuickLinks =
        (landingQuickLinksRef.current?.length ? landingQuickLinksRef.current : null) ??
        data.landingQuickLinks ??
        form.getValues("landingQuickLinks") ??
        []
      const landingQuickLinks =
        data.landingPageType === "app_view" && Array.isArray(rawQuickLinks)
          ? rawQuickLinks.filter((l: { label?: string; url?: string }) => l?.label?.trim() && l?.url?.trim())
          : []
      
      const payload = {
        roleName: data.roleName,
        description: data.description || null,
        isActive: data.isActive,
        privileges: data.privileges || [],
        landingPageType: data.landingPageType,
        landingPageLabel:
          data.landingPageType !== 'dashboard' && data.landingPageType !== 'hub'
            ? data.landingPageLabel
            : null,
        landingPageUrl:
          data.landingPageType !== 'dashboard' && data.landingPageType !== 'hub'
            ? data.landingPageUrl
            : null,
        landingPageIcon:
          data.landingPageType !== 'dashboard' && data.landingPageType !== 'hub'
            ? data.landingPageIcon
            : null,
        landingPageDescription:
          data.landingPageType !== 'dashboard' && data.landingPageType !== 'hub'
            ? data.landingPageDescription
            : null,
        defaultServicePoint: data.defaultServicePoint || null,
        landingQuickLinks,
        dashboardCards: dashboardCardsConfig,
      }

      if (isEditing) {
        // Save role details
        await roleApi.update(role.roleId.toString(), payload)
        console.log("Role details saved successfully")

        // Also save menu configuration if available
        let menuConfigSaved = false
        let menuConfigError: string | null = null

        // Wait a bit to ensure the ref is initialized if component was just mounted
        // Try multiple times to account for async component mounting
        let attempts = 0
        const maxAttempts = 5
        while (!menuConfigRef.current && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (menuConfigRef.current) {
          try {
            console.log("Attempting to save menu configuration...")
            const menuConfig = menuConfigRef.current.getConfig()
            console.log("Menu config state:", {
              hasConfig: !!menuConfig,
              categoriesCount: menuConfig?.categories?.length || 0,
              menuItemsCount: menuConfig?.menuItems?.length || 0,
              tabsCount: menuConfig?.tabs?.length || 0,
              queuesCount: menuConfig?.queues?.length || 0,
            })

            // Always try to save if ref exists - the component will handle validation
            // The config should always be populated after component loads
            console.log("Calling menuConfigRef.current.save()...")
            const saveResult = await menuConfigRef.current.save()
            console.log("Menu config save returned:", saveResult)
            menuConfigSaved = true
            console.log("Menu configuration saved successfully")
          } catch (menuError: any) {
            // If menu config save fails, still show success for role update
            // but warn about menu config
            console.error("Menu config save failed with error:", menuError)
            console.error("Error stack:", menuError.stack)
            menuConfigError = menuError.message || "Unknown error"
          }
        } else {
          console.warn("Menu config ref is null after waiting - menu configuration component may not be mounted")
          console.warn("Attempts made:", attempts, "out of", maxAttempts)
          // Don't treat this as an error - role was updated successfully
          // Menu config will be saved when user visits that tab
        }

        // Always show success message for role update
        if (menuConfigError) {
          toast({
            title: "Role Updated Successfully",
            description: `Role has been updated. However, menu configuration could not be saved: ${menuConfigError}. You can update menu configuration separately in the "Menu & Tab Access" tab.`,
            variant: "default",
            duration: 7000,
          })
        } else if (menuConfigSaved) {
          toast({
            title: "Success",
            description: "Role and menu configuration updated successfully.",
            duration: 5000,
          })
        } else {
          toast({
            title: "Success",
            description: "Role updated successfully.",
            duration: 5000,
          })
        }

        form.reset()
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        // Create new role
        const newRole = await roleApi.create(payload)
        toast({
          title: "Success",
          description: "Role created successfully. Please edit the role to configure menu access.",
          duration: 5000,
        })
        form.reset()
        onOpenChange(false)
        if (onSuccess) onSuccess()
      }
    } catch (error: any) {
      console.error("Error saving role:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save role.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const getModuleSelectionCount = (module: string, modulePrivileges: any[]) => {
    const currentPrivileges = form.watch("privileges") || []
    // Ensure we're comparing numbers to numbers
    const currentPrivilegeIds = currentPrivileges.map((id: any) => Number(id))
    const modulePrivilegeIds = modulePrivileges.map((p: any) => Number(p.privilegeId))
    const selectedCount = modulePrivilegeIds.filter((id: number) =>
      currentPrivilegeIds.includes(id)
    ).length
    return selectedCount
  }

  const isModuleFullySelected = (module: string, modulePrivileges: any[]) => {
    const currentPrivileges = form.watch("privileges") || []
    // Ensure we're comparing numbers to numbers
    const currentPrivilegeIds = currentPrivileges.map((id: any) => Number(id))
    return modulePrivileges.length > 0 && modulePrivileges.every((p: any) =>
      currentPrivilegeIds.includes(Number(p.privilegeId))
    )
  }

  const openPrivilegeDialog = (module: string) => {
    setSelectedModule(module)
    setModulePrivilegeSearch("")
    setPrivilegeDialogOpen(true)
  }

  const closePrivilegeDialog = () => {
    setPrivilegeDialogOpen(false)
    setSelectedModule(null)
    setModulePrivilegeSearch("")
  }

  const handlePrivilegeSelection = (module: string, selectedPrivilegeIds: Set<number>) => {
    const currentPrivileges = form.getValues("privileges") || []
    const modulePrivileges = groupedPrivileges[module] || []
    const modulePrivilegeIds = modulePrivileges.map((p: any) => p.privilegeId)

    // Remove all privileges from this module first
    const privilegesWithoutModule = currentPrivileges.filter((id: number) => !modulePrivilegeIds.includes(id))

    // Add selected privileges
    const newPrivileges = [...privilegesWithoutModule, ...Array.from(selectedPrivilegeIds)]
    form.setValue("privileges", newPrivileges)
    closePrivilegeDialog()
  }

  // Get filtered privileges for the selected module
  const getFilteredModulePrivileges = (module: string) => {
    const modulePrivileges = groupedPrivileges[module] || []
    if (!modulePrivilegeSearch) {
      return modulePrivileges
    }
    const searchLower = modulePrivilegeSearch.toLowerCase()
    return modulePrivileges.filter((priv: any) =>
      priv.privilegeName?.toLowerCase().includes(searchLower) ||
      priv.description?.toLowerCase().includes(searchLower)
    )
  }

  if (!isMounted) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {isEditing ? "Edit Role" : "Add New Role"}
                  {isEditing && role && (
                    <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                      {role.roleName}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {isEditing && role ? (
                    <span>
                      Updating role: <span className="font-semibold text-foreground">{role.roleName}</span>
                      {role.description && (
                        <span className="text-muted-foreground"> • {role.description}</span>
                      )}
                    </span>
                  ) : (
                    "Create a new role and assign privileges and menu access."
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {isEditing && role ? (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                  <TabsTrigger value="basic">Basic Info & Privileges</TabsTrigger>
                  <TabsTrigger value="menu">Menu & Tab Access</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="mt-4">
                  <Form {...form}>
                    <form id="edit-role-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Administrator" {...field} />
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
                    <Textarea placeholder="Role description..." {...field} />
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
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Enable or disable this role
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold">Landing Page Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Define what users with this role see immediately after logging in.
            </p>

            <FormField
              control={form.control}
              name="landingPageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landing Page Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a landing page type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard (legacy)</SelectItem>
                      <SelectItem value="hub">Module hub (recommended)</SelectItem>
                      <SelectItem value="app_view">App View (Simplified Card)</SelectItem>
                      <SelectItem value="redirect">Redirect to URL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how users with this role will land after login.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('landingPageType') !== 'dashboard' &&
              form.watch('landingPageType') !== 'hub' && (
              <>
                <FormField
                  control={form.control}
                  name="landingPageLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Triage Service Point" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        The title displayed on the landing page or redirect button.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landingPageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page URL</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., /queue/service" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        The internal path or external URL to redirect to or link to.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landingPageIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page Icon (Lucide Icon Name)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Activity, Home" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        A <Link href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide icon name</Link> to display (e.g., "Activity"). Defaults to "Home".
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landingPageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief description for the landing page." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        An optional description for the app view card or redirect message.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultServicePoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Service Point</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value || undefined)} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service point (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="triage">Triage</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="laboratory">Laboratory</SelectItem>
                          <SelectItem value="radiology">Radiology</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The default service point for this role. If the landing page URL is /queue/service, this will automatically filter to show only this service point. Leave empty for no default.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="landingQuickLinks"
                  render={() => (
                    <FormItem>
                      <FormLabel>Quick links (multiple buttons)</FormLabel>
                      <FormDescription>
                        Add multiple buttons on the landing page (e.g. Inpatient and Nursing Department). If any are set, they are shown instead of the single button above.
                      </FormDescription>
                      <div className="space-y-3">
                        {quickLinkFields.map((field, index) => (
                          <Card key={field.id} className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                              <FormField
                                control={form.control}
                                name={`landingQuickLinks.${index}.label`}
                                render={({ field: f }) => (
                                  <FormItem className="md:col-span-4">
                                    <FormLabel className="text-xs">Label</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. Inpatient" {...f} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`landingQuickLinks.${index}.url`}
                                render={({ field: f }) => (
                                  <FormItem className="md:col-span-4">
                                    <FormLabel className="text-xs">URL</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. /inpatient" {...f} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`landingQuickLinks.${index}.icon`}
                                render={({ field: f }) => (
                                  <FormItem className="md:col-span-3">
                                    <FormLabel className="text-xs">Icon (optional)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. Bed, Users" {...f} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="md:col-span-1 text-destructive"
                                onClick={() => removeQuickLink(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendQuickLink({ label: "", url: "", icon: "" })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add link
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold">Dashboard Cards Configuration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure which summary cards are visible on the dashboard for users with this role. 
              Cards are automatically filtered by privileges, but you can override visibility here.
            </p>
            
            <FormField
              control={form.control}
              name="dashboardCards"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DASHBOARD_CARDS.map((card) => (
                      <Card key={card.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{card.title}</div>
                            {card.requiredPrivilege && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Requires: {card.requiredPrivilege}
                                {card.requiredPrivilegeModule && ` (${card.requiredPrivilegeModule})`}
                              </div>
                            )}
                          </div>
                          <Switch
                            checked={field.value?.[card.id] ?? true}
                            onCheckedChange={(checked) => {
                              const current = field.value || {}
                              field.onChange({
                                ...current,
                                [card.id]: checked,
                              })
                            }}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                  <FormDescription className="mt-2">
                    Toggle cards on/off. If a card is disabled, it won't appear on the dashboard even if the user has the required privilege.
                  </FormDescription>
                </FormItem>
              )}
            />

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold">Privileges</h3>

            <FormField
              control={form.control}
              name="privileges"
              render={() => {
                const selectedCount = form.watch("privileges")?.length || 0
                const totalCount = privileges.length

                return (
                  <FormItem>
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <FormLabel className="text-base">Privileges (Grouped by Module)</FormLabel>
                          <FormDescription>
                            Select privileges by module. Click "Select Privileges" to choose privileges for each category.
                          </FormDescription>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {selectedCount} / {totalCount} selected
                        </Badge>
                      </div>
                    </div>
                        <div className="space-y-3">
                          {Object.entries(groupedPrivileges).map(([module, modulePrivileges]: [string, any[]]) => {
                            const selectedCount = getModuleSelectionCount(module, modulePrivileges)
                            const isFullySelected = isModuleFullySelected(module, modulePrivileges)

                        return (
                          <Card key={module} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Settings className="h-4 w-4 text-muted-foreground" />
                                  <div className="font-semibold">{module}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {modulePrivileges.length} privilege{modulePrivileges.length !== 1 ? 's' : ''} available
                                  {selectedCount > 0 && (
                                    <span className="ml-2">
                                      • {selectedCount} selected
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {selectedCount > 0 && (
                                  <Badge variant={isFullySelected ? "default" : "secondary"}>
                                    {isFullySelected ? "All Selected" : `${selectedCount} Selected`}
                                  </Badge>
                                )}
                                <Button
                                  type="button"
                                  variant={selectedCount > 0 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => openPrivilegeDialog(module)}
                                >
                                  {selectedCount > 0 ? "Edit Selection" : "Select Privileges"}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="menu" className="mt-4 flex flex-col min-h-0" forceMount>
                <RoleMenuConfig
                  ref={menuConfigRef}
                  roleId={role.roleId.toString()}
                  roleName={role.roleName}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <Form {...form}>
              <form id="create-role-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="roleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Administrator" {...field} />
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
                        <Textarea placeholder="Role description..." {...field} />
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
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable this role
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />
                <h3 className="text-lg font-semibold">Landing Page Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Define what users with this role see immediately after logging in.
                </p>

                <FormField
                  control={form.control}
                  name="landingPageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a landing page type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dashboard">Dashboard (legacy)</SelectItem>
                          <SelectItem value="hub">Module hub (recommended)</SelectItem>
                          <SelectItem value="app_view">App View (Simplified Card)</SelectItem>
                          <SelectItem value="redirect">Redirect to URL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how users with this role will land after login.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('landingPageType') !== 'dashboard' &&
              form.watch('landingPageType') !== 'hub' && (
                  <>
                    <FormField
                      control={form.control}
                      name="landingPageLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landing Page Label</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Triage Service Point" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            The title displayed on the landing page or redirect button.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="landingPageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landing Page URL</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., /queue/service" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            The internal path or external URL to redirect to or link to.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="landingPageIcon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landing Page Icon (Lucide Icon Name)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Activity, Home" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            A <Link href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide icon name</Link> to display (e.g., "Activity"). Defaults to "Home".
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="landingPageDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landing Page Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="A brief description for the landing page." {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            An optional description for the app view card or redirect message.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultServicePoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Service Point</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a service point (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              <SelectItem value="triage">Triage</SelectItem>
                              <SelectItem value="consultation">Consultation</SelectItem>
                              <SelectItem value="pharmacy">Pharmacy</SelectItem>
                              <SelectItem value="laboratory">Laboratory</SelectItem>
                              <SelectItem value="radiology">Radiology</SelectItem>
                              <SelectItem value="cashier">Cashier</SelectItem>
                              <SelectItem value="billing">Billing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The default service point for this role. If the landing page URL is /queue/service, this will automatically filter to show only this service point.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="landingQuickLinks"
                      render={() => (
                        <FormItem>
                          <FormLabel>Quick links (multiple buttons)</FormLabel>
                          <FormDescription>
                            Add multiple buttons on the landing page (e.g. Inpatient and Nursing Department). If any are set, they are shown instead of the single button above.
                          </FormDescription>
                          <div className="space-y-3">
                            {quickLinkFields.map((field, index) => (
                              <Card key={field.id} className="p-3">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                  <FormField
                                    control={form.control}
                                    name={`landingQuickLinks.${index}.label`}
                                    render={({ field: f }) => (
                                      <FormItem className="md:col-span-4">
                                        <FormLabel className="text-xs">Label</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g. Inpatient" {...f} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`landingQuickLinks.${index}.url`}
                                    render={({ field: f }) => (
                                      <FormItem className="md:col-span-4">
                                        <FormLabel className="text-xs">URL</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g. /inpatient" {...f} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`landingQuickLinks.${index}.icon`}
                                    render={({ field: f }) => (
                                      <FormItem className="md:col-span-3">
                                        <FormLabel className="text-xs">Icon (optional)</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g. Bed, Users" {...f} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="md:col-span-1 text-destructive"
                                    onClick={() => removeQuickLink(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendQuickLink({ label: "", url: "", icon: "" })}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add link
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Separator className="my-4" />
                <h3 className="text-lg font-semibold">Dashboard Cards Configuration</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure which summary cards are visible on the dashboard for users with this role. 
                  Cards are automatically filtered by privileges, but you can override visibility here.
                </p>
                
                <FormField
                  control={form.control}
                  name="dashboardCards"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DASHBOARD_CARDS.map((card) => (
                          <Card key={card.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{card.title}</div>
                                {card.requiredPrivilege && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Requires: {card.requiredPrivilege}
                                    {card.requiredPrivilegeModule && ` (${card.requiredPrivilegeModule})`}
                                  </div>
                                )}
                              </div>
                              <Switch
                                checked={field.value?.[card.id] ?? true}
                                onCheckedChange={(checked) => {
                                  const current = field.value || {}
                                  field.onChange({
                                    ...current,
                                    [card.id]: checked,
                                  })
                                }}
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                      <FormDescription className="mt-2">
                        Toggle cards on/off. If a card is disabled, it won't appear on the dashboard even if the user has the required privilege.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />
                <h3 className="text-lg font-semibold">Privileges</h3>

                <FormField
                  control={form.control}
                  name="privileges"
                  render={() => {
                    const selectedCount = form.watch("privileges")?.length || 0
                    const totalCount = privileges.length

                    return (
                      <FormItem>
                        <div className="mb-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <FormLabel className="text-base">Privileges (Grouped by Module)</FormLabel>
                              <FormDescription>
                                Select privileges by module. Click "Select Privileges" to choose privileges for each category.
                              </FormDescription>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              {selectedCount} / {totalCount} selected
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(groupedPrivileges).map(([module, modulePrivileges]: [string, any[]]) => {
                            const selectedCount = getModuleSelectionCount(module, modulePrivileges)
                            const isFullySelected = isModuleFullySelected(module, modulePrivileges)

                            return (
                              <Card key={module} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Settings className="h-4 w-4 text-muted-foreground" />
                                      <div className="font-semibold">{module}</div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {modulePrivileges.length} privilege{modulePrivileges.length !== 1 ? 's' : ''} available
                                      {selectedCount > 0 && (
                                        <span className="ml-2">
                                          • {selectedCount} selected
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {selectedCount > 0 && (
                                      <Badge variant={isFullySelected ? "default" : "secondary"}>
                                        {isFullySelected ? "All Selected" : `${selectedCount} Selected`}
                                      </Badge>
                                    )}
                                    <Button
                                      type="button"
                                      variant={selectedCount > 0 ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => openPrivilegeDialog(module)}
                                    >
                                      {selectedCount > 0 ? "Edit Selection" : "Select Privileges"}
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </form>
            </Form>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={isEditing ? "edit-role-form" : "create-role-form"}
            disabled={loading}
            onClick={async (e) => {
              // Prevent default to handle validation first
              e.preventDefault()
              e.stopPropagation()
              
              console.log("Update Role button clicked")
              
              // Get current form values to debug
              const currentValues = form.getValues()
              console.log("Current form values:", currentValues)
              console.log("isActive type:", typeof currentValues.isActive, "value:", currentValues.isActive)
              console.log("dashboardCards type:", typeof currentValues.dashboardCards, "value:", currentValues.dashboardCards)
              
              // Trigger form validation
              const isValid = await form.trigger()
              console.log("Form validation result:", isValid)
              
              if (isValid) {
                // Get form values and submit
                const formData = form.getValues()
                console.log("Submitting form with data:", formData)
                await onSubmit(formData)
              } else {
                // Show validation errors with details
                const errors = form.formState.errors
                console.error("Form validation errors:", JSON.stringify(errors, null, 2))
                console.error("isActive error:", errors.isActive)
                console.error("dashboardCards error:", errors.dashboardCards)
                
                // Build detailed error message
                const errorMessages: string[] = []
                if (errors.isActive) {
                  errorMessages.push(`isActive: ${errors.isActive.message || 'Invalid value'}`)
                }
                if (errors.dashboardCards) {
                  errorMessages.push(`dashboardCards: ${errors.dashboardCards.message || 'Invalid value'}`)
                }
                
                toast({
                  title: "Validation Error",
                  description: errorMessages.length > 0 
                    ? `Please fix the following errors: ${errorMessages.join(', ')}`
                    : "Please fix the errors in the form before saving.",
                  variant: "destructive",
                })
              }
            }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Role" : "Create Role"}
          </Button>
        </div>
      </DialogContent>
      </Dialog>

      {/* Privilege Selection Dialog */}
      {selectedModule && (
        <PrivilegeSelectionDialog
          open={privilegeDialogOpen}
          onOpenChange={setPrivilegeDialogOpen}
          module={selectedModule}
          privileges={getFilteredModulePrivileges(selectedModule)}
          selectedPrivileges={(() => {
            // Get current form values directly instead of using watch
            const currentPrivileges = form.getValues("privileges") || []
            const modulePrivilegeIds = (groupedPrivileges[selectedModule] || []).map((p: any) => Number(p.privilegeId))
            const selected = currentPrivileges
              .map((id: any) => Number(id))
              .filter((id: number) => modulePrivilegeIds.includes(id))
            console.log("Dialog selectedPrivileges calculation:", {
              module: selectedModule,
              currentPrivileges,
              modulePrivilegeIds,
              selected
            })
            return new Set(selected)
          })()}
          onSelectionChange={(selected) => handlePrivilegeSelection(selectedModule, selected)}
          searchQuery={modulePrivilegeSearch}
          onSearchChange={setModulePrivilegeSearch}
        />
      )}
    </>
  )
}

// Privilege Selection Dialog Component
function PrivilegeSelectionDialog({
  open,
  onOpenChange,
  module,
  privileges,
  selectedPrivileges,
  onSelectionChange,
  searchQuery,
  onSearchChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  module: string
  privileges: any[]
  selectedPrivileges: Set<number>
  onSelectionChange: (selected: Set<number>) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}) {
  const [localSelected, setLocalSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Reset local state when dialog opens with new selected privileges
    if (open) {
      console.log("Dialog opened with selectedPrivileges:", selectedPrivileges)
      setLocalSelected(new Set(selectedPrivileges))
    } else {
      // Clear when dialog closes
      setLocalSelected(new Set())
    }
  }, [selectedPrivileges, open])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(privileges.map((p) => Number(p.privilegeId)))
      setLocalSelected(allIds)
    } else {
      setLocalSelected(new Set())
    }
  }

  const handleTogglePrivilege = (privilegeId: number, checked: boolean) => {
    const newSelected = new Set(localSelected)
    if (checked) {
      newSelected.add(privilegeId)
    } else {
      newSelected.delete(privilegeId)
    }
    setLocalSelected(newSelected)
  }

  const handleApply = () => {
    onSelectionChange(localSelected)
  }

  const allSelected = privileges.length > 0 && localSelected.size === privileges.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Privileges - {module}</DialogTitle>
          <DialogDescription>
            Choose the privileges to assign to this role for the {module} module
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search privileges..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="border rounded-lg max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Privilege Name</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {privileges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No privileges found matching your search." : "No privileges available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  privileges.map((priv) => {
                    const privilegeId = Number(priv.privilegeId)
                    const isSelected = localSelected.has(privilegeId)
                    return (
                      <TableRow key={privilegeId}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleTogglePrivilege(privilegeId, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{priv.privilegeName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {priv.description || "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {localSelected.size > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Privileges</p>
                  <p className="font-medium">{localSelected.size} privilege{localSelected.size !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Selection ({localSelected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

