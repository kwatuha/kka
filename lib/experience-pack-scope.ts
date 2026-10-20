import type { NavigationCategory, NavigationItem } from "./navigation"
import {
  applyDhaCertScopeToCategories,
  applyDhaCertScopeToItems,
  isDhaCertExperiencePack,
  isDhaCertPathScopedDown,
} from "./dha-cert-scope"
import {
  applyTelemedicineScopeToCategories,
  applyTelemedicineScopeToItems,
  isPathScopedDown as isTelemedicinePathScopedDown,
  isTelemedicineExperiencePack,
} from "./telemedicine-scope"

export function applyExperiencePackToCategories(
  categories: NavigationCategory[]
): NavigationCategory[] {
  return applyDhaCertScopeToCategories(applyTelemedicineScopeToCategories(categories))
}

export function applyExperiencePackToItems(items: NavigationItem[]): NavigationItem[] {
  return applyDhaCertScopeToItems(applyTelemedicineScopeToItems(items))
}

export function isExperiencePackPathScopedDown(pathname: string): boolean {
  return isTelemedicinePathScopedDown(pathname) || isDhaCertPathScopedDown(pathname)
}

/** Where to send users who hit a scoped-down deep link. */
export function getExperiencePackScopeRedirectPath(): string {
  if (isTelemedicineExperiencePack()) return "/telemedicine"
  if (isDhaCertExperiencePack()) return "/hub"
  return "/"
}
