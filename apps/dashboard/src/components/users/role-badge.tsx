import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@gamexamxi/shared'

const colorMap: Record<UserRole, string> = {
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  mod: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
}

const labelMap: Record<UserRole, string> = {
  admin: 'Admin',
  mod: 'Mod',
  user: 'Người dùng',
}

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge className={colorMap[role]} variant="outline">
      {labelMap[role]}
    </Badge>
  )
}
