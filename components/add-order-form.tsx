"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Save, FileText } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

export function AddOrderForm() {
  const router = useRouter()

  // Mock vendors data
  const vendors = [
    { id: "V-001", name: "Medequip Supplies Ltd" },
    { id: "V-002", name: "Laboratory Supplies Co." },
    { id: "V-003", name: "Pharma Distributors Kenya" },
    { id: "V-004", name: "Cleaning Solutions Ltd" },
    { id: "V-005", name: "Surgical Instruments Kenya" },
    { id: "V-006", name: "Medical Furniture Nairobi" },
    { id: "V-007", name: "Medical Imaging Solutions" },
    { id: "V-008", name: "IT Hardware Suppliers" },
    { id: "V-009", name: "Stationery Supplies Kenya" },
    { id: "V-010", name: "Office Supplies Nairobi" },
  ]

  // Mock product catalog
  const productCatalog = [
    { id: "P-001", name: "Surgical Gloves (Box of 100)", category: "Disposables", unit: "Box", price: 1200 },
    { id: "P-002", name: "Examination Table", category: "Furniture", unit: "Unit", price: 85000 },
    { id: "P-003", name: "Blood Pressure Monitor", category: "Equipment", unit: "Unit", price: 12500 },
    { id: "P-004", name: "Surgical Masks (Box of 50)", category: "Disposables", unit: "Box", price: 800 },
    { id: "P-005", name: "Paracetamol 500mg", category: "Medication", unit: "Pack", price: 350 },
    { id: "P-006", name: "Bandages (Pack of 20)", category: "First Aid", unit: "Pack", price: 450 },
    { id: "P-007", name: "Stethoscope", category: "Equipment", unit: "Unit", price: 7500 },
    { id: "P-008", name: "Disinfectant (5L)", category: "Cleaning", unit: "Bottle", price: 1800 },
    { id: "P-009", name: "Syringes (Box of 100)", category: "Disposables", unit: "Box", price: 1500 },
    { id: "P-010", name: "Patient Monitor", category: "Equipment", unit: "Unit", price: 175000 },
  ]

  // State for form
  const [orderItems, setOrderItems] = useState([
    { id: 1, productId: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ])

  const [selectedVendor, setSelectedVendor] = useState("")
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date())
  const [requiredDate, setRequiredDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("draft")

  // Calculate total order amount
  const totalOrderAmount = orderItems.reduce((sum, item) => sum + item.total, 0)

  // Handle product selection
  const handleProductSelect = (productId: string, index: number) => {
    const product = productCatalog.find((p) => p.id === productId)
    if (product) {
      const updatedItems = [...orderItems]
      updatedItems[index] = {
        ...updatedItems[index],
        productId,
        description: product.name,
        unitPrice: product.price,
        total: product.price * updatedItems[index].quantity,
      }
      setOrderItems(updatedItems)
    }
  }

  // Handle quantity change
  const handleQuantityChange = (quantity: number, index: number) => {
    const updatedItems = [...orderItems]
    updatedItems[index] = {
      ...updatedItems[index],
      quantity,
      total: updatedItems[index].unitPrice * quantity,
    }
    setOrderItems(updatedItems)
  }

  // Add new item row
  const addItemRow = () => {
    setOrderItems([
      ...orderItems,
      { id: orderItems.length + 1, productId: "", description: "", quantity: 1, unitPrice: 0, total: 0 },
    ])
  }

  // Remove item row
  const removeItemRow = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index))
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Here you would normally send the data to your API
    console.log({
      vendor: selectedVendor,
      orderDate,
      requiredDate,
      items: orderItems,
      totalAmount: totalOrderAmount,
      notes,
      status,
    })

    // Redirect back to orders list
    router.push("/procurement/orders")
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>New Purchase Order</CardTitle>
          <CardDescription>Create a new purchase order for supplies, equipment, or services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger id="vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Order Date</Label>
                <DatePicker selected={orderDate} onSelect={setOrderDate} />
              </div>

              <div className="space-y-2">
                <Label>Required By</Label>
                <DatePicker selected={requiredDate} onSelect={setRequiredDate} />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Order Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[150px]">Unit Price</TableHead>
                    <TableHead className="w-[150px] text-right">Total</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select value={item.productId} onValueChange={(value) => handleProductSelect(value, index)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {productCatalog.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const updatedItems = [...orderItems]
                            updatedItems[index].description = e.target.value
                            setOrderItems(updatedItems)
                          }}
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(Number.parseInt(e.target.value) || 1, index)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const price = Number.parseFloat(e.target.value) || 0
                            const updatedItems = [...orderItems]
                            updatedItems[index].unitPrice = price
                            updatedItems[index].total = price * item.quantity
                            setOrderItems(updatedItems)
                          }}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemRow(index)}
                          disabled={orderItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-[300px] space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totalOrderAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (16%):</span>
                  <span>{formatCurrency(totalOrderAmount * 0.16)}</span>
                </div>
                <div className="flex justify-between font-medium text-base">
                  <span>Total:</span>
                  <span>{formatCurrency(totalOrderAmount * 1.16)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/procurement/orders")}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatus("draft")
                handleSubmit(new Event("submit") as any)
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button type="submit">
              <FileText className="mr-2 h-4 w-4" />
              Submit Order
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
