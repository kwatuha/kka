import { VendorOnboardingForm } from "@/components/vendor-onboarding-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VendorOnboardingPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/procurement/vendors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vendors
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Onboarding</h1>
        <p className="text-muted-foreground">
          Complete the form below to register as a vendor with Kiplombe Medical Centre
        </p>
      </div>

      <VendorOnboardingForm />
    </div>
  )
}
