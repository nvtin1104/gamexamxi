import { Badge } from '@/components/ui/badge'
import type { UserStatus } from '@gamexamxi/shared'

const colorMap: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
  banned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
  block: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
}

const labelMap: Record<UserStatus, string> = {
  active: 'Hoạt động',
  banned: 'Bị cấm',
  block: 'Bị khóa',
}

interface StatusBadgeProps {
  status: UserStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={colorMap[status]} variant="outline">
      {labelMap[status]}
    </Badge>
  )
}
