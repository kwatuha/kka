import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BreadcrumbsEnhanced } from "@/components/breadcrumbs-enhanced"

export default function NewProcurementOrderLoading() {
  return (
    <div className="space-y-4">
      <BreadcrumbsEnhanced />

      <Card>
        <CardHeader>
          <CardTitle>New Purchase Order</CardTitle>
          <CardDescription>Create a new purchase order for supplies, equipment, or services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />

              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />

              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-28" />
            </div>

            <div className="rounded-md border">
              <div className="p-4">
                <div className="grid grid-cols-6 gap-4 mb-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full col-span-2" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>

                {Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="grid grid-cols-6 gap-4 mb-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full col-span-2" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-[300px] space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
