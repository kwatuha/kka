"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { inventoryApi } from "@/lib/api"
import { Loader2, Package, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#6B66FF"]

export function InventoryAnalytics() {
  const [timeRange, setTimeRange] = useState("6months")
  const [loading, setLoading] = useState(true)
  const [stockValueByCategory, setStockValueByCategory] = useState<any[]>([])
  const [stockMovementData, setStockMovementData] = useState<any[]>([])
  const [topMovingItems, setTopMovingItems] = useState<any[]>([])
  const [expiryData, setExpiryData] = useState<any[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const data = await inventoryApi.getAnalytics(timeRange)
        
        // Convert string values to numbers for charts
        setStockValueByCategory(
          (data.stockValueByCategory || []).map((item: any) => ({
            name: item.name,
            value: parseFloat(item.value) || 0
          }))
        )
        setStockMovementData(
          (data.stockMovementData || []).map((item: any) => ({
            name: item.name,
            stockIn: parseFloat(item.stockIn) || 0,
            stockOut: parseFloat(item.stockOut) || 0
          }))
        )
        setTopMovingItems(
          (data.topMovingItems || []).map((item: any) => ({
            name: item.name,
            value: parseFloat(item.value) || 0
          }))
        )
        setExpiryData(
          (data.expiryData || []).map((item: any) => ({
            name: item.name,
            value: parseInt(item.value) || 0
          }))
        )
        setCategoryBreakdown(data.categoryBreakdown || [])
      } catch (error) {
        console.error("Error fetching analytics:", error)
        // Set empty arrays on error
        setStockValueByCategory([])
        setStockMovementData([])
        setTopMovingItems([])
        setExpiryData([])
        setCategoryBreakdown([])
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Inventory Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="movement">Stock Movement</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Analysis</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stock Value by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {stockValueByCategory.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockValueByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`KES ${parseFloat(value.toString()).toLocaleString()}`, "Value"]} />
                        <Bar dataKey="value" fill="#0088FE" name="Value (KES)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Moving Items</CardTitle>
              </CardHeader>
              <CardContent>
                {topMovingItems.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topMovingItems}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {topMovingItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} units`, "Quantity"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No movement data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movement">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Analysis</CardTitle>
              <CardDescription>Comparison of stock in vs stock out over time</CardDescription>
            </CardHeader>
            <CardContent>
              {stockMovementData.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockMovementData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="stockIn" fill="#82ca9d" name="Stock In" />
                      <Bar dataKey="stockOut" fill="#ff7c7c" name="Stock Out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No movement data available for the selected time range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Analysis</CardTitle>
              <CardDescription>Number of items expiring in different time periods</CardDescription>
            </CardHeader>
            <CardContent>
              {expiryData.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={expiryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#ff7300" name="Number of Items" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No expiry data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>Detailed breakdown of inventory by categories</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {categoryBreakdown.map((category: any, index: number) => (
                    <AccordionItem key={index} value={`category-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{category.category}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{category.totalItems} items</span>
                            <span>Qty: {category.totalQuantity.toLocaleString()}</span>
                            <span className="font-medium text-foreground">
                              KES {category.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item Code</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Stock Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {category.items.map((item: any) => (
                                <TableRow key={item.itemId}>
                                  <TableCell className="font-mono text-xs">{item.itemCode}</TableCell>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span>{item.quantity.toLocaleString()}</span>
                                      {item.unit && (
                                        <span className="text-xs text-muted-foreground">({item.unit})</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {item.unitPrice > 0 ? (
                                      `KES ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    KES {item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {item.location || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {item.stockStatus === 'Low Stock' ? (
                                      <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Low Stock
                                      </Badge>
                                    ) : item.stockStatus === 'Warning' ? (
                                      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700">
                                        <AlertTriangle className="h-3 w-3" />
                                        Warning
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                                        <CheckCircle2 className="h-3 w-3" />
                                        In Stock
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">No category data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
