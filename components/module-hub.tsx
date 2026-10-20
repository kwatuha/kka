"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { useRoleMenuAccess } from "@/lib/hooks/use-role-menu-access"
import {
  getAllowedCategories,
  getAllowedItemsForCategory,
  workspacePath,
} from "@/lib/module-navigation"
import { getModuleHubCardTheme } from "@/lib/navigation-category-theme"
import { cn } from "@/lib/utils"
import { ArrowRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { branding } from "@/lib/branding"
import { getPersonalGreetingName } from "@/lib/user-greeting"
import { HospitalLogoImage } from "@/components/hospital-logo-image"
import * as LucideIcons from "lucide-react"

export function ModuleHub() {
  const router = useRouter()
  const { user } = useAuth()
  const { menuAccess, loading } = useRoleMenuAccess(user?.id)
  const categories = getAllowedCategories(menuAccess, loading)
  const quickLinks = (user?.landingConfig as { quickLinks?: Array<{ label: string; url: string; icon?: string }> })
    ?.quickLinks

  const greetingName = getPersonalGreetingName(user)
  const title = greetingName ? `Welcome back, ${greetingName}` : `Welcome to ${branding.appBrand}`

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col justify-center px-1 py-4 sm:px-2 sm:py-6 min-h-[calc(100dvh-10.5rem)]">
      <header className="mb-5 flex flex-col items-center gap-4 text-center sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div className="min-w-0 space-y-1 sm:flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {branding.appBrand}
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {categories.length} module{categories.length === 1 ? "" : "s"} for your role — select one to
            open its workspace.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
          <HospitalLogoImage
            adaptToTheme
            variant="compact"
            className="h-10 w-auto max-w-[150px] opacity-95 sm:h-11"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => router.push("/logout")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      {Array.isArray(quickLinks) && quickLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
          {quickLinks.map((link, idx) => {
            const Icon =
              (LucideIcons as Record<string, LucideIcons.LucideIcon>)[link.icon || "ArrowRight"] ||
              ArrowRight
            return (
              <Link
                key={`ql-${idx}-${link.url}`}
                href={link.url || "#"}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium shadow-sm hover:bg-accent"
              >
                <Icon className="h-3 w-3 text-primary" />
                {link.label}
              </Link>
            )
          })}
        </div>
      )}

      <div
        className={cn(
          "grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3",
          categories.length <= 2 && "sm:max-w-xl sm:mx-auto",
          categories.length === 3 && "lg:max-w-3xl lg:mx-auto",
        )}
      >
        {categories.map((category) => {
          const Icon = category.icon
          const theme = getModuleHubCardTheme(category.id)
          const featureCount = getAllowedItemsForCategory(category.id, menuAccess, loading).length

          return (
            <Link
              key={category.id}
              href={workspacePath(category.id)}
              className="group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            >
              <article
                className={cn(
                  "relative flex h-full min-h-[8.25rem] flex-col rounded-xl border bg-card p-4 shadow-sm",
                  "transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md",
                  theme.borderHover,
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset",
                      theme.banner,
                      theme.iconWrap,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", theme.iconColor)} strokeWidth={1.75} />
                  </div>
                  {featureCount > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                        theme.chip,
                      )}
                    >
                      {featureCount} tools
                    </span>
                  ) : null}
                </div>
                <h2 className="text-sm font-semibold leading-snug sm:text-base">{category.title}</h2>
                <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </article>
            </Link>
          )
        })}
      </div>

      {categories.length === 0 && !loading && (
        <p className="mt-6 rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No modules are assigned to your role. Contact your system administrator.
        </p>
      )}
    </div>
  )
}
