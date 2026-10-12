"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()

  // Skip rendering breadcrumbs on the home page
  if (pathname === "/") {
    return null
  }

  // Split the pathname into segments and remove empty strings
  const segments = pathname.split("/").filter(Boolean)

  // Generate breadcrumb items
  const breadcrumbs = [
    { name: "Home", href: "/" },
    ...segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`

      // Format the segment name to be more readable
      let name = segment.charAt(0).toUpperCase() + segment.slice(1)

      // Replace hyphens and underscores with spaces
      name = name.replace(/[-_]/g, " ")

      // Handle special case for IDs in routes like /patients/123
      if (index > 0 && segments[index - 1] === "patients" && !isNaN(Number(segment))) {
        name = `Patient ${segment}`
      } else if (index > 0 && segments[index - 1] === "doctors" && !isNaN(Number(segment))) {
        name = `Doctor ${segment}`
      }

      return { name, href }
    }),
  ]

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index > 0 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50" />}
            {index === 0 ? (
              <Link href={breadcrumb.href} className="flex items-center hover:text-foreground transition-colors">
                <Home className="h-4 w-4 mr-1" />
                <span className="sr-only">Home</span>
              </Link>
            ) : index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{breadcrumb.name}</span>
            ) : (
              <Link href={breadcrumb.href} className="hover:text-foreground transition-colors">
                {breadcrumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
