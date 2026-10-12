import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { StockAdjustmentForm } from "@/components/stock-adjustment-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function StockAdjustmentPage() {
  return (
    <div className="p-4 space-y-4">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Inventory", href: "/inventory" },
          { label: "Stock Adjustment", href: "/inventory/adjust", active: true },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
          <CardDescription>
            Add or subtract stock from inventory items. Use this form to record stock movements, corrections, damages,
            or other inventory adjustments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockAdjustmentForm />
        </CardContent>
      </Card>
    </div>
  )
}
