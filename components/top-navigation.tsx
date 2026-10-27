"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"
import { useRoleMenuAccess } from "@/lib/hooks/use-role-menu-access"
import { useSidebar } from "@/components/ui/sidebar"
import { getLucideIcon } from "@/lib/lucide-by-name"
import { ArrowRight, ChevronDown, LayoutGrid } from "lucide-react"
import { getNavCategoryChrome } from "@/lib/navigation-category-theme"
import {
  getAllowedCategories,
  getNavigationCategoryById,
  isModuleHubPath,
  MODULE_HUB_PATH,
  workspacePath,
} from "@/lib/module-navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopNavigationProps {
  onCategoryChange: (categoryId: string) => void
  activeCategory: string
}

export function TopNavigation({ onCategoryChange, activeCategory }: TopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { menuAccess, loading: menuLoading } = useRoleMenuAccess(user?.id)
  const { isMobile, openMobileForCategoryBrowse } = useSidebar()

  if (isModuleHubPath(pathname)) {
    return null
  }

  const quickLinks = (user?.landingConfig as any)?.quickLinks
  const hasQuickLinks = Array.isArray(quickLinks) && quickLinks.length > 0

  const isQuickLinkActive = (url: string) => {
    const path = url?.split("?")[0] || url
    return pathname === path || (path !== "/" && pathname.startsWith(path + "/"))
  }

  const allowedCategories = getAllowedCategories(menuAccess, menuLoading)
  const activeMeta = getNavigationCategoryById(activeCategory) || allowedCategories[0]
  const activeChrome = getNavCategoryChrome(activeCategory)

  const openWorkspace = (categoryId: string) => {
    onCategoryChange(categoryId)
    const mobileNow =
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
    if (mobileNow || isMobile) {
      openMobileForCategoryBrowse()
    }
    router.push(workspacePath(categoryId))
  }

  const ActiveIcon = activeMeta?.icon

  return (
    <div
      className={cn(
        "app-chrome-nav border-b border-b-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        activeChrome.barAccent,
      )}
    >
      <div className="flex h-14 items-center gap-3 overflow-x-auto px-4 scrollbar-none">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 border-dashed"
        >
          <Link href={MODULE_HUB_PATH}>
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">All modules</span>
          </Link>
        </Button>

        {activeMeta && ActiveIcon && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("shrink-0 gap-2 px-3 font-semibold", activeChrome.activeButton)}
              >
                <ActiveIcon className="h-4 w-4" />
                <span className="max-w-[200px] truncate font-medium">{activeMeta.title}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Switch module</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allowedCategories.map((category) => {
                const Icon = category.icon
                return (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => openWorkspace(category.id)}
                    className={cn(category.id === activeCategory && "bg-accent")}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {category.title}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="hidden shrink-0 font-medium text-foreground md:inline-flex"
        >
          <Link href={workspacePath(activeCategory)}>Module home</Link>
        </Button>

        {hasQuickLinks && (
          <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-border pl-3">
            {quickLinks.map((link: { label: string; url: string; icon?: string }, idx: number) => {
              const IconComponent = getLucideIcon(link.icon)
              const active = isQuickLinkActive(link.url || "")
              return (
                <Link key={`quick-${idx}-${link.url}`} href={link.url || "#"}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="whitespace-nowrap">{link.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
