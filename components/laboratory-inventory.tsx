"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, ShoppingCart } from "lucide-react"

export function LaboratoryInventory() {
  // Mock data for laboratory inventory
  const inventoryItems = [
    {
      name: "Blood Collection Tubes (EDTA)",
      currentStock: 120,
      minStock: 50,
      maxStock: 200,
      status: "Adequate",
      expiryDate: "2024-05-15",
    },
    {
      name: "Glucose Test Strips",
      currentStock: 35,
      minStock: 50,
      maxStock: 300,
      status: "Low",
      expiryDate: "2024-06-20",
    },
    {
      name: "Urine Sample Containers",
      currentStock: 85,
      minStock: 40,
      maxStock: 150,
      status: "Adequate",
      expiryDate: "2025-01-10",
    },
    {
      name: "Rapid Strep Test Kits",
      currentStock: 12,
      minStock: 20,
      maxStock: 100,
      status: "Critical",
      expiryDate: "2023-12-30",
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Inventory Status</CardTitle>
          <CardDescription>Laboratory supplies and reagents</CardDescription>
        </div>
        <Button size="sm" className="h-8">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Order Supplies
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {inventoryItems.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">Expires: {item.expiryDate}</div>
                </div>
                <Badge
                  variant={item.status === "Adequate" ? "outline" : item.status === "Low" ? "secondary" : "destructive"}
                  className={
                    item.status === "Adequate"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : item.status === "Low"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {item.status === "Critical" && <AlertCircle className="mr-1 h-3 w-3" />}
                  {item.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.currentStock} units</span>
                <Progress
                  value={(item.currentStock / item.maxStock) * 100}
                  className={
                    item.status === "Adequate" ? "bg-green-100" : item.status === "Low" ? "bg-yellow-100" : "bg-red-100"
                  }
                />
                <span>{item.maxStock} max</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
