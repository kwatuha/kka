import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const recentPatients = [
  {
    id: "P-1001",
    name: "John Imbayi",
    age: 45,
    status: "Admitted",
    department: "Cardiology",
    avatar: "/thoughtful-portrait.png",
    initials: "JI",
  },
  {
    id: "P-1002",
    name: "Sarah Lwikane",
    age: 32,
    status: "Outpatient",
    department: "Gynecology",
    avatar: "/diverse-group-chatting.png",
    initials: "SL",
  },
  {
    id: "P-1003",
    name: "Michael Imbunya",
    age: 58,
    status: "Emergency",
    department: "Neurology",
    avatar: "/diverse-group-chatting.png",
    initials: "MI",
  },
  {
    id: "P-1004",
    name: "Emily Kimani",
    age: 27,
    status: "Discharged",
    department: "Orthopedics",
    avatar: "/diverse-group-chatting.png",
    initials: "EK",
  },
  {
    id: "P-1005",
    name: "David Mwangi",
    age: 42,
    status: "Admitted",
    department: "Pulmonology",
    avatar: "/diverse-group-meeting.png",
    initials: "DM",
  },
]

export function RecentPatients() {
  return (
    <div className="space-y-2">
      {recentPatients.map((patient) => (
        <div key={patient.id} className="flex items-center gap-2 py-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={patient.avatar || "/placeholder.svg"} alt={patient.name} />
            <AvatarFallback className="text-[10px]">{patient.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium leading-none truncate">{patient.name}</p>
              <p className="text-[10px] text-muted-foreground ml-1">#{patient.id}</p>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {patient.age} yrs • {patient.department}
            </p>
          </div>
          <Badge
            className="text-[10px] px-1 py-0 h-4"
            variant={
              patient.status === "Emergency"
                ? "destructive"
                : patient.status === "Admitted"
                  ? "default"
                  : patient.status === "Discharged"
                    ? "outline"
                    : "secondary"
            }
          >
            {patient.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}
