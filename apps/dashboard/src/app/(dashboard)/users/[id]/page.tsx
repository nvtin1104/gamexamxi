'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, AlertTriangle, Trophy, Flame, ShieldCheck,
  Calendar, Clock, Key, History, Users, ChevronRight, Zap,
  CheckCircle2, XCircle, ShieldAlert, Crown, BadgeCheck, Mail,
  Fingerprint, User as UserIcon, Coins, Plus, Minus, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ALL_PERMISSIONS } from '@gamexamxi/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Config ───────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  root:      'bg-red-100 text-red-800 border-red-200',
  admin:     'bg-purple-100 text-purple-800 border-purple-200',
  moderator: 'bg-blue-100 text-blue-800 border-blue-200',
  user:      'bg-slate-100 text-slate-700 border-slate-200',
}

const ROLE_LABELS: Record<string, string> = {
  root:      'Root',
  admin:     'Admin',
  moderator: 'Moderator',
  user:      'User',
}

const PERM_GROUPS: Record<string, string[]> = {
  'Sự kiện':    ['events:read', 'events:create', 'events:resolve', 'events:manage', 'events:delete'],
  'Nhóm':       ['groups:read', 'groups:create', 'groups:manage'],
  'Người dùng': ['users:read', 'users:manage', 'users:suspend'],
  'Cửa hàng':   ['shop:purchase', 'shop:manage'],
  'Điểm':       ['points:grant'],
  'File':       ['uploads:manage'],
  'Nhiệm vụ':   ['quests:create', 'quests:manage'],
  'Admin':      ['admin:panel', 'admin:root'],
}

const TX_COLORS: Record<string, string> = {
  PREDICTION_WIN:  'text-green-500',
  ADMIN_GRANT:     'text-blue-500',
  WELCOME_BONUS:   'text-emerald-500',
  ADMIN_DEDUCT:    'text-red-500',
  SHOP_PURCHASE:   'text-orange-500',
  LOGIN_STREAK:    'text-yellow-500',
  QUEST_COMPLETE:  'text-teal-500',
  ACHIEVEMENT:     'text-purple-500',
}

type Tab = 'overview' | 'permissions' | 'transactions'

// ─── Points Dialog ────────────────────────────────────────────

function GrantPointsDialog({
  open, onClose, userId, token, onDone,
}: {
  open: boolean
  onClose: () => void
  userId: string
  token: string
  onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState<'ADMIN_GRANT' | 'ADMIN_DEDUCT'>('ADMIN_GRANT')

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateUserPoints(userId, { amount: Number(amount), note, type }, token),
    onSuccess: () => {
      toast.success(type === 'ADMIN_GRANT' ? 'Đã cộng điểm thành công' : 'Đã trừ điểm thành công')
      setAmount('')
      setNote('')
      onDone()
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Thao tác thất bại'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="Điều chỉnh điểm" className="max-w-sm">
      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          {(['ADMIN_GRANT', 'ADMIN_DEDUCT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                type === t
                  ? t === 'ADMIN_GRANT'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-muted text-muted-foreground hover:border-muted-foreground',
              )}
            >
              {t === 'ADMIN_GRANT' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {t === 'ADMIN_GRANT' ? 'Cộng điểm' : 'Trừ điểm'}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Số điểm</Label>
          <Input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số điểm..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Ghi chú <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do điều chỉnh..."
          />
        </div>
      </div>
      <div className="flex gap-2 px-5 pb-5 justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Huỷ</Button>
        <Button
          size="sm"
          disabled={!amount || Number(amount) <= 0 || mutation.isPending}
          variant={type === 'ADMIN_GRANT' ? 'default' : 'destructive'}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xác nhận'}
        </Button>
      </div>
    </Dialog>
  )
}

// ─── Permission Toggle Row ────────────────────────────────────

function PermissionRow({
  perm, effective, custom, role,
}: {
  perm: string
  effective: boolean
  custom: boolean
  role: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
      effective ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-muted/30',
    )}>
      {effective
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        : <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      }
      <span className={cn('flex-1 font-mono text-xs', effective ? 'text-foreground' : 'text-muted-foreground')}>
        {perm}
      </span>
      <div className="flex gap-1.5 shrink-0">
        {role && (
          <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-bold">
            ROLE
          </span>
        )}
        {custom && (
          <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-bold">
            CUSTOM
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false)

  // ─── Queries ──────────────────────────────────────────────

  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUser(id, token!),
    enabled: !!token && !!id,
  })

  const { data: permData, isLoading: permLoading } = useQuery({
    queryKey: ['admin-user-permissions', id],
    queryFn: () => adminApi.getUserPermissions(id, token!),
    enabled: !!token && !!id && tab === 'permissions',
  })

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['admin-user-groups', id],
    queryFn: () => adminApi.getUserGroups(id, token!),
    enabled: !!token && !!id && tab === 'permissions',
  })

  const user = userData?.data
  const perms = permData?.data
  const groups = groupData?.data ?? []

  const tabs: { key: Tab; label: string; icon: React.FC<any> }[] = [
    { key: 'overview',     label: 'Tổng quan',   icon: UserIcon },
    { key: 'permissions',  label: 'Phân quyền',  icon: Key },
    { key: 'transactions', label: 'Giao dịch',   icon: History },
  ]

  // ─── Loading ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-72 bg-muted rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p>Không tìm thấy người dùng này</p>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/users')}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Người dùng
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{user.username}</span>
      </div>

      {/* ── Hero Card ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-none shadow-xl">
        {/* Gradient banner */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        <CardContent className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-background bg-muted overflow-hidden shadow-xl">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const el = e.currentTarget
                      el.style.display = 'none'
                      el.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={cn(
                  'absolute inset-0 flex items-center justify-center text-2xl font-black text-primary',
                  user.avatar ? 'hidden' : '',
                )}>
                  {user.username[0]?.toUpperCase()}
                </div>
              </div>
              {/* Online indicator */}
              <div className={cn(
                'absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background',
                user.status === 'active' ? 'bg-green-500' : 'bg-red-400',
              )} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setPointsDialogOpen(true)}
              >
                <Coins className="h-4 w-4" /> Điểm
              </Button>
              <Button
                size="sm"
                className="gap-1.5 shadow-md shadow-primary/30"
                onClick={() => router.push(`/users/${id}/edit`)}
              >
                <Edit2 className="h-4 w-4" /> Chỉnh sửa
              </Button>
            </div>
          </div>

          {/* Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black">{user.username}</h1>
              {user.name && (
                <span className="text-muted-foreground font-medium">{user.name}</span>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={cn('border', ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
                <Badge
                  variant={user.status === 'active' ? 'success' : 'destructive'}
                >
                  {user.status}
                </Badge>
                {user.account === 'premium' && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 border-0">
                    <Crown className="mr-1 h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Fingerprint className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{user.id}</span>
              </span>
              {user.lastLoginAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Lần cuối: {new Date(user.lastLoginAt).toLocaleDateString('vi-VN')}
                </span>
              )}
              {user.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {user.bio && (
              <p className="text-sm text-muted-foreground italic mt-1">{user.bio}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tab Bar ───────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-background shadow-md text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: Overview
      ════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Số dư điểm', value: user.points, icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Tổng tích lũy', value: user.totalPointsEarned, icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { label: 'Cấp độ', value: `Lv. ${user.level}`, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Chuỗi ngày', value: user.loginStreak, icon: Flame, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((s, i) => (
              <Card key={i} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                    <s.icon className={cn('h-5 w-5', s.color)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">{s.label}</p>
                  <p className={cn('text-2xl font-black mt-0.5 font-mono', s.color)}>
                    {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* XP Progress */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Kinh nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">XP hiện tại</span>
                <span className="font-black font-mono text-primary">{user.experience?.toLocaleString() ?? 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((user.experience ?? 0) % 1000) / 10)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Permissions
      ════════════════════════════════════════════════════════ */}
      {tab === 'permissions' && (
        <div className="space-y-5">
          {(permLoading || groupLoading) ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
            </div>
          ) : perms && (
            <>
              {/* Legend */}
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-bold">ROLE</span>
                  Do vai trò ({perms.role})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-bold">CUSTOM</span>
                  Tuỳ chỉnh thêm
                </span>
              </div>

              {/* Permissions grouped */}
              {Object.entries(PERM_GROUPS).map(([groupName, permsInGroup]) => {
                const anyRelevant = permsInGroup.some(p =>
                  perms.effectivePermissions.includes(p) ||
                  perms.rolePermissions.includes(p) ||
                  perms.customPermissions.includes(p),
                )
                if (!anyRelevant) return null
                return (
                  <Card key={groupName} className="border-none shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                        {groupName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 grid gap-1">
                      {permsInGroup.map((perm) => (
                        <PermissionRow
                          key={perm}
                          perm={perm}
                          effective={perms.effectivePermissions.includes(perm)}
                          role={perms.rolePermissions.includes(perm)}
                          custom={perms.customPermissions.includes(perm)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )
              })}

              {/* Permission Groups */}
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Nhóm phân quyền
                    <Badge variant="secondary" className="ml-auto">{groups.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa được gán vào nhóm phân quyền nào
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {groups.map((g: any) => (
                        <div key={g.groupId} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Key className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm">{g.name}</p>
                            {g.description && (
                              <p className="text-xs text-muted-foreground">{g.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {g.permissions.slice(0, 5).map((p: string) => (
                                <span key={p} className="text-[10px] font-mono bg-background border px-1.5 py-0.5 rounded">
                                  {p}
                                </span>
                              ))}
                              {g.permissions.length > 5 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{g.permissions.length - 5} nữa
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit link */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push(`/users/${id}/edit?tab=permissions`)}
                >
                  <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa phân quyền
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: Transactions
      ════════════════════════════════════════════════════════ */}
      {tab === 'transactions' && (
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4" /> Lịch sử điểm
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!user.transactions || user.transactions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">Chưa có giao dịch nào</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Số điểm</TableHead>
                    <TableHead className="text-right">Số dư sau</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className={cn(
                          'text-xs font-bold uppercase font-mono',
                          TX_COLORS[tx.type] ?? 'text-foreground',
                        )}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description ?? '—'}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right font-mono font-black text-sm',
                        tx.amount > 0 ? 'text-green-500' : 'text-red-500',
                      )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {tx.balanceAfter?.toLocaleString() ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Grant Points Dialog ────────────────────────────── */}
      <GrantPointsDialog
        open={pointsDialogOpen}
        onClose={() => setPointsDialogOpen(false)}
        userId={id}
        token={token!}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['admin-user', id] })}
      />
    </div>
  )
}
