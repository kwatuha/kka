import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { AddInventoryItemForm } from "@/components/add-inventory-item-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewInventoryItemPage() {
  return (
    <div className="p-4 space-y-4">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Inventory", href: "/inventory" },
          { label: "Add New Item", href: "/inventory/new", active: true },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Add New Inventory Item</CardTitle>
          <CardDescription>Enter the details of the new inventory item to add it to the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddInventoryItemForm />
        </CardContent>
      </Card>
    </div>
  )
}
