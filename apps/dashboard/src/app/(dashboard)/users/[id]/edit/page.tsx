'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ChevronRight, Save, Loader2, Key, Users, ShieldAlert,
  UserCog, AlertTriangle, Trash2, ShieldOff, BadgeCheck, X, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { AvatarPicker } from '@/components/ui/AvatarPicker'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { PERMISSIONS, ALL_PERMISSIONS } from '@gamexamxi/shared'
import type { User } from '@gamexamxi/shared'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Config ──────────────────────────────────────────────────

const PERM_GROUPS: Record<string, { key: string; label: string }[]> = {
  'Sự kiện': [
    { key: 'events:read',    label: 'Xem sự kiện' },
    { key: 'events:create',  label: 'Tạo sự kiện' },
    { key: 'events:resolve', label: 'Kết thúc sự kiện của mình' },
    { key: 'events:manage',  label: 'Quản lý mọi sự kiện' },
    { key: 'events:delete',  label: 'Xóa sự kiện' },
  ],
  'Nhóm': [
    { key: 'groups:read',   label: 'Xem nhóm' },
    { key: 'groups:create', label: 'Tạo nhóm' },
    { key: 'groups:manage', label: 'Quản lý mọi nhóm' },
  ],
  'Người dùng': [
    { key: 'users:read',    label: 'Xem người dùng' },
    { key: 'users:manage',  label: 'Chỉnh sửa người dùng khác' },
    { key: 'users:suspend', label: 'Tạm khóa / cấm tài khoản' },
  ],
  'Cửa hàng': [
    { key: 'shop:purchase', label: 'Mua vật phẩm' },
    { key: 'shop:manage',   label: 'Quản lý cửa hàng' },
  ],
  'File & Điểm': [
    { key: 'uploads:manage', label: 'Quản lý file' },
    { key: 'points:grant',   label: 'Cộng/trừ điểm thủ công' },
    { key: 'quests:create',  label: 'Tạo nhiệm vụ' },
    { key: 'quests:manage',  label: 'Quản lý nhiệm vụ' },
  ],
  'Quản trị hệ thống': [
    { key: 'admin:panel', label: 'Truy cập trang admin' },
    { key: 'admin:root',  label: 'Quyền root (nguy hiểm)' },
  ],
}

// ─── Single Permission Toggle ─────────────────────────────────

function PermToggle({
  permKey, label, checked, roleHas, onChange, disabled,
}: {
  permKey: string
  label: string
  checked: boolean
  roleHas: boolean
  onChange: (key: string, val: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-colors border',
        checked ? 'bg-primary/5 border-primary/30' : 'border-transparent hover:bg-muted/50',
        roleHas && 'opacity-60 pointer-events-none',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <div
        className={cn(
          'h-5 w-5 rounded border-2 flex items-center justify-center transition-all shrink-0',
          checked || roleHas
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40 bg-transparent',
        )}
      >
        {(checked || roleHas) && (
          <svg viewBox="0 0 10 10" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1.5 5l2.5 3 5-6" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{permKey}</p>
      </div>
      {roleHas && (
        <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 font-bold shrink-0">
          ROLE
        </span>
      )}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked || roleHas}
        onChange={(e) => !roleHas && onChange(permKey, e.target.checked)}
        disabled={roleHas || disabled}
      />
    </label>
  )
}

// ─── Tab type ─────────────────────────────────────────────────

type Tab = 'info' | 'permissions'

// ─── Main Edit Page ───────────────────────────────────────────

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { token } = useAuthStore()

  const initialTab = searchParams.get('tab') === 'permissions' ? 'permissions' : 'info'
  const [tab, setTab] = useState<Tab>(initialTab as Tab)

  // ─ Form state ─────────────────────────────────────────────
  const [form, setForm] = useState<Partial<User> & { avatar?: string | null }>({})
  const [initDone, setInitDone] = useState(false)

  // ─ Permissions state ──────────────────────────────────────
  const [customPerms, setCustomPerms] = useState<string[]>([])
  const [permsInitDone, setPermsInitDone] = useState(false)

  // ─ Group assignment state ─────────────────────────────────
  const [groupSearchOpen, setGroupSearchOpen] = useState(false)
  const [removingGroup, setRemovingGroup] = useState<string | null>(null)
  const [addingGroup, setAddingGroup] = useState<string | null>(null)

  // ─── Queries ──────────────────────────────────────────────

  const { data: userData, isLoading } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUser(id, token!),
    enabled: !!token && !!id,
  })

  const { data: permData } = useQuery({
    queryKey: ['admin-user-permissions', id],
    queryFn: () => adminApi.getUserPermissions(id, token!),
    enabled: !!token && !!id,
  })

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['admin-user-groups', id],
    queryFn: () => adminApi.getUserGroups(id, token!),
    enabled: !!token && !!id && tab === 'permissions',
  })

  const { data: allGroupsData } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => adminApi.listPermissionGroups(token!),
    enabled: !!token && groupSearchOpen,
  })

  const user = userData?.data
  const perms = permData?.data
  const assignedGroups = groupData?.data ?? []
  const allGroups = allGroupsData?.data ?? []
  const assignedGroupIds = new Set(assignedGroups.map((g: any) => g.groupId))

  // Initialise form when data arrives
  useEffect(() => {
    if (user && !initDone) {
      setForm({
        username: user.username,
        email: user.email,
        name: user.name ?? '',
        bio: user.bio ?? '',
        role: user.role,
        status: user.status,
        account: user.account,
        avatar: user.avatar,
      })
      setInitDone(true)
    }
  }, [user, initDone])

  useEffect(() => {
    if (perms && !permsInitDone) {
      setCustomPerms(perms.customPermissions)
      setPermsInitDone(true)
    }
  }, [perms, permsInitDone])

  // ─── Mutations ────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateUser(id, form as Partial<User>, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Cập nhật thông tin thành công')
      router.push(`/users/${id}`)
    },
    onError: (err: any) => toast.error(err.message || 'Cập nhật thất bại'),
  })

  const permsMutation = useMutation({
    mutationFn: () =>
      adminApi.updateUserPermissions(id, customPerms, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-permissions', id] })
      toast.success('Cập nhật phân quyền thành công')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi cập nhật quyền'),
  })

  const assignGroupMutation = useMutation({
    mutationFn: (groupId: string) => adminApi.assignUserGroup(id, groupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-groups', id] })
      setGroupSearchOpen(false)
      toast.success('Đã gán nhóm phân quyền')
    },
    onError: (err: any) => toast.error(err.message || 'Gán nhóm thất bại'),
  })

  const removeGroupMutation = useMutation({
    mutationFn: (groupId: string) => adminApi.unassignUserGroup(id, groupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-groups', id] })
      setRemovingGroup(null)
      toast.success('Đã gỡ nhóm phân quyền')
    },
    onError: (err: any) => toast.error(err.message || 'Gỡ nhóm thất bại'),
  })

  // ─── Helpers ──────────────────────────────────────────────

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const togglePerm = useCallback((key: string, checked: boolean) => {
    setCustomPerms((prev) =>
      checked ? [...prev, key] : prev.filter((p) => p !== key),
    )
  }, [])

  // ─── Loading fallback ─────────────────────────────────────

  if (isLoading || !initDone) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-40" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-72 bg-muted rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 opacity-30" />
        <p>Không tìm thấy người dùng</p>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </div>
    )
  }

  const rolePerms = new Set(perms?.rolePermissions ?? [])

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/users')}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Người dùng
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button
            onClick={() => router.push(`/users/${id}`)}
            className="hover:text-foreground transition-colors"
          >
            {user.username}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Chỉnh sửa</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/users/${id}`)}
        >
          Huỷ
        </Button>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        {(
          [
            { key: 'info' as Tab, label: 'Thông tin', icon: UserCog },
            { key: 'permissions' as Tab, label: 'Phân quyền', icon: Key },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
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

      {/* ══════════════════════════════════════════════════════
          TAB: Info
      ══════════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <div className="space-y-5">
          {/* ─ Avatar ─ */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Ảnh đại diện</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarPicker
                value={form.avatar}
                onChange={(url) => setField('avatar', url)}
                token={token!}
                entityId={id}
                username={user.username}
                size="lg"
              />
            </CardContent>
          </Card>

          {/* ─ Basic fields ─ */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                  <Input
                    id="username"
                    value={form.username ?? ''}
                    onChange={(e) => setField('username', e.target.value)}
                    placeholder="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Tên hiển thị</Label>
                  <Input
                    id="name"
                    value={form.name ?? ''}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-1.5" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={form.bio ?? ''}
                  onChange={(e) => setField('bio', e.target.value)}
                  placeholder="Giới thiệu bản thân..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* ─ Account settings ─ */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cài đặt tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Vai trò</Label>
                <Select
                  value={form.role ?? 'user'}
                  onValueChange={(v) => setField('role', v as User['role'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="root">Root</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select
                  value={form.status ?? 'active'}
                  onValueChange={(v) => setField('status', v as User['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Loại tài khoản</Label>
                <Select
                  value={form.account ?? 'standard'}
                  onValueChange={(v) => setField('account', v as User['account'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ─ Save ─ */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push(`/users/${id}`)}>
              Huỷ
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="gap-2 shadow-lg shadow-primary/30"
            >
              {updateMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
                : <><Save className="h-4 w-4" /> Lưu thay đổi</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: Permissions
      ══════════════════════════════════════════════════════ */}
      {tab === 'permissions' && (
        <div className="space-y-5">
          {/* Custom permissions by group */}
          {Object.entries(PERM_GROUPS).map(([groupName, permsInGroup]) => (
            <Card key={groupName} className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  {groupName}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                {permsInGroup.map(({ key, label }) => (
                  <PermToggle
                    key={key}
                    permKey={key}
                    label={label}
                    checked={customPerms.includes(key)}
                    roleHas={rolePerms.has(key)}
                    onChange={togglePerm}
                  />
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Save custom perms */}
          <div className="flex justify-end gap-3">
            <Button
              disabled={permsMutation.isPending}
              onClick={() => permsMutation.mutate()}
              className="gap-2 shadow-lg shadow-primary/30"
            >
              {permsMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
                : <><Save className="h-4 w-4" /> Lưu phân quyền</>
              }
            </Button>
          </div>

          {/* ─ Permission Groups ─ */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Nhóm phân quyền
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => setGroupSearchOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Thêm nhóm
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2">
              {groupLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 bg-muted rounded-lg" />
                  <div className="h-16 bg-muted rounded-lg" />
                </div>
              ) : assignedGroups.length === 0 ? (
                <div className="py-6 text-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                  Chưa được gán nhóm nào · Nhấn <span className="font-semibold">Thêm nhóm</span> để gán
                </div>
              ) : (
                assignedGroups.map((g: any) => (
                  <div
                    key={g.groupId}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{g.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {g.permissions.length} quyền
                        {g.description ? ` · ${g.description}` : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setRemovingGroup(g.groupId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Add Group Dialog ──────────────────────────────── */}
      <Dialog
        open={groupSearchOpen}
        onClose={() => setGroupSearchOpen(false)}
        title="Thêm nhóm phân quyền"
        className="max-w-md"
      >
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {allGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Không có nhóm nào khả dụng
            </p>
          ) : (
            allGroups.map((g) => {
              const alreadyAssigned = assignedGroupIds.has(g.id)
              return (
                <div
                  key={g.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                    alreadyAssigned ? 'bg-muted/50 opacity-60' : 'bg-background hover:border-primary/40 cursor-pointer',
                  )}
                  onClick={() => {
                    if (alreadyAssigned) return
                    setAddingGroup(g.id)
                    assignGroupMutation.mutate(g.id, {
                      onSettled: () => setAddingGroup(null),
                    })
                  }}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.permissions?.length ?? 0} quyền
                      {g.description ? ` · ${g.description}` : ''}
                    </p>
                  </div>
                  {alreadyAssigned ? (
                    <Badge variant="secondary" className="text-xs shrink-0">Đã gán</Badge>
                  ) : addingGroup === g.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              )
            })
          )}
        </div>
        <div className="px-4 pb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setGroupSearchOpen(false)}>Đóng</Button>
        </div>
      </Dialog>

      {/* ── Remove Group Confirm ──────────────────────────── */}
      <Dialog
        open={!!removingGroup}
        onClose={() => setRemovingGroup(null)}
        title="Gỡ nhóm phân quyền"
        className="max-w-sm"
      >
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn gỡ nhóm này khỏi người dùng? Người dùng sẽ mất các quyền từ nhóm đó.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <Button variant="outline" size="sm" onClick={() => setRemovingGroup(null)}>Huỷ</Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={removeGroupMutation.isPending}
            onClick={() => removingGroup && removeGroupMutation.mutate(removingGroup)}
          >
            {removeGroupMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : 'Gỡ nhóm'
            }
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
