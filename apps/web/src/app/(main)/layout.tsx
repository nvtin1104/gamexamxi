'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useLoginModal } from '@/store/loginModal'
import { LoginModal } from '@/components/LoginModal'
import { cn, formatPoints } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'FEED', icon: '🏠' },
  { href: '/games', label: 'GAMES', icon: '🎮' },
  { href: '/groups', label: 'GROUPS', icon: '👥' },
  { href: '/leaderboard', label: 'RANK', icon: '🏆' },
  { href: '/shop', label: 'SHOP', icon: '🛒' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const { open: openLogin } = useLoginModal()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top Nav */}
      <header className="bg-dark text-white border-b-brutal border-dark sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-wider">
            GAME<span className="text-secondary">XAMXI</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side: user info or login button */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="font-mono text-xs text-secondary font-bold">
                    {formatPoints(user.points ?? 0)} PTS
                  </span>
                  <span className="font-mono text-xs text-accent">
                    🔥{user.loginStreak ?? 0}
                  </span>
                </div>
                <Link
                  href={`/profile/${user.username}`}
                  className="font-mono text-xs font-bold uppercase tracking-wider border border-white/30 px-3 py-1 hover:bg-white/10"
                >
                  {user.username?.slice(0, 8)}
                </Link>
              </>
            ) : (
              <button
                onClick={openLogin}
                className="font-mono text-xs font-bold uppercase tracking-wider bg-primary text-white px-4 py-1.5 hover:bg-primary/90 transition-colors border border-primary"
              >
                LOGIN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark border-t-brutal border-dark flex z-50">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors',
              pathname === item.href
                ? 'bg-primary text-white'
                : 'text-white/60 hover:text-white'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Global Login Modal */}
      <LoginModal />
    </div>
  )
}
