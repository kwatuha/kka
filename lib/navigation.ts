import { isNbtmsEnabled } from "./nbtms-enabled"
import { branding } from "./branding"

const MOBILE_APP_LABEL = `${branding.productName} Mobile`
import {
  Activity,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Pill,
  Settings,
  Users,
  CreditCard,
  BarChart3,
  Building2,
  Stethoscope,
  BedDouble,
  Baby,
  HeartPulse,
  ShoppingCart,
  DollarSign,
  UserCog,
  Boxes,
  Receipt,
  Clipboard,
  FlaskConical,
  ImageIcon,
  Package,
  Grid,
  PlusCircle,
  Layers,
  ListOrdered,
  UserPlus,
  MapPin,
  Shield,
  Bell,
  History,
  Store,
  Ambulance,
  Video,
  Truck,
  Smartphone,
  Brain,
  Droplets,
  Banknote,
  Share2,
  Siren,
  Cross,
} from "lucide-react"

export interface NavigationItem {
  title: string
  href: string
  icon: any
  description?: string
  /** Optional sidebar subgroup (e.g. Clinical Services) — renders as a collapsible section */
  group?: string
}

/** Order for clinical-services groups in the sidebar (collapsible sections) */
export const CLINICAL_SIDEBAR_GROUP_ORDER = [
  "Outpatient & diagnostics",
  "Wards & beds",
  "Support & outreach",
] as const

/** Order for financial-management groups in the sidebar */
export const FINANCIAL_SIDEBAR_GROUP_ORDER = [
  "Ledger & reporting",
  "Payables & receivables",
  "Planning & assets",
  "Billing & insurance",
] as const

export interface NavigationCategory {
  id: string
  title: string
  icon: any
  description: string
  items: NavigationItem[]
}

export const navigationCategories: NavigationCategory[] = [
  {
    id: "overview",
    title: "Dashboard",
    icon: Home,
    description: "Main dashboard and overview sections",
    items: [
      {
        title: "Module home",
        icon: Grid,
        href: "/hub",
        description: "Choose a hospital module workspace",
      },
      {
        title: "Executive dashboard",
        icon: Home,
        href: "/executive-dashboard",
        description: "KPIs and operational overview",
      },
      {
        title: "Departments",
        href: "/departments",
        icon: Building2,
      },
      {
        title: "Analytics",
        icon: BarChart3,
        href: "/analytics",
      },
      {
        title: "Regional Dashboard",
        icon: MapPin,
        href: "/regional-dashboard",
      },
      {
        title: "Facility Performance",
        icon: Building2,
        href: "/facility-performance",
        description: "Compare patients, queues, revenue and stock across hospital branches",
      },
      {
        title: "Service Point Performance",
        icon: MapPin,
        href: "/service-point-performance",
        description: "Queue load and wait times across desks, rooms and windows within each branch",
      },
      {
        title: "Mobile app",
        icon: Smartphone,
        href: "/field-app",
        description: `Download ${MOBILE_APP_LABEL} (HMIS companion for all roles)`,
      },
    ],
  },
  {
    id: "patient-care",
    title: "Patient Care",
    icon: Users,
    description: "Patient management and care services",
    items: [
      {
        title: "Patients",
        icon: Users,
        href: "/patients",
        description: "Search, register, and update patient records",
      },
      {
        title: "Registration Desk",
        icon: UserPlus,
        href: "/registration",
        description: "Front-desk queue — call patients and send to triage or clinic",
      },
      {
        title: "Triage Records",
        icon: Clipboard,
        href: "/triaging",
        description: "View and manage triage assessments",
      },
      {
        title: "Triage Desk",
        icon: Activity,
        href: "/triage-desk",
        description: "Service-point queue — call patients and record triage",
      },
      {
        title: "Appointments",
        icon: Calendar,
        href: "/appointments",
      },
      {
        title: "Queue Management",
        icon: ListOrdered,
        href: "/queue",
      },
      {
        title: "Medical Records",
        icon: FileText,
        href: "/medical-records",
      },
    ],
  },
  {
    id: "clinical-services",
    title: "Clinical Services",
    icon: Stethoscope,
    description: "Clinical departments and services",
    items: [
      {
        title: "Consultation Desk",
        icon: Stethoscope,
        href: "/consultation",
        description: "Clinician queue — call and see patients",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Doctors Directory",
        icon: Stethoscope,
        href: "/doctors",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Specialist Clinics",
        icon: Brain,
        href: "/specialist-clinics",
        description: "Neurosurgery, cardiology, ENT, ophthalmology, dental, and other specialist services",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Pharmacy",
        icon: Pill,
        href: "/pharmacy",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Chemist Referrals",
        icon: Store,
        href: "/chemist/referrals",
        description: "External chemist portal for referred prescriptions",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Drug Availability",
        icon: Package,
        href: "/chemist/drugs",
        description: "External chemist medicine availability and stock status",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Stock Requests",
        icon: Truck,
        href: "/chemist/stock-requests",
        description: "Request drugs from the hospital main store",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Available Labs",
        icon: FlaskConical,
        href: "/chemist/labs",
        description: "External chemist laboratory test availability",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Pickup History",
        icon: History,
        href: "/chemist/history",
        description: "Completed external chemist pickup records",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Chemist Profile",
        icon: Store,
        href: "/chemist/profile",
        description: "External chemist contact, license, and location details",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Chemist Users",
        icon: UserCog,
        href: "/chemist/users",
        description: "Manage external chemist staff user accounts",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Lab Desk",
        icon: FlaskConical,
        href: "/lab",
        description: "Lab queue, unpaid orders, collections, and clinical context",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Laboratory",
        icon: FlaskConical,
        href: "/laboratory",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Radiology",
        icon: ImageIcon,
        href: "/radiology",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Procedures performed",
        icon: ClipboardList,
        href: "/procedures/performed",
        description: "Register of procedures done on patients (incl. outcomes from queue)",
        group: "Outpatient & diagnostics",
      },
      {
        title: "Inpatient",
        icon: BedDouble,
        href: "/inpatient",
        group: "Wards & beds",
      },
      {
        title: "Maternity",
        icon: Baby,
        href: "/maternity",
        group: "Wards & beds",
      },
      {
        title: "ICU",
        icon: HeartPulse,
        href: "/icu",
        group: "Wards & beds",
      },
      {
        title: "Renal Unit & Dialysis",
        icon: Droplets,
        href: "/renal",
        description: "Dialysis scheduling, machine status, and renal patient registry",
        group: "Wards & beds",
      },
      {
        title: "Emergency Care",
        icon: Siren,
        href: "/emergency",
        description: "Treat-first intake for accidents and critical arrivals; complete registration later",
        group: "Support & outreach",
      },
      ...(isNbtmsEnabled()
        ? [
            {
              title: "Blood Bank (NBTMS)",
              icon: Droplets,
              href: "/blood-bank",
              description:
                "National donor registry, blood stock, cross-match, and hemovigilance (DHA NBTMS variant)",
              group: "Support & outreach",
            },
          ]
        : []),
      {
        title: "Mortuary",
        icon: Cross,
        href: "/mortuary",
        description: "Body intake, storage, next of kin, and release after death outcomes",
        group: "Support & outreach",
      },
      {
        title: "Ambulance Management",
        icon: Ambulance,
        href: "/ambulance",
        group: "Support & outreach",
      },
      {
        title: "Telemedicine",
        icon: Video,
        href: "/telemedicine",
        description: "Remote video visits (Zoom, Google Meet, and link mode)",
        group: "Support & outreach",
      },
      {
        title: "Field datasets",
        icon: ClipboardList,
        href: "/field-datasets",
        description: `Surveillance forms and special datasets for ${MOBILE_APP_LABEL}`,
        group: "Support & outreach",
      },
      {
        title: "Mobile app",
        icon: Smartphone,
        href: "/field-app",
        description: `Download ${MOBILE_APP_LABEL} APK`,
        group: "Support & outreach",
      },
      {
        title: "Field app usage",
        icon: BarChart3,
        href: "/field-app-usage",
        description: "APK downloads and Field app login/sync activity",
        group: "Support & outreach",
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Management",
    icon: DollarSign,
    description: "Financial operations and billing",
    items: [
      {
        title: "Cashier Desk",
        icon: Banknote,
        href: "/cashier",
        description: "Cashier queue and daily collections by payment mode",
        group: "Billing & insurance",
      },
      {
        title: "Finance Overview",
        icon: BarChart3,
        href: "/finance",
        description: "Revenue, expenses, outstanding invoices, and quick access to finance modules",
        group: "Ledger & reporting",
      },
      {
        title: "General Ledger",
        icon: Clipboard,
        href: "/finance/ledger",
        group: "Ledger & reporting",
      },
      {
        title: "Financial Reports",
        icon: FileText,
        href: "/finance/reports",
        group: "Ledger & reporting",
      },
      {
        title: "Ledger Accounts",
        icon: Clipboard,
        href: "/finance/accounts",
        group: "Ledger & reporting",
      },
      {
        title: "Financial Statements",
        icon: FileText,
        href: "/finance/statements",
        group: "Ledger & reporting",
      },
      {
        title: "Accounts Payable",
        icon: Receipt,
        href: "/finance/payable",
        group: "Payables & receivables",
      },
      {
        title: "Accounts Receivable",
        icon: CreditCard,
        href: "/finance/receivable",
        group: "Payables & receivables",
      },
      {
        title: "Cash Management",
        icon: DollarSign,
        href: "/finance/cash",
        group: "Payables & receivables",
      },
      {
        title: "M-Pesa register",
        icon: Smartphone,
        href: "/finance/mpesa",
        description: "STK push sessions, receipts, and invoice application status",
        group: "Billing & insurance",
      },
      {
        title: "Budgeting",
        icon: DollarSign,
        href: "/finance/budgeting",
        group: "Planning & assets",
      },
      {
        title: "Fixed Assets",
        icon: Building2,
        href: "/finance/assets",
        group: "Planning & assets",
      },
      {
        title: "Billing & Invoicing",
        icon: Receipt,
        href: "/billing",
        group: "Billing & insurance",
      },
      {
        title: "Insurance Management",
        icon: FileText,
        href: "/insurance",
        group: "Billing & insurance",
      },
    ],
  },
  {
    id: "procurement",
    title: "Supply Chain",
    icon: ShoppingCart,
    description: "Supply chain and inventory management",
    items: [
      {
        title: "Supply Chain Overview",
        icon: ShoppingCart,
        href: "/procurement",
        description: "Purchase orders, vendor activity, and low-stock alerts",
      },
      {
        title: "Vendor Management",
        icon: Users,
        href: "/procurement/vendors",
      },
      {
        title: "Purchase Orders",
        icon: ShoppingCart,
        href: "/procurement/orders",
      },
      {
        title: "Inventory Overview",
        icon: Grid,
        href: "/inventory",
      },
      {
        title: "Add Inventory Item",
        icon: PlusCircle,
        href: "/inventory/new",
      },
      {
        title: "Stock Adjustment",
        icon: Layers,
        href: "/inventory/adjust",
      },
      {
        title: "Inventory Analytics",
        icon: BarChart3,
        href: "/inventory/analytics",
      },
      {
        title: "Drug Notifications",
        icon: Bell,
        href: "/procurement/notifications",
      },
    ],
  },
  {
    id: "administrative",
    title: "Administrative",
    icon: UserCog,
    description: "HR and administrative functions",
    items: [
      {
        title: "HR Overview",
        icon: Users,
        href: "/hr",
        description: "Staffing snapshot, leave, vacancies, and recent HR activity",
      },
      {
        title: "Employee Management",
        icon: UserCog,
        href: "/hr/employees",
      },
      {
        title: "Payroll",
        icon: Banknote,
        href: "/hr/payroll",
        description: "Month-end batch, statutory totals, and payslips",
      },
      {
        title: "MOH Reports",
        icon: FileText,
        href: "/reports",
      },
      {
        title: "IDSR Alerts",
        icon: Bell,
        href: "/idsr-alerts",
        description: "Notifiable disease detections, acknowledge, and sandbox evaluate",
      },
      {
        title: "System Administration",
        icon: Shield,
        href: "/administration",
      },
      {
        title: "Data Exchange",
        icon: Share2,
        href: "/data-exchange",
        description: "Where facility data is sent — national partners, outbox, and transmission history",
      },
      {
        title: "Bill Waivers",
        icon: Receipt,
        href: "/administration/waivers",
      },
      {
        title: "Hospital Charges",
        icon: DollarSign,
        href: "/finance/charges",
      },
      {
        title: "Revenue Share",
        icon: DollarSign,
        href: "/finance/revenue-share",
      },
      {
        title: "Clinical Configuration",
        icon: ClipboardList,
        href: "/configuration",
      },
      {
        title: "Settings",
        icon: Settings,
        href: "/settings",
      },
      {
        title: "Drug Stores",
        icon: Store,
        href: "/settings/drug-stores",
      },
      {
        title: "Laboratory units",
        icon: FlaskConical,
        href: "/settings/laboratories",
        description: "Lab units, contacts, and which tests each lab offers",
      },
      {
        title: "Service Points",
        icon: MapPin,
        href: "/settings/service-points",
      },
      {
        title: "Desk Assignments",
        icon: Users,
        href: "/settings/service-point-assignments",
      },
      {
        title: "External Chemists",
        icon: Store,
        href: "/settings/external-chemists",
      },
    ],
  },
]

export function getCategoryById(id: string): NavigationCategory | undefined {
  return navigationCategories.find(category => category.id === id)
}

export function getCategoryByPath(pathname: string): NavigationCategory {
  const path = pathname.split("?")[0] || pathname

  const workspaceMatch = path.match(/^\/workspace\/([^/]+)/)
  if (workspaceMatch) {
    const byId = navigationCategories.find((c) => c.id === workspaceMatch[1])
    if (byId) return byId
  }

  if (path === "/hub") {
    return navigationCategories[0]
  }

  // Find the category that contains the current path (longest href wins for shared prefixes)
  let best: { category: NavigationCategory; len: number } | null = null
  for (const category of navigationCategories) {
    for (const item of category.items) {
      if (path === item.href || (item.href !== "/" && path.startsWith(`${item.href}/`))) {
        const len = item.href.length
        if (!best || len > best.len) {
          best = { category, len }
        }
      }
    }
  }
  if (best) return best.category

  if (path === "/") {
    return navigationCategories[0]
  }

  return navigationCategories[0]
}