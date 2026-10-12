"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Share2, FileText, Stethoscope } from "lucide-react"

export function DoctorCollaborations({ doctorId }: { doctorId: string }) {
  // Mock data - in a real app, this would come from an API
  const collaborationData = {
    summary: {
      totalCollaborations: 87,
      activeCases: 12,
      departments: [
        { name: "Cardiology", count: 24 },
        { name: "Neurology", count: 18 },
        { name: "Oncology", count: 15 },
        { name: "Pediatrics", count: 12 },
        { name: "Surgery", count: 10 },
        { name: "Other", count: 8 },
      ],
      collaborationTypes: {
        Consultations: 42,
        "Joint Cases": 23,
        Research: 12,
        Teaching: 10,
      },
    },
    recentCollaborations: [
      {
        id: 1,
        type: "Consultation",
        patientId: "P-2045",
        collaborators: [
          { id: "D-1002", name: "Dr. Jane Wangari", specialty: "Cardiology", avatar: "" },
          { id: "D-1005", name: "Dr. Robert Kipchoge", specialty: "Radiology", avatar: "" },
        ],
        date: "2023-04-15",
        status: "Active",
        notes: "Collaborative approach for complex cardiac case with abnormal imaging findings.",
      },
      {
        id: 2,
        type: "Joint Case",
        patientId: "P-1892",
        collaborators: [{ id: "D-1008", name: "Dr. Maria Akinyi", specialty: "Neurology", avatar: "" }],
        date: "2023-04-10",
        status: "Completed",
        notes: "Successful joint management of patient with neurological complications.",
      },
      {
        id: 3,
        type: "Research",
        patientId: null,
        collaborators: [
          { id: "D-1012", name: "Dr. James Odhiambo", specialty: "Oncology", avatar: "" },
          { id: "D-1015", name: "Dr. Sarah Njeri", specialty: "Hematology", avatar: "" },
        ],
        date: "2023-04-05",
        status: "Ongoing",
        notes: "Collaborative research on novel treatment approaches for leukemia.",
      },
      {
        id: 4,
        type: "Teaching",
        patientId: null,
        collaborators: [
          { id: "D-1020", name: "Dr. Michael Kamau", specialty: "Surgery", avatar: "" },
          { id: "D-1025", name: "Dr. Emily Wambui", specialty: "Anesthesiology", avatar: "" },
        ],
        date: "2023-03-28",
        status: "Completed",
        notes: "Joint teaching session on advanced surgical techniques for residents.",
      },
    ],
    networkStats: {
      directCollaborators: 32,
      extendedNetwork: 145,
      crossDepartmental: 18,
      externalInstitutions: 5,
    },
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Collaborations & Network</CardTitle>
          <CardDescription>Professional collaborations and medical network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Collaboration Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.summary.totalCollaborations}</div>
                    <div className="text-xs text-muted-foreground text-center">Total Collaborations</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Stethoscope className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.summary.activeCases}</div>
                    <div className="text-xs text-muted-foreground text-center">Active Cases</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Collaboration Types</div>
                  <div className="space-y-2">
                    {Object.entries(collaborationData.summary.collaborationTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <div className="text-sm">{type}</div>
                        <div className="text-sm font-medium">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {collaborationData.summary.departments.map((dept) => (
                    <div key={dept.name} className="flex justify-between items-center">
                      <div className="text-sm">{dept.name}</div>
                      <div className="text-sm font-medium">{dept.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Network Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <UserPlus className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.networkStats.directCollaborators}</div>
                    <div className="text-xs text-muted-foreground text-center">Direct Collaborators</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Share2 className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.networkStats.extendedNetwork}</div>
                    <div className="text-xs text-muted-foreground text-center">Extended Network</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <Users className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.networkStats.crossDepartmental}</div>
                    <div className="text-xs text-muted-foreground text-center">Cross-Departmental</div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 mb-1 text-primary" />
                    <div className="text-xl font-bold">{collaborationData.networkStats.externalInstitutions}</div>
                    <div className="text-xs text-muted-foreground text-center">External Institutions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Collaborations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {collaborationData.recentCollaborations.map((collab) => (
                    <div key={collab.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={collab.status === "Active" ? "default" : "outline"}>{collab.type}</Badge>
                            {collab.status === "Active" && <Badge variant="secondary">Active</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {collab.date} {collab.patientId && `• Patient: ${collab.patientId}`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">{collab.notes}</div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {collab.collaborators.map((collaborator) => (
                          <div key={collaborator.id} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {collaborator.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{collaborator.name}</div>
                              <div className="text-xs text-muted-foreground">{collaborator.specialty}</div>
                            </div>
                          </div>
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
