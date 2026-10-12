import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { InventoryAnalytics } from "@/components/inventory-analytics"

export default function InventoryAnalyticsPage() {
  return (
    <div className="p-4 space-y-4">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Inventory", href: "/inventory" },
          { label: "Analytics", href: "/inventory/analytics', active: true  href: '/inventory" },
          { label: "Analytics", href: "/inventory/analytics", active: true },
        ]}
      />

      <InventoryAnalytics />
    </div>
  )
}
