import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="ml-auto flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-64 pl-8"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
          A
        </div>
      </div>
    </header>
  )
}
