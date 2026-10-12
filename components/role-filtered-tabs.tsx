"use client"

import React, { useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRoleMenuAccess } from "@/lib/hooks/use-role-menu-access"
import { filterTabs, isTabAllowed } from "@/lib/role-menu-filter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TabItem {
  value: string
  label: string
}

interface RoleFilteredTabsProps {
  tabs: TabItem[]
  pagePath: string
  /** Uncontrolled: initial tab (only used when value is not provided) */
  defaultValue?: string
  /** Controlled: current tab (when provided, tab is driven by this and onValueChange) */
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper component that filters tabs based on role permissions
 * Usage:
 * <RoleFilteredTabs tabs={[...]} pagePath="/patients/[id]">
 *   <TabsContent value="overview">...</TabsContent>
 *   <TabsContent value="vitals">...</TabsContent>
 * </RoleFilteredTabs>
 */
export function RoleFilteredTabs({
  tabs,
  pagePath,
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: RoleFilteredTabsProps) {
  const { user } = useAuth()
  const { menuAccess, loading: menuLoading } = useRoleMenuAccess(user?.id)

  // Normalize page path for matching (handle dynamic routes)
  const normalizedPagePath = pagePath.replace(/\[.*?\]/g, '*')

  // Filter tabs based on role access
  // While loading, show all tabs to prevent flickering
  // Once loaded, only show explicitly allowed tabs
  const allowedTabs = menuLoading
    ? tabs // Show all while loading to prevent flickering
    : filterTabs(tabs, normalizedPagePath, menuAccess)

  // Filter children (TabsContent) to only show allowed tabs
  // While loading, show all to prevent flickering
  // Once loaded, show tabs based on role configuration (permissive by default)
  const filteredChildren = React.Children.toArray(children).filter((child: any) => {
    if (menuLoading) return true // Show all while loading to prevent flickering
    if (!menuAccess) return true // If no access data, show all (permissive default)
    const tabValue = child?.props?.value
    if (!tabValue) return true // Allow non-tab children
    return isTabAllowed(normalizedPagePath, tabValue, menuAccess)
  })

  // Ensure default value is allowed
  const safeDefaultValue = defaultValue && allowedTabs.some(t => t.value === defaultValue)
    ? defaultValue
    : allowedTabs[0]?.value

  // Controlled: value must be allowed; fallback to first allowed tab
  const safeValue = controlledValue && allowedTabs.some(t => t.value === controlledValue)
    ? controlledValue
    : allowedTabs[0]?.value

  const isControlled = controlledValue !== undefined && controlledValue !== null

  // Primitive key so effect deps stay stable when the tab *set* is unchanged
  const allowedTabKey = allowedTabs.map((t) => t.value).join("|")

  // When role menu finishes loading, the allowed tab list can shrink. If the parent still holds a
  // controlled value that is no longer allowed, Radix can show the wrong panel and tab content
  // effects may not run — sync parent to a valid tab.
  useEffect(() => {
    if (!isControlled || !onValueChange || menuLoading) return
    if (allowedTabs.length === 0) return
    const stillAllowed = allowedTabs.some((t) => t.value === controlledValue)
    if (!stillAllowed) {
      onValueChange(allowedTabs[0].value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allowedTabKey tracks allowed tab set changes
  }, [isControlled, controlledValue, menuLoading, allowedTabKey, onValueChange])

  return (
    <Tabs
      {...(isControlled
        ? { value: safeValue, onValueChange }
        : { defaultValue: safeDefaultValue, onValueChange }
      )}
      className={className}
    >
      <TabsList className="flex flex-wrap w-full h-auto p-1 gap-1">
        {allowedTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-grow py-2 px-3">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {filteredChildren}
    </Tabs>
  )
}

/**
 * Hook to check if a specific tab is allowed for the current user
 */
export function useTabAccess(pagePath: string, tabId: string): boolean {
  const { user } = useAuth()
  const { menuAccess, loading } = useRoleMenuAccess(user?.id)

  if (loading || !menuAccess) {
    return true // Allow by default while loading
  }

  const normalizedPagePath = pagePath.replace(/\[.*?\]/g, '*')
  return isTabAllowed(normalizedPagePath, tabId, menuAccess)
}
