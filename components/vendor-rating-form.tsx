"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { vendorApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Star } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"

const vendorRatingSchema = z.object({
  qualityRating: z.number().min(1).max(5),
  deliveryRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  pricingRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  recommendationLevel: z.string(),
  feedback: z.string().min(10, {
    message: "Feedback must be at least 10 characters.",
  }),
})

type VendorRatingValues = z.infer<typeof vendorRatingSchema>

const defaultValues: Partial<VendorRatingValues> = {
  qualityRating: 3,
  deliveryRating: 3,
  serviceRating: 3,
  pricingRating: 3,
  communicationRating: 3,
  recommendationLevel: "likely",
  feedback: "",
}

interface VendorRatingFormProps {
  vendorId: string
  vendorName: string
  onSuccess?: () => void
}

export function VendorRatingForm({ vendorId, vendorName, onSuccess }: VendorRatingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<VendorRatingValues>({
    resolver: zodResolver(vendorRatingSchema),
    defaultValues,
  })

  async function onSubmit(data: VendorRatingValues) {
    setIsSubmitting(true)

    try {
      // Map form data to API format
      const ratingData = {
        qualityRating: data.qualityRating,
        deliveryRating: data.deliveryRating,
        serviceRating: data.serviceRating,
        pricingRating: data.pricingRating,
        communicationRating: data.communicationRating,
        recommendationLevel: data.recommendationLevel,
        feedback: data.feedback,
        // TODO: Get actual user ID from auth context
        ratedBy: null, // Will be set from session/auth in production
      }

      await vendorApi.createRating(vendorId, ratingData)

      toast({
        title: "Vendor rating submitted",
        description: `Your rating for ${vendorName} has been recorded successfully.`,
      })

      form.reset(defaultValues)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="qualityRating"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Product/Service Quality</FormLabel>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 cursor-pointer ${
                          rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                        }`}
                        onClick={() => field.onChange(rating)}
                      />
                    ))}
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>Rate the quality of products or services provided</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryRating"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Delivery & Timeliness</FormLabel>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 cursor-pointer ${
                          rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                        }`}
                        onClick={() => field.onChange(rating)}
                      />
                    ))}
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>Rate the vendor's ability to deliver on time</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceRating"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Customer Service</FormLabel>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 cursor-pointer ${
                          rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                        }`}
                        onClick={() => field.onChange(rating)}
                      />
                    ))}
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>Rate the vendor's customer service and support</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricingRating"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Pricing & Value</FormLabel>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 cursor-pointer ${
                          rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                        }`}
                        onClick={() => field.onChange(rating)}
                      />
                    ))}
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>Rate the pricing and overall value for money</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="communicationRating"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                  <FormLabel>Communication</FormLabel>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 cursor-pointer ${
                          rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                        }`}
                        onClick={() => field.onChange(rating)}
                      />
                    ))}
                  </div>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormDescription>Rate the vendor's communication and responsiveness</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="recommendationLevel"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>How likely are you to recommend this vendor?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="very-likely" />
                    </FormControl>
                    <FormLabel className="font-normal">Very likely</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="likely" />
                    </FormControl>
                    <FormLabel className="font-normal">Likely</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="neutral" />
                    </FormControl>
                    <FormLabel className="font-normal">Neutral</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="unlikely" />
                    </FormControl>
                    <FormLabel className="font-normal">Unlikely</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="very-unlikely" />
                    </FormControl>
                    <FormLabel className="font-normal">Very unlikely</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Feedback</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide any additional feedback about this vendor"
                  className="resize-none min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>Share your experience working with this vendor</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
