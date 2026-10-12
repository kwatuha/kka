import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"

export default function DisplayLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="transelgon-display-theme"
      >
        {children}
      </ThemeProvider>
    </div>
  )
}
