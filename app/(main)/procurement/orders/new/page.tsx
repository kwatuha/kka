import { AddOrderForm } from "@/components/add-order-form"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"

export default function NewProcurementOrderPage() {
  return (
    <div className="space-y-4">
      <BreadcrumbsEnhanced />
      <AddOrderForm />
    </div>
  )
}
