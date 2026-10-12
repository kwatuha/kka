"use client"

import { Activity, Clock, FileCheck, Heart, Star, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DoctorPerformance({ doctorId }: { doctorId: string }) {
  // Mock data - would come from API in real application
  const performanceData = {
    patientOutcomes: {
      overall: 92,
      improved: 78,
      stable: 15,
      deteriorated: 7,
      readmissionRate: 4.2,
      complicationRate: 2.1,
      mortalityRate: 0.5,
    },
    efficiency: {
      avgConsultationTime: 22, // minutes
      avgTurnAroundTime: 35, // minutes (from patient arrival to discharge)
      patientsPerDay: 12,
      utilizationRate: 87, // percentage
      noShowRate: 8, // percentage
      overtimeHours: 5, // hours per week
    },
    quality: {
      documentationCompliance: 98, // percentage
      guidelineAdherence: 95, // percentage
      patientSatisfaction: 4.8, // out of 5
      peerReviews: 4.6, // out of 5
      incidentReports: 1, // count
      complaintRate: 0.5, // percentage
    },
    professional: {
      continuingEducation: 45, // hours
      researchContributions: 3, // count
      teachingHours: 12, // hours
      committeeMemberships: 2, // count
      mentorships: 3, // count
      publicationCitations: 87, // count
    },
    trends: {
      patientVolume: [32, 35, 38, 42, 45, 48, 50, 47, 45, 48, 52, 55],
      patientSatisfaction: [4.5, 4.6, 4.7, 4.6, 4.8, 4.7, 4.8, 4.9, 4.8, 4.7, 4.8, 4.8],
      revenueGenerated: [
        350000, 380000, 420000, 450000, 470000, 500000, 520000, 510000, 530000, 550000, 580000, 600000,
      ],
      proceduresPerformed: [18, 20, 22, 25, 28, 30, 32, 30, 28, 32, 35, 38],
    },
    kpis: [
      { name: "Patient Satisfaction", value: 92, target: 90, icon: Star },
      { name: "Documentation Compliance", value: 98, target: 95, icon: FileCheck },
      { name: "Guideline Adherence", value: 95, target: 90, icon: Activity },
      { name: "Patient Outcomes", value: 92, target: 85, icon: Heart },
      { name: "Efficiency", value: 87, target: 80, icon: Clock },
      { name: "Professional Development", value: 90, target: 85, icon: TrendingUp },
    ],
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Key performance indicators and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Patient Outcomes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Overall Outcomes</div>
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.overall}%</div>
                  </div>
                  <Progress value={performanceData.patientOutcomes.overall} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Improved</div>
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.improved}%</div>
                  </div>
                  <Progress value={performanceData.patientOutcomes.improved} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Stable</div>
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.stable}%</div>
                  </div>
                  <Progress value={performanceData.patientOutcomes.stable} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Deteriorated</div>
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.deteriorated}%</div>
                  </div>
                  <Progress value={performanceData.patientOutcomes.deteriorated} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.readmissionRate}%</div>
                    <div className="text-xs text-muted-foreground">Readmission</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.complicationRate}%</div>
                    <div className="text-xs text-muted-foreground">Complications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.patientOutcomes.mortalityRate}%</div>
                    <div className="text-xs text-muted-foreground">Mortality</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{performanceData.efficiency.avgConsultationTime} min</div>
                    <div className="text-xs text-muted-foreground text-center">Avg. Consultation</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{performanceData.efficiency.patientsPerDay}</div>
                    <div className="text-xs text-muted-foreground text-center">Patients/Day</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Utilization Rate</div>
                    <div className="text-sm font-medium">{performanceData.efficiency.utilizationRate}%</div>
                  </div>
                  <Progress value={performanceData.efficiency.utilizationRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">No-Show Rate</div>
                    <div className="text-sm font-medium">{performanceData.efficiency.noShowRate}%</div>
                  </div>
                  <Progress value={performanceData.efficiency.noShowRate} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.efficiency.overtimeHours} hrs</div>
                    <div className="text-xs text-muted-foreground">Overtime/Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.efficiency.avgTurnAroundTime} min</div>
                    <div className="text-xs text-muted-foreground">Avg. Turn-Around</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quality Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Documentation Compliance</div>
                    <div className="text-sm font-medium">{performanceData.quality.documentationCompliance}%</div>
                  </div>
                  <Progress value={performanceData.quality.documentationCompliance} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium">Guideline Adherence</div>
                    <div className="text-sm font-medium">{performanceData.quality.guidelineAdherence}%</div>
                  </div>
                  <Progress value={performanceData.quality.guidelineAdherence} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Star className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{performanceData.quality.patientSatisfaction}</div>
                    <div className="text-xs text-muted-foreground text-center">Patient Satisfaction</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{performanceData.quality.peerReviews}</div>
                    <div className="text-xs text-muted-foreground text-center">Peer Reviews</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.quality.incidentReports}</div>
                    <div className="text-xs text-muted-foreground">Incidents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{performanceData.quality.complaintRate}%</div>
                    <div className="text-xs text-muted-foreground">Complaint Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Tabs defaultValue="kpis">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="kpis">Key Performance Indicators</TabsTrigger>
                <TabsTrigger value="professional">Professional Development</TabsTrigger>
                <TabsTrigger value="trends">Performance Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="kpis" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {performanceData.kpis.map((kpi, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <kpi.icon className="h-5 w-5 mr-2 text-primary" />
                            <span className="font-medium">{kpi.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">Target: {kpi.target}%</div>
                        </div>
                        <div className="text-2xl font-bold mb-1">{kpi.value}%</div>
                        <Progress value={kpi.value} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-2">
                          {kpi.value >= kpi.target ? (
                            <span className="text-green-500">Above target by {kpi.value - kpi.target}%</span>
                          ) : (
                            <span className="text-red-500">Below target by {kpi.target - kpi.value}%</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="professional" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Continuing Education</div>
                          <div>{performanceData.professional.continuingEducation} hours</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Research Contributions</div>
                          <div>{performanceData.professional.researchContributions}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Teaching Hours</div>
                          <div>{performanceData.professional.teachingHours} hours</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Committee Memberships</div>
                          <div>{performanceData.professional.committeeMemberships}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Mentorships</div>
                          <div>{performanceData.professional.mentorships}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Publication Citations</div>
                          <div>{performanceData.professional.publicationCitations}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Patient Volume (Last 12 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] flex items-end gap-2">
                        {performanceData.trends.patientVolume.map((value, index) => (
                          <div
                            key={index}
                            className="bg-primary rounded-t w-full"
                            style={{ height: `${(value / 60) * 100}%` }}
                          ></div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                        <span>Sep</span>
                        <span>Oct</span>
                        <span>Nov</span>
                        <span>Dec</span>
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Procedures Performed (Last 12 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px] flex items-end gap-2">
                        {performanceData.trends.proceduresPerformed.map((value, index) => (
                          <div
                            key={index}
                            className="bg-primary rounded-t w-full"
                            style={{ height: `${(value / 40) * 100}%` }}
                          ></div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                        <span>Sep</span>
                        <span>Oct</span>
                        <span>Nov</span>
                        <span>Dec</span>
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
