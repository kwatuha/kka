"use client"

import { Award, BookOpen, Calendar, FileCheck, GraduationCap, MapPin } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DoctorQualifications({ doctorId }: { doctorId: string }) {
  // Mock data - in a real app, this would come from an API
  const qualificationsData = {
    education: [
      {
        id: 1,
        degree: "Doctor of Medicine (MD)",
        institution: "University of Nairobi Medical School",
        location: "Nairobi, Kenya",
        year: "2010",
        honors: "Magna Cum Laude",
      },
      {
        id: 2,
        degree: "Residency in Internal Medicine",
        institution: "Kenyatta National Hospital",
        location: "Nairobi, Kenya",
        year: "2013",
        honors: null,
      },
      {
        id: 3,
        degree: "Fellowship in Cardiology",
        institution: "Aga Khan University Hospital",
        location: "Nairobi, Kenya",
        year: "2016",
        honors: null,
      },
      {
        id: 4,
        degree: "Bachelor of Science in Biochemistry",
        institution: "University of Nairobi",
        location: "Nairobi, Kenya",
        year: "2006",
        honors: "Summa Cum Laude",
      },
    ],
    certifications: [
      {
        id: 1,
        name: "Board Certification in Internal Medicine",
        issuingBody: "Kenya Medical Practitioners and Dentists Council",
        issueDate: "2013",
        expiryDate: "2023",
        status: "Active",
      },
      {
        id: 2,
        name: "Board Certification in Cardiovascular Disease",
        issuingBody: "Kenya Medical Practitioners and Dentists Council",
        issueDate: "2016",
        expiryDate: "2026",
        status: "Active",
      },
      {
        id: 3,
        name: "Advanced Cardiac Life Support (ACLS)",
        issuingBody: "Kenya Cardiac Society",
        issueDate: "2022",
        expiryDate: "2024",
        status: "Active",
      },
      {
        id: 4,
        name: "Basic Life Support (BLS)",
        issuingBody: "Kenya Red Cross Society",
        issueDate: "2022",
        expiryDate: "2024",
        status: "Active",
      },
    ],
    licenses: [
      {
        id: 1,
        type: "Medical License",
        state: "Kenya",
        licenseNumber: "MD-123456",
        issueDate: "2016",
        expiryDate: "2024",
        status: "Active",
      },
      {
        id: 2,
        type: "DEA Registration",
        state: "Kenya",
        licenseNumber: "XY1234567",
        issueDate: "2016",
        expiryDate: "2025",
        status: "Active",
      },
    ],
    specialties: ["Cardiology", "Interventional Cardiology", "Echocardiography", "Preventive Cardiology"],
    languages: [
      { language: "English", proficiency: "Fluent" },
      { language: "Swahili", proficiency: "Native" },
      { language: "Luhya", proficiency: "Native" },
    ],
    publications: [
      {
        id: 1,
        title: "Novel Approaches to Treating Resistant Hypertension in Kenyan Populations",
        journal: "East African Medical Journal",
        year: "2020",
        authors: "Ndiwa J, Wangari J, Mwangi B",
        citations: 87,
      },
      {
        id: 2,
        title: "Long-term Outcomes of Statin Therapy in Patients with Coronary Artery Disease in Kenya",
        journal: "African Journal of Cardiology",
        year: "2019",
        authors: "Wangari J, Ndiwa J, Odhiambo C",
        citations: 124,
      },
      {
        id: 3,
        title: "Predictors of Heart Failure Readmissions in Kenya: A Systematic Review",
        journal: "Pan African Medical Journal",
        year: "2018",
        authors: "Ndiwa J, Kimani T, Wekesa R",
        citations: 156,
      },
    ],
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Qualifications & Credentials</CardTitle>
          <CardDescription>Professional qualifications, certifications, and credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="education">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
              <TabsTrigger value="licenses">Licenses</TabsTrigger>
              <TabsTrigger value="specialties">Specialties</TabsTrigger>
              <TabsTrigger value="languages">Languages</TabsTrigger>
              <TabsTrigger value="publications">Publications</TabsTrigger>
            </TabsList>

            <TabsContent value="education" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {qualificationsData.education.map((edu) => (
                      <div key={edu.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{edu.degree}</div>
                          <div className="text-sm">{edu.institution}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>{edu.location}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>{edu.year}</span>
                          </div>
                          {edu.honors && (
                            <Badge variant="outline" className="mt-2">
                              {edu.honors}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certifications" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {qualificationsData.certifications.map((cert) => (
                      <div key={cert.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{cert.name}</div>
                          <div className="text-sm">{cert.issuingBody}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Issued: {cert.issueDate}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>Expires: {cert.expiryDate}</span>
                          </div>
                          <Badge variant={cert.status === "Active" ? "default" : "outline"} className="mt-2">
                            {cert.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="licenses" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {qualificationsData.licenses.map((license) => (
                      <div key={license.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <FileCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{license.type}</div>
                          <div className="text-sm">
                            {license.state} • License #: {license.licenseNumber}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Issued: {license.issueDate}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>Expires: {license.expiryDate}</span>
                          </div>
                          <Badge variant={license.status === "Active" ? "default" : "outline"} className="mt-2">
                            {license.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specialties" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {qualificationsData.specialties.map((specialty, index) => (
                      <Badge key={index} className="text-sm py-1 px-3">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="languages" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {qualificationsData.languages.map((lang, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="font-medium">{lang.language}</div>
                        <Badge variant="outline">{lang.proficiency}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publications" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {qualificationsData.publications.map((pub) => (
                      <div key={pub.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{pub.title}</div>
                          <div className="text-sm">
                            {pub.journal}, {pub.year}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">Authors: {pub.authors}</div>
                          <div className="text-sm text-muted-foreground mt-1">Citations: {pub.citations}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
