import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function RegionalDashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-8 w-[250px] mb-1" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-[180px] mb-1" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent className="p-0">
            <Skeleton className="h-[500px] w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[180px] mb-1" />
            <Skeleton className="h-4 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <div className="space-y-2">
                <div className="space-y-2">
                  <Skeleton className="h-[100px] w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-[80px] w-full" />
                    <Skeleton className="h-[80px] w-full" />
                  </div>
                  <Skeleton className="h-[60px] w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-[80px] w-full" />
                    <Skeleton className="h-[80px] w-full" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[220px] mb-1" />
            <Skeleton className="h-4 w-[280px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-[250px] w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[150px] mb-1" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-[50px] w-full" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
