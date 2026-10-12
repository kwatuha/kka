"use client"

import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ClipboardList, Package, Pill, Search, ShoppingCart } from "lucide-react"

export default function PharmacyDepartmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbsEnhanced
        breadcrumbs={[
          { title: "Home", href: "/" },
          { title: "Departments", href: "/departments" },
          { title: "Pharmacy", href: "/departments/pharmacy", current: true },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pharmacy Department</h1>
        <p className="text-muted-foreground">Manage medication dispensing and inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions Today</CardTitle>
            <CardDescription>Total processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waiting Patients</CardTitle>
            <CardDescription>In pharmacy queue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Average wait: 12 min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <CardDescription>Need reordering</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">3 critical items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <CardDescription>From dispensed medications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh 45,320</div>
            <p className="text-xs text-muted-foreground">+8.2% from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common pharmacy tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <Pill className="h-5 w-5" />
              <span className="text-xs text-center">Dispense Medication</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <Search className="h-5 w-5" />
              <span className="text-xs text-center">Search Inventory</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <Package className="h-5 w-5" />
              <span className="text-xs text-center">Receive Stock</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs text-center">Create Order</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-auto py-4 px-2 justify-center items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs text-center">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Management</CardTitle>
          <CardDescription>Manage prescriptions and medication inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="queue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="queue">Prescription Queue</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="dispensed">Recently Dispensed</TabsTrigger>
            </TabsList>
            <TabsContent value="queue" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
            <TabsContent value="inventory" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
            <TabsContent value="dispensed" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                This feature is coming soon. Check back later!
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
