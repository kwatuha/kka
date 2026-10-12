"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRoleMenuAccess } from "@/lib/hooks/use-role-menu-access"
import { useNavigation } from "@/lib/navigation-context"
import {
  getAllowedItemsForCategory,
  getNavigationCategoryById,
  MODULE_HUB_PATH,
} from "@/lib/module-navigation"
import { getNavCategoryChrome } from "@/lib/navigation-category-theme"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface WorkspaceHomeProps {
  categoryId: string
}

export function WorkspaceHome({ categoryId }: WorkspaceHomeProps) {
  const { user } = useAuth()
  const { menuAccess, loading } = useRoleMenuAccess(user?.id ? String(user.id) : undefined)
  const { setActiveCategory } = useNavigation()
  const category = getNavigationCategoryById(categoryId)
  const items = getAllowedItemsForCategory(categoryId, menuAccess, loading)
  const chrome = getNavCategoryChrome(categoryId)

  useEffect(() => {
    if (category) {
      setActiveCategory(category.id)
    }
  }, [category, setActiveCategory])

  if (!category) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
        <p className="text-muted-foreground">This workspace is not available.</p>
        <Button asChild variant="outline">
          <Link href={MODULE_HUB_PATH}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            All modules
          </Link>
        </Button>
      </div>
    )
  }

  const CategoryIcon = category.icon

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 bg-muted/30",
              chrome.barAccent,
            )}
          >
            <CategoryIcon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">{category.title}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={MODULE_HUB_PATH}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change module
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const ItemIcon = item.icon
          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ItemIcon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  {item.description ? (
                    <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                  ) : null}
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      {items.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No features in this module are assigned to your role.
        </p>
      )}
    </div>
  )
}
