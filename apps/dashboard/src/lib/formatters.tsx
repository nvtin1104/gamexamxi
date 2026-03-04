import type { UserRole, UserStatus } from '@gamexamxi/shared'
import { Badge } from '@/components/ui/badge'

// ── Date ─────────────────────────────────────────────────────────────────────

const dtFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dtTimeFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | number | null | undefined): string {
  if (!value) return '—'
  return dtFmt.format(new Date(value))
}

export function formatDateTime(value: string | number | null | undefined): string {
  if (!value) return '—'
  return dtTimeFmt.format(new Date(value))
}

// ── Role Badge ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  admin: { label: 'Quản trị viên', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  mod: { label: 'Kiểm duyệt viên', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  user: { label: 'Người dùng', className: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.user
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<UserStatus, { label: string; className: string }> = {
  active: { label: 'Hoạt động', className: 'bg-green-100 text-green-800 border-green-200' },
  banned: { label: 'Bị cấm', className: 'bg-red-100 text-red-800 border-red-200' },
  block: { label: 'Bị khóa', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

// ── Permission chip ───────────────────────────────────────────────────────────

export function PermissionChip({ perm }: { perm: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {perm}
    </Badge>
  )
}
