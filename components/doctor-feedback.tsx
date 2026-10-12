"use client"

import { useState } from "react"
import { Star } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function DoctorFeedback({ doctorId }: { doctorId: string }) {
  const [timeframe, setTimeframe] = useState("month")

  // Mock data - in a real app, this would come from an API
  const feedbackData = {
    summary: {
      averageRating: 4.8,
      totalReviews: 142,
      ratingDistribution: {
        5: 112,
        4: 24,
        3: 4,
        2: 1,
        1: 1,
      },
      categories: {
        "Bedside Manner": 4.9,
        "Wait Time": 4.5,
        Explanation: 4.8,
        Listening: 4.9,
        Knowledge: 4.9,
        "Follow-up": 4.7,
      },
    },
    recentFeedback: [
      {
        id: 1,
        patientName: "Sarah Kimani",
        patientId: "P-2045",
        rating: 5,
        comment:
          "Dr. Ndiwa was incredibly thorough and took the time to explain my condition in detail. I felt heard and cared for during my visit.",
        date: "2023-04-15",
        categories: ["Bedside Manner", "Explanation", "Listening"],
      },
      {
        id: 2,
        patientName: "Michael Otieno",
        patientId: "P-1892",
        rating: 5,
        comment:
          "Very knowledgeable doctor who answered all my questions patiently. The treatment plan has been working well for me.",
        date: "2023-04-10",
        categories: ["Knowledge", "Explanation"],
      },
      {
        id: 3,
        patientName: "Emily Wangari",
        patientId: "P-2103",
        rating: 4,
        comment:
          "Great doctor, but had to wait a bit longer than expected for my appointment. The care itself was excellent.",
        date: "2023-04-05",
        categories: ["Knowledge", "Wait Time"],
      },
      {
        id: 4,
        patientName: "David Mwangi",
        patientId: "P-1756",
        rating: 5,
        comment: "Dr. Ndiwa followed up with me personally after my procedure. Very impressed with the level of care.",
        date: "2023-03-28",
        categories: ["Follow-up", "Bedside Manner"],
      },
      {
        id: 5,
        patientName: "Sophia Auma",
        patientId: "P-1967",
        rating: 5,
        comment:
          "Excellent doctor who really listens. I've been seeing Dr. Ndiwa for years and always receive top-notch care.",
        date: "2023-03-22",
        categories: ["Listening", "Knowledge"],
      },
    ],
  }

  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
      ))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Feedback</CardTitle>
          <CardDescription>Reviews and ratings from patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Overall Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-bold">{feedbackData.summary.averageRating}</div>
                  <div className="flex mt-2">{renderStars(Math.round(feedbackData.summary.averageRating))}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Based on {feedbackData.summary.totalReviews} reviews
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(feedbackData.summary.ratingDistribution)
                    .reverse()
                    .map(([rating, count]) => (
                      <div key={rating} className="flex items-center gap-2">
                        <div className="w-8 text-sm font-medium">{rating} ★</div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${(count / feedbackData.summary.totalReviews) * 100}%` }}
                          ></div>
                        </div>
                        <div className="w-8 text-sm text-right">{count}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Category Ratings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(feedbackData.summary.categories).map(([category, rating]) => (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium">{category}</div>
                      <div className="flex">{renderStars(Math.round(rating))}</div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(rating / 5) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Feedback Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="month" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="month" onClick={() => setTimeframe("month")}>
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="quarter" onClick={() => setTimeframe("quarter")}>
                      Quarter
                    </TabsTrigger>
                    <TabsTrigger value="year" onClick={() => setTimeframe("year")}>
                      Year
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="month" className="space-y-4 mt-4">
                    <div className="h-[200px] flex items-end gap-2">
                      {/* This would be a chart in a real application */}
                      <div className="bg-primary rounded-t w-full" style={{ height: "80%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "90%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "85%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "95%" }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Average rating trend over the past month
                    </div>
                  </TabsContent>
                  <TabsContent value="quarter" className="space-y-4 mt-4">
                    <div className="h-[200px] flex items-end gap-2">
                      {/* This would be a chart in a real application */}
                      <div className="bg-primary rounded-t w-full" style={{ height: "85%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "90%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "92%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "96%" }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Average rating trend over the past quarter
                    </div>
                  </TabsContent>
                  <TabsContent value="year" className="space-y-4 mt-4">
                    <div className="h-[200px] flex items-end gap-2">
                      {/* This would be a chart in a real application */}
                      <div className="bg-primary rounded-t w-full" style={{ height: "82%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "85%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "88%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "90%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "92%" }}></div>
                      <div className="bg-primary rounded-t w-full" style={{ height: "95%" }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      Average rating trend over the past year
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Patient Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {feedbackData.recentFeedback.map((feedback) => (
                    <div key={feedback.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {feedback.patientName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{feedback.patientName}</div>
                            <div className="text-sm text-muted-foreground">Patient ID: {feedback.patientId}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex">{renderStars(feedback.rating)}</div>
                          <div className="text-sm text-muted-foreground">{feedback.date}</div>
                        </div>
                      </div>
                      <div className="mt-3">{feedback.comment}</div>
                      <div className="flex gap-2 mt-3">
                        {feedback.categories.map((category) => (
                          <Badge key={category} variant="outline">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
