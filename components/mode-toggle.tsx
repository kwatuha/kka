"use client"

import * as React from "react"
import { Check, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { APP_THEMES, DEFAULT_APP_THEME, type AppThemeId } from "@/lib/app-themes"

const themeIcons: Record<AppThemeId, React.ReactNode> = {
  "professional-blue": <Palette className="h-[1.2rem] w-[1.2rem]" />,
  dark: <Moon className="h-[1.2rem] w-[1.2rem]" />,
  light: <Sun className="h-[1.2rem] w-[1.2rem]" />,
}

export function ModeToggle({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant={variant} size="icon">
        <Palette className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Choose theme</span>
      </Button>
    )
  }

  const activeTheme = (theme === "system" ? resolvedTheme : theme) as AppThemeId | undefined
  const currentThemeId =
    activeTheme && APP_THEMES.some((t) => t.id === activeTheme) ? activeTheme : DEFAULT_APP_THEME

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon">
          {themeIcons[currentThemeId]}
          <span className="sr-only">Choose theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {APP_THEMES.map((item) => (
          <DropdownMenuItem key={item.id} onClick={() => setTheme(item.id)} className="gap-2">
            {themeIcons[item.id]}
            <div className="flex flex-1 flex-col">
              <span>{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
            {currentThemeId === item.id ? <Check className="h-4 w-4 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
