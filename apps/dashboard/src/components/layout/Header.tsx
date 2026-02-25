'use client'
import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/overview': 'Overview',
  '/users': 'User Management',
  '/events': 'Events',
  '/groups': 'Groups',
  '/transactions': 'Transactions',
}

export function Header() {
  const pathname = usePathname()
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Dashboard'

  return (
    <header className="flex h-16 items-center border-b bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
