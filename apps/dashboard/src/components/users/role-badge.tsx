import { Badge } from '@/components/ui/badge'
import type { AccountRole, UserRole } from '@gamexamxi/shared'

const roleColorMap: Record<UserRole, string> = {
  root:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
  staff: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800',
  kol:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
  mod:   'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  user:  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
}

const roleLabelMap: Record<UserRole, string> = {
  root:  'Root',
  staff: 'Staff',
  kol:   'KOL',
  mod:   'Mod',
  user:  'Người dùng',
}

const accountRoleColorMap: Record<AccountRole, string> = {
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  user:  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
}

interface RoleBadgeProps {
  role: UserRole
}

interface AccountRoleBadgeProps {
  accountRole: AccountRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge className={roleColorMap[role]} variant="outline">
      {roleLabelMap[role]}
    </Badge>
  )
}

export function AccountRoleBadge({ accountRole }: AccountRoleBadgeProps) {
  if (accountRole !== 'admin') return null
  return (
    <Badge className={accountRoleColorMap[accountRole]} variant="outline">
      Admin
    </Badge>
  )
}
