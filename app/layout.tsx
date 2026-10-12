import type { ReactNode } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/auth-context"
import { AppThemeShell } from "@/components/app-theme-shell"
import { buildThemeInitScript } from "@/lib/theme-init-script"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body suppressHydrationWarning>
        <AppThemeShell>
          <AuthProvider>{children}</AuthProvider>
        </AppThemeShell>
      </body>
    </html>
  )
}
