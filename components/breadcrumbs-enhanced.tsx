"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { getNavigationCategoryById } from "@/lib/module-navigation"

// Define route mappings for special cases and better naming
const routeMappings: Record<string, string> = {
  patients: "Patients",
  doctors: "Doctors",
  "medical-records": "Medical Records",
  appointments: "Appointments",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  radiology: "Radiology",
  billing: "Billing",
  finance: "Finance",
  hr: "Human Resources",
  hub: "Modules",
  workspace: "Workspace",
  "executive-dashboard": "Executive dashboard",
  settings: "Settings",
  analytics: "Analytics",
  triaging: "Triage Records",
  inpatient: "Inpatient",
  maternity: "Maternity",
  icu: "ICU",
  emergency: "Emergency Care",
  mortuary: "Mortuary",
  payable: "Accounts Payable",
  receivable: "Accounts Receivable",
  budgeting: "Budgeting",
  cash: "Cash Management",
  assets: "Assets",
  ledger: "General Ledger",
  charges: "Service Charges",
  procurement: "Supply Chain",
  vendors: "Vendors",
  insurance: "Insurance",
  "revenue-share": "Revenue Share",
}

export function BreadcrumbsEnhanced() {
  const pathname = usePathname()

  // Skip breadcrumbs on module hub
  if (pathname === "/" || pathname === "/hub") {
    return null
  }

  // Split the pathname into segments and remove empty strings
  const segments = pathname.split("/").filter(Boolean)

  // Generate breadcrumb items
  const breadcrumbs = [
    { name: "Modules", href: "/hub" },
    ...segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`

      // Check if this is an ID segment (numeric value after a known entity)
      const isIdSegment =
        !isNaN(Number(segment)) && index > 0 && ["patients", "doctors", "appointments"].includes(segments[index - 1])

      // Format the segment name
      let name
      if (isIdSegment) {
        const entityType = segments[index - 1]
        // Remove trailing 's' and capitalize
        const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1, -1)
        name = `${entityName} #${segment}`
      } else if (segments[0] === "workspace" && index === 1) {
        name = getNavigationCategoryById(segment)?.title || segment.replace(/-/g, " ")
      } else {
        name = routeMappings[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
      }

      return { name, href }
    }),
  ]

  const last = breadcrumbs[breadcrumbs.length - 1]

  return (
    <>
      <nav
        aria-label="Breadcrumbs"
        className="hidden min-[1280px]:flex min-w-0 max-w-[14rem] items-center text-sm xl:max-w-[18rem] 2xl:max-w-none"
      >
        <ol className="flex min-w-0 items-center space-x-1">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index > 0 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50" />}
            {index === 0 ? (
              <Link
                href={breadcrumb.href}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            ) : index === breadcrumbs.length - 1 ? (
              <span className="truncate font-medium text-foreground">{breadcrumb.name}</span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="truncate text-muted-foreground hover:text-foreground transition-colors max-w-[5rem] xl:max-w-[7rem]"
              >
                {breadcrumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
      {last ? (
        <span
          className="hidden min-w-0 max-w-[6rem] truncate text-sm font-medium text-foreground md:inline min-[1280px]:hidden lg:max-w-[8rem]"
          title={last.name}
        >
          {last.name}
        </span>
      ) : null}
    </>
  )
}
