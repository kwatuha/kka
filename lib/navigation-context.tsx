"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { getCategoryByPath, navigationCategories } from "./navigation"

interface NavigationContextType {
  activeCategory: string
  setActiveCategory: (categoryId: string) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

function pathMatchesNavItem(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function pathBelongsToCategory(pathname: string, categoryId: string): boolean {
  const category = navigationCategories.find((cat) => cat.id === categoryId)
  if (!category) return false
  return category.items.some((item) => pathMatchesNavItem(pathname, item.href))
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [activeCategory, setActiveCategory] = useState("overview")
  const isManualUpdateRef = useRef(false)
  const activeCategoryRef = useRef(activeCategory)

  useEffect(() => {
    activeCategoryRef.current = activeCategory
  }, [activeCategory])

  const handleSetActiveCategory = (categoryId: string) => {
    isManualUpdateRef.current = true
    setActiveCategory(categoryId)
    activeCategoryRef.current = categoryId
    setTimeout(() => {
      isManualUpdateRef.current = false
    }, 300)
  }

  useEffect(() => {
    if (isManualUpdateRef.current) {
      return
    }

    const category = getCategoryByPath(pathname)
    const belongsToCurrent = pathBelongsToCategory(pathname, activeCategoryRef.current)

    if (!belongsToCurrent || category.id !== activeCategoryRef.current) {
      setActiveCategory(category.id)
      activeCategoryRef.current = category.id
    }
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ activeCategory, setActiveCategory: handleSetActiveCategory }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
