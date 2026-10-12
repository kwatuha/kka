"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface WardData {
  id: string
  name: string
  totalBeds: number
  occupiedBeds: number
  availableBeds: number
  occupancyRate: number
}

const wards: WardData[] = [
  {
    id: "W1",
    name: "General Ward",
    totalBeds: 20,
    occupiedBeds: 16,
    availableBeds: 4,
    occupancyRate: 80,
  },
  {
    id: "W2",
    name: "Pediatric Ward",
    totalBeds: 15,
    occupiedBeds: 10,
    availableBeds: 5,
    occupancyRate: 67,
  },
  {
    id: "W3",
    name: "Maternity Ward",
    totalBeds: 12,
    occupiedBeds: 11,
    availableBeds: 1,
    occupancyRate: 92,
  },
  {
    id: "W4",
    name: "Surgical Ward",
    totalBeds: 18,
    occupiedBeds: 15,
    availableBeds: 3,
    occupancyRate: 83,
  },
  {
    id: "W5",
    name: "ICU",
    totalBeds: 8,
    occupiedBeds: 6,
    availableBeds: 2,
    occupancyRate: 75,
  },
]

export function WardOccupancy() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ward Occupancy</CardTitle>
        <CardDescription>Current bed availability across hospital wards</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {wards.map((ward) => (
            <div key={ward.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ward.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {ward.occupiedBeds} of {ward.totalBeds} beds occupied
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={ward.availableBeds > 0 ? "outline" : "destructive"}
                    className={ward.availableBeds > 0 ? "bg-green-50 text-green-800" : ""}
                  >
                    {ward.availableBeds} Available
                  </Badge>
                </div>
              </div>
              <Progress value={ward.occupancyRate} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
