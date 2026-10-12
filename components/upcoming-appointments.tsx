import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const upcomingAppointments = [
  {
    id: "A-2001",
    patientName: "Alice Kimutai",
    time: "10:30 AM",
    doctor: "Dr. James Ndiwa",
    department: "Cardiology",
    status: "Confirmed",
    avatar: "/diverse-group-city.png",
    initials: "AK",
  },
  {
    id: "A-2002",
    patientName: "Robert Tarus",
    time: "11:15 AM",
    doctor: "Dr. Sarah Isuvi",
    department: "Dermatology",
    status: "Pending",
    avatar: "/diverse-group-city.png",
    initials: "RT",
  },
  {
    id: "A-2003",
    patientName: "Jennifer Elkana",
    time: "1:00 PM",
    doctor: "Dr. Michael Siva",
    department: "Ophthalmology",
    status: "Confirmed",
    avatar: "/diverse-group-chatting.png",
    initials: "JE",
  },
  {
    id: "A-2004",
    patientName: "David Abunga",
    time: "2:45 PM",
    doctor: "Dr. Emily Logovane",
    department: "Neurology",
    status: "Rescheduled",
    avatar: "/diverse-group-meeting.png",
    initials: "DA",
  },
  {
    id: "A-2005",
    patientName: "Mary Wanjiku",
    time: "3:30 PM",
    doctor: "Dr. Peter Omondi",
    department: "Orthopedics",
    status: "Confirmed",
    avatar: "/diverse-group-city.png",
    initials: "MW",
  },
]

export function UpcomingAppointments() {
  return (
    <div className="space-y-2">
      {upcomingAppointments.map((appointment) => (
        <div key={appointment.id} className="flex items-center gap-2 py-1">
          <Avatar className="h-6 w-6">
            <AvatarImage src={appointment.avatar || "/placeholder.svg"} alt={appointment.patientName} />
            <AvatarFallback className="text-[10px]">{appointment.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium leading-none truncate">{appointment.patientName}</p>
              <p className="text-[10px] text-muted-foreground ml-1">{appointment.time}</p>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {appointment.doctor.replace("Dr. ", "")} • {appointment.department}
            </p>
          </div>
          <Badge
            className="text-[10px] px-1 py-0 h-4"
            variant={
              appointment.status === "Confirmed"
                ? "default"
                : appointment.status === "Pending"
                  ? "secondary"
                  : "outline"
            }
          >
            {appointment.status}
          </Badge>
        </div>
      ))}
    </div>
  )
}
