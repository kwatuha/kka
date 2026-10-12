import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"

export default function ProcurementOrderDetailLoading() {
  return (
    <div className="space-y-4">
      <BreadcrumbsEnhanced />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Purchase order information and line items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Header Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <div className="mt-4">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-5 w-48" />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <Skeleton className="h-7 w-32 mb-3" />
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-5 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-full max-w-[200px]" />
                          </TableCell>
                          <TableCell className="text-center">
                            <Skeleton className="h-5 w-8 mx-auto" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-5 w-24 ml-auto" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-5 w-24 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end mt-4">
                <div className="w-[250px] space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Track the current status of this order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
