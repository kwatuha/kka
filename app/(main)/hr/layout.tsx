"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const hrLinks = [
  { href: "/hr", label: "Overview", match: (p: string) => p === "/hr" || p === "/hr/" },
  { href: "/hr/employees", label: "Employees", match: (p: string) => p.startsWith("/hr/employees") },
  { href: "/hr/payroll", label: "Payroll", match: (p: string) => p.startsWith("/hr/payroll") },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const path = pathname.startsWith("/hmis") ? pathname.slice("/hmis".length) || "/" : pathname

  return (
    <div className="flex flex-col gap-4">
      <nav
        className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1 text-sm"
        aria-label="Human resources sections"
      >
        {hrLinks.map((link) => {
          const active = link.match(path)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
