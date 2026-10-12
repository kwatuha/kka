import {
  navigationCategories,
  type NavigationCategory,
  type NavigationItem,
} from "./navigation"
import { filterNavigationCategories, filterSidebarItems, type RoleMenuAccess } from "./role-menu-filter"
import { applyTelemedicineScopeToCategories, applyTelemedicineScopeToItems } from "./telemedicine-scope"

export const MODULE_HUB_PATH = "/hub"

/** Paths where the full module hub is shown (no sidebar / compact chrome). */
export function isModuleHubPath(pathname: string): boolean {
  const base = pathname.split("?")[0] || pathname
  return base === "/" || base === MODULE_HUB_PATH || base.endsWith(MODULE_HUB_PATH)
}

export function isWorkspaceHomePath(pathname: string): boolean {
  const base = pathname.split("?")[0] || pathname
  return /^\/workspace\/[^/]+$/.test(base)
}

export function workspacePath(categoryId: string): string {
  return `/workspace/${categoryId}`
}

export function getNavigationCategoryById(categoryId: string): NavigationCategory | undefined {
  return navigationCategories.find((c) => c.id === categoryId)
}

export function getAllowedCategories(
  menuAccess: RoleMenuAccess | null,
  menuLoading: boolean,
): NavigationCategory[] {
  return applyTelemedicineScopeToCategories(
    menuLoading || !menuAccess
      ? navigationCategories
      : filterNavigationCategories(navigationCategories, menuAccess),
  )
}

export function getAllowedItemsForCategory(
  categoryId: string,
  menuAccess: RoleMenuAccess | null,
  menuLoading: boolean,
): NavigationItem[] {
  const category = getNavigationCategoryById(categoryId)
  if (!category) return []
  const roleFiltered =
    menuLoading || !menuAccess
      ? category.items
      : filterSidebarItems(category.items, category.id, menuAccess)
  return applyTelemedicineScopeToItems(roleFiltered)
}

/** First sidebar link to open when entering a module workspace. */
export function getDefaultEntryHref(
  categoryId: string,
  menuAccess: RoleMenuAccess | null,
  menuLoading: boolean,
): string | null {
  const items = getAllowedItemsForCategory(categoryId, menuAccess, menuLoading)
  const first = items[0]
  return first?.href ?? null
}
