"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { formatDateLong, formatTime } from "@/lib/date-utils"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { doctorsApi, maternityApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const newbornSchema = z.object({
  gender: z.string({
    required_error: "Please select gender.",
  }),
  birthWeight: z.string({
    required_error: "Birth weight is required.",
  }),
  birthLength: z.string().optional(),
  headCircumference: z.string().optional(),
  apgarScore1Min: z.string().optional(),
  apgarScore5Min: z.string().optional(),
  healthStatus: z.string().optional(),
  feedingMethod: z.string().optional(),
  birthDefects: z.string().optional(),
  notes: z.string().optional(),
})

const deliveryFormSchema = z.object({
  maternityAdmissionId: z.string({
    required_error: "Maternity admission is required.",
  }),
  deliveryDate: z.date({
    required_error: "Delivery date is required.",
  }),
  deliveryTime: z.string({
    required_error: "Delivery time is required.",
  }),
  deliveryType: z.string({
    required_error: "Please select delivery type.",
  }),
  deliveryMode: z.string().optional(),
  complications: z.string().optional(),
  maternalOutcome: z.string({
    required_error: "Please select maternal outcome.",
  }),
  assistedBy: z.string({
    required_error: "Please select assisting doctor.",
  }),
  newborns: z.array(newbornSchema).min(1, {
    message: "At least one newborn is required.",
  }),
  notes: z.string().optional(),
})

type NewbornValues = z.infer<typeof newbornSchema>
type DeliveryFormValues = z.infer<typeof deliveryFormSchema>

const defaultNewborn: NewbornValues = {
  gender: "",
  birthWeight: "",
  birthLength: "",
  headCircumference: "",
  apgarScore1Min: "",
  apgarScore5Min: "",
  healthStatus: "healthy",
  feedingMethod: "",
  birthDefects: "",
  notes: "",
}

const defaultValues: Partial<DeliveryFormValues> = {
  maternityAdmissionId: "",
  deliveryTime: "",
  deliveryType: "normal",
  deliveryMode: "",
  complications: "",
  maternalOutcome: "good",
  assistedBy: "",
  newborns: [defaultNewborn],
  notes: "",
}

interface AddDeliveryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  maternityAdmissionId?: number // Pre-fill if called from admission actions
}

export function AddDeliveryForm({
  open,
  onOpenChange,
  onSuccess,
  maternityAdmissionId: prefillAdmissionId,
}: AddDeliveryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "newborns",
  })

  useEffect(() => {
    if (open) {
      loadDoctors()
      // Set dates client-side only to avoid hydration mismatch
      const now = new Date()
      form.reset({
        ...defaultValues,
        maternityAdmissionId: prefillAdmissionId?.toString() || "",
        deliveryDate: now,
        deliveryTime: format(now, "HH:mm"),
        newborns: [defaultNewborn],
      })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillAdmissionId])

  const loadDoctors = async () => {
    try {
      setLoading(true)
      const doctorsData = await doctorsApi.getAll()
      setDoctors(doctorsData || [])
    } catch (err: any) {
      console.error('Error loading doctors:', err)
      toast({
        title: "Error loading doctors",
        description: err.message || "Failed to load doctors",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: DeliveryFormValues) {
    try {
      setIsSubmitting(true)
      setError(null)

      // Prepare API payload
      const payload = {
        maternityAdmissionId: parseInt(data.maternityAdmissionId),
        deliveryDate: data.deliveryDate.toISOString().split('T')[0],
        deliveryTime: data.deliveryTime || null,
        deliveryType: data.deliveryType,
        deliveryMode: data.deliveryMode || null,
        complications: data.complications || null,
        maternalOutcome: data.maternalOutcome,
        assistedBy: parseInt(data.assistedBy),
        notes: data.notes || null,
        newborns: data.newborns.map((newborn) => ({
          gender: newborn.gender,
          birthWeight: parseFloat(newborn.birthWeight),
          birthLength: newborn.birthLength ? parseFloat(newborn.birthLength) : null,
          headCircumference: newborn.headCircumference ? parseFloat(newborn.headCircumference) : null,
          apgarScore1Min: newborn.apgarScore1Min ? parseInt(newborn.apgarScore1Min) : null,
          apgarScore5Min: newborn.apgarScore5Min ? parseInt(newborn.apgarScore5Min) : null,
          healthStatus: newborn.healthStatus || 'healthy',
          feedingMethod: newborn.feedingMethod || null,
          birthDefects: newborn.birthDefects || null,
          notes: newborn.notes || null,
        })),
      }

      await maternityApi.createDelivery(payload)
      
      toast({
        title: "Delivery recorded",
        description: `Delivery has been recorded successfully.`,
      })
      
      form.reset()
      onOpenChange(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to record delivery'
      setError(errorMessage)
      toast({
        title: "Error recording delivery",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Error recording delivery:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Delivery</DialogTitle>
          <DialogDescription>Record delivery details and newborn information.</DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading form data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!prefillAdmissionId && (
                <FormField
                  control={form.control}
                  name="maternityAdmissionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maternity Admission ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter maternity admission ID" {...field} />
                      </FormControl>
                      <FormDescription>Enter the maternity admission ID</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? formatDateLong(field.value) : <span>Select date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal (Vaginal)</SelectItem>
                          <SelectItem value="caesarean">Caesarean (C-Section)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maternalOutcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maternal Outcome</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Mode</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Spontaneous vaginal delivery, Lower segment caesarean section" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assistedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assisted By (Doctor)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.userId} value={doctor.userId.toString()}>
                              Dr. {doctor.firstName} {doctor.lastName} {doctor.department ? `- ${doctor.department}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="complications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complications</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any complications during delivery..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Newborns Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Newborn Information</h3>
                    <p className="text-sm text-muted-foreground">Add details for each baby delivered</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append(defaultNewborn)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Baby
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Baby {index + 1} {fields.length > 1 && `(of ${fields.length})`}
                        </CardTitle>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Unknown">Unknown</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.birthWeight`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Birth Weight (kg)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" placeholder="e.g., 3.2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.birthLength`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Length (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" min="0" placeholder="e.g., 50" {...field} />
                              </FormControl>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.headCircumference`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Head Circumference (cm)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" min="0" placeholder="e.g., 35" {...field} />
                              </FormControl>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.healthStatus`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Health Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "healthy"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="healthy">Healthy</SelectItem>
                                  <SelectItem value="stable">Stable</SelectItem>
                                  <SelectItem value="critical">Critical</SelectItem>
                                  <SelectItem value="deceased">Deceased</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.apgarScore1Min`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Apgar Score (1 min)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="10" placeholder="0-10" {...field} />
                              </FormControl>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.apgarScore5Min`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Apgar Score (5 min)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="10" placeholder="0-10" {...field} />
                              </FormControl>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.feedingMethod`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Feeding Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Breastfeeding">Breastfeeding</SelectItem>
                                  <SelectItem value="Formula">Formula</SelectItem>
                                  <SelectItem value="Mixed">Mixed</SelectItem>
                                  <SelectItem value="Tube feeding">Tube feeding</SelectItem>
                                  <SelectItem value="Not yet feeding">Not yet feeding</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`newborns.${index}.birthDefects`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Birth Defects</FormLabel>
                              <FormControl>
                                <Input placeholder="Any birth defects or anomalies" {...field} />
                              </FormControl>
                              <FormDescription>Optional</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`newborns.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional notes for this baby" className="min-h-[60px]" {...field} />
                            </FormControl>
                            <FormDescription>Optional</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional delivery notes..." className="min-h-[80px]" {...field} />
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
                  Record Delivery
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}



