"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/AppSidebar"
import { Header } from "@/components/Header"
import { initAuthStore, $isAuthenticated, $authLoading } from "@/stores/auth"
import { useStore } from "@nanostores/react"

interface DashboardShellProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function DashboardShell({
  title,
  defaultOpen = true,
  children,
}: DashboardShellProps) {
  const isAuthenticated = useStore($isAuthenticated)
  const authLoading = useStore($authLoading)

  React.useEffect(() => {
    initAuthStore().then(() => {
      if (!$isAuthenticated.get()) {
        window.location.href = "/login"
      }
    })
  }, [])

  // Show nothing while checking auth to avoid layout flash
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
