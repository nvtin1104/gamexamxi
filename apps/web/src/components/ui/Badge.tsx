import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'dark' | 'success' | 'warning' | 'danger'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface text-dark border-dark',
  primary: 'bg-primary text-white border-primary',
  secondary: 'bg-secondary text-dark border-dark',
  accent: 'bg-accent text-dark border-dark',
  dark: 'bg-dark text-white border-dark',
  success: 'bg-green-500 text-white border-green-700',
  warning: 'bg-yellow-400 text-dark border-yellow-600',
  danger: 'bg-red-500 text-white border-red-700',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge-brutal', variants[variant], className)}>
      {children}
    </span>
  )
}
