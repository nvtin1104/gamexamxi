import * as React from 'react'
import type { UserProfile } from '@gamexamxi/shared'
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  Star,
  Zap,
  Coins,
  Flame,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RoleBadge, StatusBadge, PermissionChip, formatDate, formatDateTime } from '@/lib/formatters'

// ── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface UserDetailCardProps {
  profile: UserProfile
}

export function UserDetailCard({ profile }: UserDetailCardProps) {
  const xp = profile.stats?.currentXp ?? profile.experience ?? 0
  const level = profile.stats?.currentLevel ?? profile.level ?? 1
  const balance = profile.points?.balance ?? profile.pointsBalance ?? 0
  const pointLimit = profile.points?.pointLimit ?? 10000

  // XP progress within the current level (simple linear model: 100 xp per level)
  const xpForNextLevel = level * 100
  const xpProgress = Math.min(100, Math.round((xp % xpForNextLevel) / xpForNextLevel * 100))

  return (
    <div className="space-y-4">
      {/* ── Identity card ───────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-2xl font-bold text-primary">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Status dot */}
              <span
                className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                  profile.status === 'active'
                    ? 'bg-green-500'
                    : profile.status === 'banned'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
            </div>

            {/* Name + badges */}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-tight truncate">{profile.name}</h2>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{profile.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <RoleBadge role={profile.role} />
                <StatusBadge status={profile.status} />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* ── Contact / meta info ─────────────────────────────── */}
          <div className="divide-y divide-border/50">
            <StatRow icon={Mail} label="Email" value={profile.email} />
            {profile.phone && (
              <StatRow icon={Phone} label="Điện thoại" value={profile.phone} />
            )}
            <StatRow icon={Calendar} label="Ngày tham gia" value={formatDate(profile.createdAt)} />
            <StatRow
              icon={Clock}
              label="Đăng nhập lần cuối"
              value={formatDateTime(profile.lastLoginAt)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── XP / Level card ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tiến độ</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Cấp {level}</span>
            </div>
            <span className="text-xs text-muted-foreground">{xp} / {xpForNextLevel} XP</span>
          </div>
          {/* XP progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>

          <div className="divide-y divide-border/50">
            <StatRow icon={Zap} label="XP" value={xp.toLocaleString()} />
            <StatRow
              icon={Coins}
              label="Điểm"
              value={
                <span>
                  <span className="text-foreground">{balance.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs"> / {pointLimit.toLocaleString()}</span>
                </span>
              }
            />
            <StatRow icon={Flame} label="Chuỗi đăng nhập" value={`${profile.loginStreak ?? 0} ngày`} />
          </div>
        </CardContent>
      </Card>

      {/* ── Permission groups ────────────────────────────────────── */}
      {profile.groups.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Nhóm quyền hạn
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            {profile.groups.map((g) => (
              <div key={g.id} className="rounded-md border bg-muted/30 p-2.5">
                <p className="text-sm font-medium mb-1.5">{g.name}</p>
                <div className="flex flex-wrap gap-1">
                  {g.permissions.map((p) => (
                    <PermissionChip key={p} perm={p} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
