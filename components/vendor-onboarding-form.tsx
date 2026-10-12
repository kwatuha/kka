"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, Upload } from "lucide-react"

const vendorOnboardingSchema = z.object({
  // Basic Information
  name: z.string().min(2, {
    message: "Vendor name must be at least 2 characters.",
  }),
  registrationNumber: z.string().min(2, {
    message: "Registration number is required.",
  }),
  taxId: z.string().min(2, {
    message: "Tax ID is required.",
  }),
  website: z
    .string()
    .url({
      message: "Please enter a valid website URL.",
    })
    .optional()
    .or(z.literal("")),
  yearEstablished: z.string().regex(/^\d{4}$/, {
    message: "Please enter a valid year (e.g., 2010).",
  }),

  // Contact Information
  contactPerson: z.string().min(2, {
    message: "Contact person name must be at least 2 characters.",
  }),
  position: z.string().min(2, {
    message: "Position is required.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 characters.",
  }),
  alternativePhone: z.string().optional(),

  // Address Information
  physicalAddress: z.string().min(5, {
    message: "Physical address must be at least 5 characters.",
  }),
  postalAddress: z.string().min(5, {
    message: "Postal address must be at least 5 characters.",
  }),
  city: z.string().min(2, {
    message: "City is required.",
  }),
  country: z.string().min(2, {
    message: "Country is required.",
  }),

  // Business Information
  category: z.string({
    required_error: "Please select a vendor category.",
  }),
  businessType: z.string({
    required_error: "Please select a business type.",
  }),
  products: z.string().min(5, {
    message: "Please provide a description of products/services.",
  }),

  // Banking Information
  bankName: z.string().min(2, {
    message: "Bank name is required.",
  }),
  accountNumber: z.string().min(5, {
    message: "Account number is required.",
  }),
  branchName: z.string().min(2, {
    message: "Branch name is required.",
  }),
  swiftCode: z.string().optional(),

  // Terms and Compliance
  paymentTerms: z.string({
    required_error: "Please select payment terms.",
  }),
  acceptsTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions.",
  }),
  acceptsCode: z.boolean().refine((val) => val === true, {
    message: "You must accept the code of conduct.",
  }),
})

type VendorOnboardingValues = z.infer<typeof vendorOnboardingSchema>

const defaultValues: Partial<VendorOnboardingValues> = {
  name: "",
  registrationNumber: "",
  taxId: "",
  website: "",
  yearEstablished: "",
  contactPerson: "",
  position: "",
  email: "",
  phone: "",
  alternativePhone: "",
  physicalAddress: "",
  postalAddress: "",
  city: "",
  country: "Kenya",
  category: "",
  businessType: "",
  products: "",
  bankName: "",
  accountNumber: "",
  branchName: "",
  swiftCode: "",
  paymentTerms: "",
  acceptsTerms: false,
  acceptsCode: false,
}

interface VendorOnboardingFormProps {
  onSuccess?: () => void
}

export function VendorOnboardingForm({ onSuccess }: VendorOnboardingFormProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<VendorOnboardingValues>({
    resolver: zodResolver(vendorOnboardingSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: VendorOnboardingValues) {
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      console.log(data)
      toast({
        title: "Vendor onboarding submitted",
        description: `${data.name} has been submitted for approval.`,
      })

      setIsSubmitting(false)
      form.reset()

      if (onSuccess) {
        onSuccess()
      }
    }, 1500)
  }

  const nextTab = () => {
    if (activeTab === "basic") setActiveTab("contact")
    else if (activeTab === "contact") setActiveTab("business")
    else if (activeTab === "business") setActiveTab("banking")
    else if (activeTab === "banking") setActiveTab("compliance")
  }

  const prevTab = () => {
    if (activeTab === "contact") setActiveTab("basic")
    else if (activeTab === "business") setActiveTab("contact")
    else if (activeTab === "banking") setActiveTab("business")
    else if (activeTab === "compliance") setActiveTab("banking")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="banking">Banking</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the basic details about the vendor organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="MediSupply Co. Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number*</FormLabel>
                        <FormControl>
                          <Input placeholder="BN-12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / PIN*</FormLabel>
                        <FormControl>
                          <Input placeholder="A123456789B" {...field} />
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
                          <Input placeholder="https://www.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="yearEstablished"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Established*</FormLabel>
                        <FormControl>
                          <Input placeholder="2010" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Company Documents</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border border-dashed rounded-md p-4 text-center">
                      <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Registration Certificate</p>
                      <p className="text-xs text-muted-foreground mb-2">PDF or image file (max 5MB)</p>
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <div className="border border-dashed rounded-md p-4 text-center">
                      <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Tax Compliance Certificate</p>
                      <p className="text-xs text-muted-foreground mb-2">PDF or image file (max 5MB)</p>
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" disabled>
                  Previous
                </Button>
                <Button type="button" onClick={nextTab}>
                  Next
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Provide contact details for the vendor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Person*</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position/Title*</FormLabel>
                        <FormControl>
                          <Input placeholder="Sales Manager" {...field} />
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
                        <FormLabel>Email Address*</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@vendor.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number*</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alternativePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 723 456 789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="physicalAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Address*</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Business Park, Nairobi" className="resize-none" {...field} />
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
                        <FormLabel>Postal Address*</FormLabel>
                        <FormControl>
                          <Textarea placeholder="P.O. Box 12345, Nairobi" className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nairobi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country*</FormLabel>
                        <FormControl>
                          <Input placeholder="Kenya" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevTab}>
                  Previous
                </Button>
                <Button type="button" onClick={nextTab}>
                  Next
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Business Information Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Provide details about the vendor's business and products/services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Category*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medical-supplies">Medical Supplies</SelectItem>
                            <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                            <SelectItem value="equipment">Medical Equipment</SelectItem>
                            <SelectItem value="laboratory">Laboratory Supplies</SelectItem>
                            <SelectItem value="office">Office Supplies</SelectItem>
                            <SelectItem value="cleaning">Cleaning Supplies</SelectItem>
                            <SelectItem value="food">Food Services</SelectItem>
                            <SelectItem value="it">IT Equipment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="limited-company">Limited Company</SelectItem>
                            <SelectItem value="corporation">Corporation</SelectItem>
                            <SelectItem value="non-profit">Non-Profit Organization</SelectItem>
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
                  name="products"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Products/Services Description*</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the products or services offered by this vendor"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed description of the products or services this vendor offers.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Product Catalog</h3>
                  <div className="border border-dashed rounded-md p-4 text-center">
                    <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload Product Catalog</p>
                    <p className="text-xs text-muted-foreground mb-2">PDF, Excel, or CSV file (max 10MB)</p>
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevTab}>
                  Previous
                </Button>
                <Button type="button" onClick={nextTab}>
                  Next
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Banking Information Tab */}
          <TabsContent value="banking">
            <Card>
              <CardHeader>
                <CardTitle>Banking Information</CardTitle>
                <CardDescription>Provide banking details for payment processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Kenya Commercial Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number*</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branchName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Westlands Branch" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="swiftCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SWIFT Code</FormLabel>
                        <FormControl>
                          <Input placeholder="KCBLKENX" {...field} />
                        </FormControl>
                        <FormDescription>Required for international transfers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Payment Terms*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate Payment</SelectItem>
                          <SelectItem value="net15">Net 15 Days</SelectItem>
                          <SelectItem value="net30">Net 30 Days</SelectItem>
                          <SelectItem value="net45">Net 45 Days</SelectItem>
                          <SelectItem value="net60">Net 60 Days</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Bank Verification</h3>
                  <div className="border border-dashed rounded-md p-4 text-center">
                    <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload Bank Verification Letter</p>
                    <p className="text-xs text-muted-foreground mb-2">PDF or image file (max 5MB)</p>
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevTab}>
                  Previous
                </Button>
                <Button type="button" onClick={nextTab}>
                  Next
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Terms and Compliance</CardTitle>
                <CardDescription>Review and accept terms and conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-md p-4 bg-muted/50">
                  <h3 className="text-sm font-medium mb-2">Vendor Terms and Conditions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    By accepting these terms, you agree to comply with all hospital procurement policies, maintain
                    confidentiality of information, adhere to delivery schedules, and maintain quality standards for all
                    products and services provided to Kiplombe Medical Centre.
                  </p>

                  <FormField
                    control={form.control}
                    name="acceptsTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I accept the vendor terms and conditions*</FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-md p-4 bg-muted/50">
                  <h3 className="text-sm font-medium mb-2">Code of Conduct</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Kiplombe Medical Centre is committed to ethical business practices. All vendors must adhere
                    to our code of conduct which prohibits corruption, bribery, discrimination, and requires compliance
                    with labor laws and environmental regulations.
                  </p>

                  <FormField
                    control={form.control}
                    name="acceptsCode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I accept the code of conduct*</FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Additional Documents</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border border-dashed rounded-md p-4 text-center">
                      <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Quality Certifications</p>
                      <p className="text-xs text-muted-foreground mb-2">ISO, CE, or other certifications</p>
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                    <div className="border border-dashed rounded-md p-4 text-center">
                      <FileUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Insurance Certificates</p>
                      <p className="text-xs text-muted-foreground mb-2">Liability insurance documents</p>
                      <Button type="button" variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevTab}>
                  Previous
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  )
}
