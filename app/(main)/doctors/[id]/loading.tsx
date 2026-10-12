import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DoctorProfileLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Doctor Profile Card Skeleton */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            <div className="text-center space-y-2 mt-2">
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <div className="flex justify-center items-center gap-1 mt-1">
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
            </div>

            <div className="pt-2">
              <Skeleton className="h-5 w-40 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start">
                      <Skeleton className="h-3 w-3 mr-2 mt-1" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-2">
              <Skeleton className="h-5 w-40 mb-2" />
              <div className="flex flex-wrap gap-1">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-6 w-20" />
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics Skeleton */}
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Skeleton className="h-5 w-5 mb-1" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
            </div>

            <div className="space-y-4">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Skeleton className="h-5 w-5 mb-1" />
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-5 w-5 mt-1" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32 mt-1" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-5 w-5 mt-1" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-32 mt-1" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
