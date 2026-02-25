'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuthStore } from '@/store/auth'

function hasAdminAccess(user: { role?: string; customPermissions?: string[] | null } | null): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'root') return true
  if (user.customPermissions?.includes('admin:panel')) return true
  return false
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Wait until Zustand has rehydrated from localStorage before doing anything
    if (!_hasHydrated) return

    if (!isAuthenticated || !hasAdminAccess(user)) {
      router.replace('/login')
    }
  }, [_hasHydrated, isAuthenticated, user, router])

  // Show spinner until hydration completes (prevents flash redirect)
  if (!_hasHydrated || !isAuthenticated || !hasAdminAccess(user)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
