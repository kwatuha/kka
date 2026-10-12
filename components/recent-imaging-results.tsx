"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileImage, Share2, Eye, Download, Clock } from "lucide-react"

export function RecentImagingResults() {
  // In a real application, this data would come from an API
  const recentResults = [
    {
      id: "RES-2023-001",
      patientName: "John Kamau",
      patientId: "P-20230415-001",
      type: "X-Ray",
      bodyPart: "Chest",
      completedAt: "Today, 10:15 AM",
      radiologist: "Dr. Mercy Wanjiru",
      findings: "Normal chest radiograph. No acute cardiopulmonary process.",
      hasAbnormality: false,
      imageUrl: "/medical-chest-xray.png",
    },
    {
      id: "RES-2023-002",
      patientName: "Fatima Hassan",
      patientId: "P-20230416-003",
      type: "CT Scan",
      bodyPart: "Head",
      completedAt: "Today, 9:30 AM",
      radiologist: "Dr. James Odhiambo",
      findings: "No acute intracranial hemorrhage, mass effect, or midline shift.",
      hasAbnormality: false,
      imageUrl: "/axial-head-ct.png",
    },
    {
      id: "RES-2023-003",
      patientName: "Lucy Wambui",
      patientId: "P-20230417-002",
      type: "Ultrasound",
      bodyPart: "Abdomen",
      completedAt: "Yesterday, 4:45 PM",
      radiologist: "Dr. Mercy Wanjiru",
      findings: "Gallstones present. No evidence of cholecystitis. Liver, pancreas, and kidneys appear normal.",
      hasAbnormality: true,
      imageUrl: "/abdominal-scan-close-up.png",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Imaging Results</CardTitle>
        <CardDescription>Latest completed imaging studies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentResults.map((result) => (
            <div key={result.id} className="flex space-x-4 rounded-lg border p-3">
              <div className="flex-shrink-0">
                <img
                  src={result.imageUrl || "/placeholder.svg"}
                  alt={`${result.type} of ${result.bodyPart}`}
                  className="h-20 w-20 rounded-md object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{result.patientName}</div>
                  <Badge
                    className={
                      result.hasAbnormality
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }
                  >
                    {result.hasAbnormality ? "Abnormal" : "Normal"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <FileImage className="h-3 w-3" />
                  <span>
                    {result.type} - {result.bodyPart}
                  </span>
                </div>
                <p className="text-xs line-clamp-2">{result.findings}</p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {result.completedAt}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="h-3 w-3" />
                      <span className="sr-only">View</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Share2 className="h-3 w-3" />
                      <span className="sr-only">Share</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3 w-3" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full">
            View All Results
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
