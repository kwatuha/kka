import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Skeleton className="h-16 w-full mb-4" />

      <Skeleton className="h-12 w-full mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>

      <Skeleton className="h-20 w-full mt-4" />
    </div>
  )
}
