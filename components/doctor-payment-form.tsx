"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"

// Define the form schema
const paymentFormSchema = z.object({
  doctorId: z.string().min(1, {
    message: "Doctor is required.",
  }),
  amount: z.coerce.number().min(1, {
    message: "Amount must be greater than 0.",
  }),
  paymentDate: z.date({
    required_error: "Payment date is required.",
  }),
  paymentMethod: z.string().min(1, {
    message: "Payment method is required.",
  }),
  reference: z.string().min(1, {
    message: "Reference number is required.",
  }),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

// Define the doctor type
type Doctor = {
  id: string
  name: string
  specialty: string
  totalRevenue: number
  hospitalShare: number
  kraShare: number
  doctorShare: number
  paidAmount: number
  pendingAmount: number
  patientCount: number
  completedTreatments: number
  lastPaymentDate: string
  status: string
}

// Generate a unique payment ID
const generatePaymentId = () => {
  return `PAY-${Math.floor(100000 + Math.random() * 900000)}`
}

export function DoctorPaymentForm({
  open,
  onOpenChange,
  doctorId,
  doctors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctorId: string | null
  doctors: Doctor[]
}) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Set default values
  const defaultValues: Partial<PaymentFormValues> = {
    doctorId: doctorId || "",
    paymentDate: new Date(),
    paymentMethod: "Bank Transfer",
    amount: 0,
  }

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues,
  })

  // Update form when doctorId changes
  useEffect(() => {
    if (doctorId) {
      const doctor = doctors.find((d) => d.id === doctorId) || null
      setSelectedDoctor(doctor)

      if (doctor) {
        form.setValue("doctorId", doctor.id)
        form.setValue("amount", doctor.pendingAmount)
      }
    }
  }, [doctorId, doctors, form])

  // Handle doctor selection change
  const handleDoctorChange = (value: string) => {
    const doctor = doctors.find((d) => d.id === value) || null
    setSelectedDoctor(doctor)

    if (doctor) {
      form.setValue("amount", doctor.pendingAmount)
    }
  }

  function onSubmit(data: PaymentFormValues) {
    // In a real app, this would send the data to your API
    toast({
      title: "Payment processed successfully",
      description: `Payment of ${formatCurrency(data.amount)} to ${selectedDoctor?.name} has been recorded.`,
    })

    onOpenChange(false)
    form.reset(defaultValues)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Process Doctor Payment</DialogTitle>
          <DialogDescription>Record a payment to a doctor for their revenue share.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleDoctorChange(value)
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors
                        .filter((doctor) => doctor.pendingAmount > 0)
                        .map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.specialty}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDoctor && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                <div>
                  <div className="text-sm text-muted-foreground">Total Share</div>
                  <div className="font-medium">{formatCurrency(selectedDoctor.doctorShare)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Pending Amount</div>
                  <div className="font-medium">{formatCurrency(selectedDoctor.pendingAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Previously Paid</div>
                  <div className="font-medium">{formatCurrency(selectedDoctor.paidAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Payment</div>
                  <div className="font-medium">{selectedDoctor.lastPaymentDate}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Amount to be paid to the doctor</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., BT-20230625-001" />
                    </FormControl>
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
                    <Textarea
                      placeholder="Add any additional notes about this payment"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Process Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
