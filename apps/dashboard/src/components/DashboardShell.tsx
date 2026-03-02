"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/AppSidebar"
import { Header } from "@/components/Header"

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
