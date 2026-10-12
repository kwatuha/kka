"use client"

import { useNavigation } from "@/lib/navigation-context"
import { navigationCategories } from "@/lib/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  DollarSign, 
  Activity, 
  BarChart3, 
  ShoppingCart, 
  UserCog,
  Home,
  Stethoscope,
  Building2,
  FileText,
  Calendar,
  Pill,
  FlaskConical,
  ImageIcon,
  BedDouble,
  Baby,
  HeartPulse,
  CreditCard,
  Receipt,
  Clipboard,
  Boxes,
  Settings
} from "lucide-react"

export function ContextualDashboard() {
  const { activeCategory } = useNavigation()
  const currentCategory = navigationCategories.find(cat => cat.id === activeCategory)

  if (!currentCategory) return null

  const getCategoryStats = () => {
    switch (activeCategory) {
      case "overview":
        return [
          { title: "Total Patients", value: "1,234", icon: Users, change: "+12%" },
          { title: "Revenue", value: "KES 45,678", icon: DollarSign, change: "+8%" },
          { title: "Active Appointments", value: "89", icon: Calendar, change: "+5%" },
          { title: "Departments", value: "12", icon: Building2, change: "0%" },
        ]
      case "patient-care":
        return [
          { title: "Registered Patients", value: "1,234", icon: Users, change: "+15%" },
          { title: "Today's Appointments", value: "45", icon: Calendar, change: "+3%" },
          { title: "Queue Length", value: "23", icon: Activity, change: "-8%" },
          { title: "Medical Records", value: "2,456", icon: FileText, change: "+20%" },
        ]
      case "clinical-services":
        return [
          { title: "Active Doctors", value: "28", icon: Stethoscope, change: "+2%" },
          { title: "Pharmacy Orders", value: "156", icon: Pill, change: "+12%" },
          { title: "Lab Tests", value: "89", icon: FlaskConical, change: "+7%" },
          { title: "Radiology Scans", value: "34", icon: ImageIcon, change: "+4%" },
        ]
      case "financial":
        return [
          { title: "Monthly Revenue", value: "KES 125,000", icon: DollarSign, change: "+18%" },
          { title: "Outstanding Bills", value: "KES 23,456", icon: CreditCard, change: "-5%" },
          { title: "Insurance Claims", value: "234", icon: Receipt, change: "+12%" },
          { title: "Budget Utilization", value: "78%", icon: Clipboard, change: "+3%" },
        ]
      case "procurement":
        return [
          { title: "Active Vendors", value: "45", icon: Users, change: "+3%" },
          { title: "Purchase Orders", value: "67", icon: ShoppingCart, change: "+8%" },
          { title: "Inventory Items", value: "1,234", icon: Boxes, change: "+15%" },
          { title: "Stock Alerts", value: "12", icon: Activity, change: "-20%" },
        ]
      case "administrative":
        return [
          { title: "Total Employees", value: "156", icon: UserCog, change: "+5%" },
          { title: "Active Sessions", value: "23", icon: Activity, change: "+2%" },
          { title: "System Status", value: "Healthy", icon: Settings, change: "0%" },
          { title: "Recent Activities", value: "89", icon: BarChart3, change: "+12%" },
        ]
      default:
        return []
    }
  }

  const stats = getCategoryStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{currentCategory.title}</h1>
        <p className="text-muted-foreground">{currentCategory.description}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span> from last month
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for {currentCategory.title.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentCategory.items.slice(0, 6).map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 