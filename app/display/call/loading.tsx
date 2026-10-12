import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PatientCallDisplayLoading() {
  return (
    <div className="container mx-auto py-6">
      <Skeleton className="h-10 w-64 mx-auto mb-6" />

      <Tabs defaultValue="loading" className="w-full">
        <TabsList className="w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TabsTrigger key={i} value={`loading${i}`} className="flex-1">
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="loading" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="py-6 space-y-4">
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
