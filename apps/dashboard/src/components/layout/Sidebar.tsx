'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  UsersRound,
  Receipt,
  LogOut,
  Zap,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/events', label: 'Events', icon: Gamepad2 },
  { href: '/groups', label: 'Groups', icon: UsersRound },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/permission-groups', label: 'Perm Groups', icon: ShieldCheck },
  { href: '/uploads', label: 'Uploads', icon: Upload },
]

export function Sidebar() {
  const pathname = usePathname()
  const { token, user, clearAuth } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    if (token) {
      try { await authApi.logout(token) } catch {}
    }
    clearAuth()
    router.push('/login')
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Zap className="h-5 w-5 text-brand" />
        <span className="font-bold tracking-tight">GameXamXi</span>
        <span className="ml-auto rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
            {user?.username?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.username ?? 'Admin'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
