"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"

export function DynamicLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-64 w-[calc(100%-16rem)]">
        <Header />
        <main className="p-6 bg-background rounded-tl-xl shadow-inner premium-container">{children}</main>
      </div>
    </div>
  )
}
