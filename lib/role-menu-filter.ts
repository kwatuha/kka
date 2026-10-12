/**
 * Role-based menu and tab filtering utilities
 *
 * These utilities filter navigation categories, sidebar items, and page tabs
 * based on the user's role permissions.
 */

import { NavigationCategory, NavigationItem } from './navigation'

export interface RoleMenuAccess {
  /** True if role_menu_categories or role_menu_items has any rows (saved in Menu & Tab Access). */
  menuConfigPresent: boolean
  /** categoryIds that have ≥1 row in role_menu_items (distinguishes "no item rows" vs "all items denied"). */
  categoriesWithMenuItemRows: string[]
  categories: string[]  // Allowed category IDs
  menuItems: Array<{ categoryId: string; path: string; isAllowed?: boolean }>
  /** Tab rows for this role; isAllowed false = explicit deny. Missing tab = allow (permissive). */
  tabs: Array<{ pagePath: string; tabId: string; isAllowed?: boolean }>
  queues: string[]  // Allowed queue service points
}

/**
 * Effective top-level category IDs for filtering.
 * - If `role_menu_categories` has rows → use those.
 * - Else if `role_menu_items` has rows but categories are empty → derive unique categoryIds
 *   from menu items (admins often configure sidebar paths without duplicating category rows).
 * - Else → none configured (caller shows full nav).
 */
export function getEffectiveAllowedCategoryIds(roleAccess: RoleMenuAccess): string[] {
  if (roleAccess.categories.length > 0) {
    return roleAccess.categories
  }
  if (roleAccess.menuItems.length > 0) {
    return [...new Set(roleAccess.menuItems.map((m) => m.categoryId))]
  }
  return []
}

function isLegacyUnconfiguredMenu(roleAccess: RoleMenuAccess): boolean {
  return !roleAccess.menuConfigPresent
}

/**
 * Filter navigation categories based on role access
 */
export function filterNavigationCategories(
  categories: NavigationCategory[],
  roleAccess: RoleMenuAccess | null
): NavigationCategory[] {
  if (!roleAccess) {
    return []
  }

  const allowedCategoryIds = getEffectiveAllowedCategoryIds(roleAccess)

  // Saved in Menu & Tab Access but nothing allowed → hide all top categories
  if (allowedCategoryIds.length === 0) {
    if (!isLegacyUnconfiguredMenu(roleAccess)) {
      return []
    }
    // Never saved menu config for this role → legacy permissive default (show all)
    return categories
  }

  return categories.filter((category) => allowedCategoryIds.includes(category.id))
}

/**
 * Filter sidebar items within a category based on role access
 */
export function filterSidebarItems(
  items: NavigationItem[],
  categoryId: string,
  roleAccess: RoleMenuAccess | null
): NavigationItem[] {
  if (!roleAccess) {
    return []
  }

  const hasExplicitCategories = roleAccess.categories.length > 0
  const hasMenuItemRows = roleAccess.menuItems.length > 0

  // Menu config saved but every category/item denied → API returns empty allow lists
  if (
    roleAccess.menuConfigPresent &&
    roleAccess.categories.length === 0 &&
    roleAccess.menuItems.length === 0
  ) {
    return []
  }

  // Explicit category list: hide sidebar for categories not allowed
  if (hasExplicitCategories && !roleAccess.categories.includes(categoryId)) {
    return []
  }

  const categoryMenuRows = roleAccess.menuItems.filter((item) => item.categoryId === categoryId)
  const configuredPaths = new Set(categoryMenuRows.map((item) => item.path))
  const allowedPaths = new Set(
    categoryMenuRows.filter((item) => item.isAllowed !== false).map((item) => item.path)
  )

  const isItemVisible = (href: string) => {
    if (!configuredPaths.has(href)) {
      // New sidebar link not saved in Menu & Tab Access yet → show by default
      return true
    }
    return allowedPaths.has(href)
  }

  /**
   * Menu-item-only configuration: `role_menu_categories` empty but `role_menu_items` has rows.
   * In that mode, a category with no allowed paths is hidden (do not show full category sidebar).
   */
  if (!hasExplicitCategories && hasMenuItemRows) {
    if (categoryMenuRows.length === 0) {
      return []
    }
    if (allowedPaths.size === 0) {
      return []
    }
    return items.filter((item) => isItemVisible(item.href))
  }

  /**
   * Category allowed with no menu-item rows for this category → show the full category sidebar.
   */
  if (categoryMenuRows.length === 0) {
    return items
  }

  if (allowedPaths.size === 0) {
    return []
  }

  // Positive allow-list for this category, plus any nav items not yet in role config
  return items.filter((item) => isItemVisible(item.href))
}

/**
 * Check if a tab is allowed for a role
 * Permissive by default: shows all tabs unless explicitly restricted
 */
export function isTabAllowed(
  pagePath: string,
  tabId: string,
  roleAccess: RoleMenuAccess | null
): boolean {
  if (!roleAccess) {
    return true // Allow by default if no access data
  }

  // Normalize the input page path for matching
  const normalizedInputPath = normalizePagePath(pagePath)

  // Check if there are any tab restrictions for this page
  // Normalize both stored paths and input path, then compare
  const pageTabs = roleAccess.tabs.filter(t => {
    const normalizedStoredPath = normalizePagePath(t.pagePath)
    // Match if normalized paths are equal, or use pattern matching
    return normalizedInputPath === normalizedStoredPath ||
           matchPagePath(normalizedInputPath, normalizedStoredPath)
  })

  // If no restrictions configured for this page, allow all tabs (permissive by default)
  // This ensures roles see tabs unless explicitly restricted
  if (pageTabs.length === 0) {
    return true
  }

  const row = pageTabs.find((t) => t.tabId === tabId)
  if (!row) return true
  return row.isAllowed !== false
}

/**
 * Filter tabs based on role access
 * Permissive by default: shows all tabs unless explicitly restricted
 */
export function filterTabs(
  tabs: Array<{ value: string; label: string }>,
  pagePath: string,
  roleAccess: RoleMenuAccess | null
): Array<{ value: string; label: string }> {
  if (!roleAccess) {
    return tabs // Show all tabs if no access data (permissive default)
  }

  // Normalize the input page path for matching
  const normalizedInputPath = normalizePagePath(pagePath)

  // Check if there are any tab restrictions for this page
  // Normalize both stored paths and input path, then compare
  const pageTabs = roleAccess.tabs.filter(t => {
    const normalizedStoredPath = normalizePagePath(t.pagePath)
    // Match if normalized paths are equal, or use pattern matching
    return normalizedInputPath === normalizedStoredPath ||
           matchPagePath(normalizedInputPath, normalizedStoredPath)
  })

  // If no restrictions configured for this page, show all tabs (permissive by default)
  // This ensures roles see all tabs unless explicitly restricted
  if (pageTabs.length === 0) {
    return tabs
  }

  // Explicit deny only; tabs without a row stay visible
  return tabs.filter((tab) => {
    const row = pageTabs.find((t) => t.tabId === tab.value)
    if (!row) return true
    return row.isAllowed !== false
  })
}

/**
 * Normalize page path for matching
 * Converts dynamic routes like "/patients/[id]" to pattern "/patients/*"
 */
export function normalizePagePath(path: string): string {
  // Replace dynamic segments like [id] with *
  return path.replace(/\[.*?\]/g, '*')
}

/**
 * Match page path against a pattern
 * Supports exact match and wildcard patterns
 */
export function matchPagePath(pagePath: string, pattern: string): boolean {
  // Exact match
  if (pattern === pagePath) {
    return true
  }

  // Wildcard pattern matching
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(pagePath)
  }

  // Prefix match (for paths like "/patients" matching "/patients/123")
  if (pagePath.startsWith(pattern + '/')) {
    return true
  }

  return false
}

/**
 * Check if a queue service point is allowed for a role
 */
export function isQueueAllowed(
  servicePoint: string,
  roleAccess: RoleMenuAccess | null
): boolean {
  if (!roleAccess) {
    return false
  }

  // If no queue restrictions, allow all queues
  if (roleAccess.queues.length === 0) {
    return true
  }

  // Check if this specific service point is allowed
  return roleAccess.queues.includes(servicePoint)
}

/**
 * Filter queue service points based on role access
 */
export function filterQueueServicePoints(
  servicePoints: string[],
  roleAccess: RoleMenuAccess | null
): string[] {
  if (!roleAccess) {
    return []
  }

  // If no queue restrictions, allow all service points
  if (roleAccess.queues.length === 0) {
    return servicePoints
  }

  // Filter service points based on allowed queues
  return servicePoints.filter(sp => roleAccess.queues.includes(sp))
}
