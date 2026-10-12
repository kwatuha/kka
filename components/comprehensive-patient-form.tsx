"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { BirthDatePicker } from "@/components/birth-date-picker"
import { insuranceApi, patientApi, standardsApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { DEFAULT_FACILITY_COUNTY } from "@/lib/patient-demographics"
import { KenyaLocationSelect } from "@/components/kenya-location-select"

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const
const maritalStatuses = ["Single", "Married", "Divorced", "Widowed", "Separated"] as const
const relationshipTypes = ["Parent", "Spouse", "Child", "Sibling", "Friend", "Other"] as const
const idTypes = ["National ID", "Passport", "Birth Certificate", "Driver's License", "Other"] as const
const insuranceProviders = [
  "SHA",
  "AAR",
  "Jubilee",
  "Britam",
  "CIC",
  "Madison",
  "Resolution",
  "APA",
  "GA",
  "Other",
] as const

const personalInfoSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  middleName: z.string().optional(),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  dateOfBirth: z.date({ required_error: "Date of birth is required." }),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required." }),
  idType: z.enum(idTypes, { required_error: "ID type is required." }),
  idNumber: z.string().min(5, { message: "ID number must be at least 5 characters." }),
  nupi: z.string().optional(),
  maritalStatus: z.enum(maritalStatuses, { required_error: "Marital status is required." }),
  occupation: z.string().optional(),
  bloodGroup: z.enum(bloodGroups).optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
})

const contactInfoSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  alternativePhone: z.string().optional(),
  email: z.union([z.string().email({ message: "Invalid email address." }), z.literal("")]).optional(),
  county: z.string().min(1, { message: "County is required." }),
  subCounty: z.string().min(1, { message: "Sub-county is required." }),
  ward: z.string().min(1, { message: "Ward is required." }),
  postalAddress: z.string().optional(),
  postalCode: z.string().optional(),
  residentialAddress: z.string().min(5, { message: "Residential address is required." }),
})

const emergencyContactSchema = z.object({
  contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
  relationship: z.enum(relationshipTypes, { required_error: "Relationship is required." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  alternativePhone: z.string().optional(),
  email: z.union([z.string().email({ message: "Invalid email address." }), z.literal("")]).optional(),
  address: z.string().optional(),
})

const insuranceInfoSchema = z.object({
  hasInsurance: z.boolean().default(false),
  provider: z.enum(insuranceProviders).optional(),
  policyNumber: z.string().optional(),
  memberNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  primaryMember: z.string().optional(),
  relationshipToPrimary: z.enum(relationshipTypes).optional(),
  coverageType: z.enum(["Inpatient", "Outpatient", "Both", "Other"]).optional(),
  coverageLimit: z.string().optional(),
})

const consentSchema = z.object({
  consentToTreatment: z.boolean().refine((val) => val === true, {
    message: "You must consent to treatment.",
  }),
  consentToShareInfo: z.boolean().refine((val) => val === true, {
    message: "You must consent to share information.",
  }),
  consentToPhotos: z.boolean().default(false),
  signature: z.string().min(2, { message: "Signature is required." }),
})

const patientRegistrationSchema = z.object({
  personalInfo: personalInfoSchema,
  contactInfo: contactInfoSchema,
  emergencyContact: emergencyContactSchema,
  insuranceInfo: insuranceInfoSchema,
  consent: consentSchema,
})

type PatientRegistrationFormValues = z.infer<typeof patientRegistrationSchema>

function matchInsuranceCompanyId(
  provider: string | undefined,
  companies: { companyId?: number; insuranceCompanyId?: number; companyName?: string; name?: string }[]
) {
  if (!provider || provider === "Other") return null
  const norm = provider.toLowerCase()
  const hit = companies.find((c) => {
    const name = String(c.companyName || c.name || "").toLowerCase()
    return name.includes(norm) || norm.includes(name.slice(0, 4))
  })
  const id = hit?.companyId ?? hit?.insuranceCompanyId
  return id != null ? Number(id) : null
}

export function ComprehensivePatientForm() {
  const [activeTab, setActiveTab] = useState("personal")
  const [formStep, setFormStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const companies = await insuranceApi.getProviders("active")
        setInsuranceCompanies(Array.isArray(companies) ? companies : companies?.data || [])
      } catch {
        setInsuranceCompanies([])
      }
    })()
  }, [])

  const defaultValues: Partial<PatientRegistrationFormValues> = {
    personalInfo: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "male",
    },
    contactInfo: {
      county: DEFAULT_FACILITY_COUNTY,
      subCounty: "",
      ward: "",
    },
    emergencyContact: {},
    insuranceInfo: {
      hasInsurance: false,
    },
    consent: {
      consentToTreatment: false,
      consentToShareInfo: false,
      consentToPhotos: false,
      signature: "",
    },
  }

  const form = useForm<PatientRegistrationFormValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues,
    mode: "onChange",
  })

  async function onSubmit(data: PatientRegistrationFormValues) {
    setIsSubmitting(true)
    try {
      const pi = data.personalInfo
      const ci = data.contactInfo
      const ec = data.emergencyContact
      const ins = data.insuranceInfo
      const insuranceCompanyId = ins.hasInsurance
        ? matchInsuranceCompanyId(ins.provider, insuranceCompanies)
        : null

      const patientData = {
        firstName: pi.firstName,
        lastName: pi.lastName,
        middleName: pi.middleName || null,
        dateOfBirth: pi.dateOfBirth.toISOString().split("T")[0],
        gender: pi.gender,
        patientType: ins.hasInsurance && insuranceCompanyId ? "insurance" : "paying",
        phone: ci.phoneNumber,
        email: ci.email?.trim() || null,
        address: ci.residentialAddress,
        county: ci.county,
        subcounty: ci.subCounty || null,
        ward: ci.ward || null,
        idNumber: pi.idNumber,
        idType: pi.idType,
        nupi: pi.nupi?.trim() || null,
        bloodGroup: pi.bloodGroup || null,
        allergies: pi.allergies || null,
        medicalHistory: pi.chronicConditions || null,
        nextOfKinName: ec.contactName,
        nextOfKinPhone: ec.phoneNumber,
        nextOfKinRelationship: ec.relationship,
        insuranceCompanyId,
        insuranceNumber: ins.policyNumber || ins.memberNumber || null,
        consent: {
          consentToTreatment: data.consent.consentToTreatment,
          consentToShareInfo: data.consent.consentToShareInfo,
          consentToPhotos: data.consent.consentToPhotos,
          signature: data.consent.signature,
        },
      }

      const created = await patientApi.create(patientData)
      const patientId = created?.patientId ?? created?.id
      let kenhddHint = ""
      if (patientId) {
        try {
          const kenhdd = await standardsApi.validateKenhddPatient(patientId)
          kenhddHint = ` KENHDD readiness: ${kenhdd.overallScore}%.`
        } catch {
          /* ignore */
        }
      }

      toast({
        title: "Patient registered",
        description: `${created?.patientNumber || "New patient"} queued for triage.${kenhddHint}`,
      })
      form.reset(defaultValues as PatientRegistrationFormValues)
      setFormStep(0)
      setActiveTab("personal")
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Could not save patient",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextFormStep = () => {
    setFormStep((prev) => prev + 1)
    const nextTab = formStep === 0 ? "contact" : formStep === 1 ? "emergency" : formStep === 2 ? "insurance" : "consent"
    setActiveTab(nextTab)
  }

  const prevFormStep = () => {
    setFormStep((prev) => prev - 1)
    const prevTab =
      formStep === 4 ? "insurance" : formStep === 3 ? "emergency" : formStep === 2 ? "contact" : "personal"
    setActiveTab(prevTab)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Patient Registration</CardTitle>
        <CardDescription>Register a new patient in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" onClick={() => setFormStep(0)}>
              Personal
            </TabsTrigger>
            <TabsTrigger value="contact" onClick={() => setFormStep(1)}>
              Contact
            </TabsTrigger>
            <TabsTrigger value="emergency" onClick={() => setFormStep(2)}>
              Emergency
            </TabsTrigger>
            <TabsTrigger value="insurance" onClick={() => setFormStep(3)}>
              Insurance
            </TabsTrigger>
            <TabsTrigger value="consent" onClick={() => setFormStep(4)}>
              Consent
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personalInfo.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personalInfo.middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personalInfo.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personalInfo.dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <BirthDatePicker date={field.value} onSelect={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="personalInfo.gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="female" />
                            </FormControl>
                            <FormLabel className="font-normal">Female</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personalInfo.idType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ID type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {idTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
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
                    name="personalInfo.idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="personalInfo.nupi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital Health ID (NUPI)</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional — auto-resolved from ID/phone if blank" {...field} />
                      </FormControl>
                      <FormDescription>Optional. Leave blank to resolve via Client Registry sandbox on save.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personalInfo.maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marital Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select marital status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {maritalStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
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
                    name="personalInfo.occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input placeholder="Teacher" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="personalInfo.bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group (if known)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bloodGroups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="personalInfo.allergies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Known Allergies</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List any known allergies (medications, food, etc.)"
                            className="resize-none"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personalInfo.chronicConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chronic Conditions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List any chronic conditions (diabetes, hypertension, etc.)"
                            className="resize-none"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactInfo.phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactInfo.alternativePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <KenyaLocationSelect
                  value={{
                    county: form.watch("contactInfo.county") || DEFAULT_FACILITY_COUNTY,
                    subcounty: form.watch("contactInfo.subCounty") || "",
                    ward: form.watch("contactInfo.ward") || "",
                  }}
                  onChange={(loc) => {
                    form.setValue("contactInfo.county", loc.county, { shouldValidate: true })
                    form.setValue("contactInfo.subCounty", loc.subcounty, { shouldValidate: true })
                    form.setValue("contactInfo.ward", loc.ward, { shouldValidate: true })
                  }}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactInfo.postalAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Address</FormLabel>
                        <FormControl>
                          <Input placeholder="P.O. Box 12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactInfo.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="00100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactInfo.residentialAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residential Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Apartment 4B, Sunshine Apartments, Parklands Road"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="emergencyContact.contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact.relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {relationshipTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="emergencyContact.phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact.alternativePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternative Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+254 712 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="emergencyContact.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="jane.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContact.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Apartment 4B, Sunshine Apartments, Parklands Road"
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="insurance" className="space-y-4">
                <FormField
                  control={form.control}
                  name="insuranceInfo.hasInsurance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Patient has health insurance</FormLabel>
                        <FormDescription>Check this box if the patient has health insurance coverage</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("insuranceInfo.hasInsurance") && (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceInfo.provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {insuranceProviders.map((provider) => (
                                  <SelectItem key={provider} value={provider}>
                                    {provider}
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
                        name="insuranceInfo.policyNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Number</FormLabel>
                            <FormControl>
                              <Input placeholder="POL-12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceInfo.memberNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member Number</FormLabel>
                            <FormControl>
                              <Input placeholder="MEM-12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insuranceInfo.expiryDate"
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
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
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
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceInfo.primaryMember"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Member Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insuranceInfo.relationshipToPrimary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship to Primary</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {relationshipTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="insuranceInfo.coverageType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coverage Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select coverage type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Inpatient">Inpatient</SelectItem>
                                <SelectItem value="Outpatient">Outpatient</SelectItem>
                                <SelectItem value="Both">Both</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insuranceInfo.coverageLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coverage Limit</FormLabel>
                            <FormControl>
                              <Input placeholder="KSh 1,000,000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="consent" className="space-y-4">
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Consent to Treatment</h3>
                    <p className="text-sm text-muted-foreground">
                      I hereby consent to medical treatment, diagnostic procedures, and hospital care to be rendered to
                      me by Kiplombe Medical Centre as deemed necessary by the healthcare providers.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="consent.consentToTreatment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I consent to treatment</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Consent to Share Information</h3>
                    <p className="text-sm text-muted-foreground">
                      I authorize Kiplombe Medical Centre to release my medical information to other healthcare
                      providers involved in my care, my insurance company, and as required by law.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="consent.consentToShareInfo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I consent to share information</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Consent to Photography</h3>
                    <p className="text-sm text-muted-foreground">
                      I authorize Kiplombe Medical Centre to take photographs for identification, treatment, and
                      medical record purposes. These will not be used for marketing without additional consent.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="consent.consentToPhotos"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I consent to photography</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="consent.signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital Signature</FormLabel>
                      <FormControl>
                        <Input placeholder="Type your full name as signature" {...field} />
                      </FormControl>
                      <FormDescription>
                        By typing your name above, you are signing this form electronically.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={prevFormStep} disabled={formStep === 0}>
                  Previous
                </Button>
                {formStep < 4 ? (
                  <Button type="button" onClick={nextFormStep}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2">Registering...</span>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      </>
                    ) : (
                      "Register Patient"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center text-xs text-muted-foreground">
                <InfoIcon className="mr-1 h-3 w-3" />
                All information is kept confidential in accordance with hospital privacy policies
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Patient data is protected under the Data Protection Act and hospital privacy policies. Access is
                restricted to authorized personnel only.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  )
}
