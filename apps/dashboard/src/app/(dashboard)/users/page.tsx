'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, ShieldCheck, X, MoreHorizontal, Eye, Edit, Key } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { User } from '@gamexamxi/shared'
import { z } from 'zod'
import { toast } from 'sonner'

const userSchema = z.object({
  username: z.string().min(3, 'Username tối thiểu 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['user', 'moderator', 'admin', 'root']).optional(),
})

const editSchema = z.object({
  username: z.string().min(3, 'Username tối thiểu 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['user', 'moderator', 'admin', 'root']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
})

const LIMIT = 20

const PERMISSION_GROUPS_MAP: Record<string, string[]> = {
  'Events': ['events:read', 'events:create', 'events:resolve', 'events:manage', 'events:delete'],
  'Groups': ['groups:read', 'groups:create', 'groups:manage'],
  'Users': ['users:read', 'users:manage', 'users:suspend'],
  'Shop': ['shop:purchase', 'shop:manage'],
  'Points': ['points:grant'],
  'Quests': ['quests:create', 'quests:manage'],
  'Admin': ['admin:panel', 'admin:root'],
}

const ROLE_COLORS: Record<string, string> = {
  root: 'bg-red-100 text-red-700 border-red-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  moderator: 'bg-blue-100 text-blue-700 border-blue-200',
  user: 'bg-gray-100 text-gray-700 border-gray-200',
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Người dùng',
  moderator: 'Kiểm duyệt viên',
  admin: 'Quản trị viên',
  root: 'Root',
}

type Tab = 'perms' | 'groups'

export default function UsersPage() {
  const { token, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [permsDialogOpen, setPermsDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)

  // Forms state
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [pendingPerms, setPendingPerms] = useState<string[]>([])
  const [interacted, setInteracted] = useState(false)
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({
    username: '',
    email: '',
    password: '',
    role: 'user',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const availableRoles = user?.role === 'root'
    ? ['user', 'moderator', 'admin', 'root']
    : ['user']

  // ─── Queries ────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', offset, search],
    queryFn: () => adminApi.users(token!, { limit: LIMIT, offset, search: search || undefined }),
    enabled: !!token,
  })

  const { data: userDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: () => adminApi.getUser(selectedUserId!, token!),
    enabled: !!selectedUserId && !!token && detailsSheetOpen,
  })

  const { data: permData, isLoading: permLoading } = useQuery({
    queryKey: ['admin-user-permissions', selectedUserId],
    queryFn: () => adminApi.getUserPermissions(selectedUserId!, token!),
    enabled: !!selectedUserId && !!token && permsDialogOpen,
  })

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['admin-user-groups', selectedUserId],
    queryFn: () => adminApi.getUserGroups(selectedUserId!, token!),
    enabled: !!selectedUserId && !!token && permsDialogOpen,
  })

  const { data: allGroupsData } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => adminApi.listPermissionGroups(token!),
    enabled: !!token && permsDialogOpen,
  })

  const allGroups = allGroupsData?.data ?? []
  const assignedGroups = groupData?.data ?? []
  const assignedGroupIds = new Set(assignedGroups.map(g => g.groupId))

  // ─── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Partial<User> & { password?: string }) => adminApi.createUser(body, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setCreateDialogOpen(false)
      setFormData({ username: '', email: '', password: '', role: 'user' })
      setErrors({})
      toast.success('Tạo người dùng thành công')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi tạo người dùng'),
  })

  const updateMutation = useMutation({
    mutationFn: (body: Partial<User>) => adminApi.updateUser(selectedUserId!, body, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditDialogOpen(false)
      setErrors({})
      toast.success('Cập nhật người dùng thành công')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi cập nhật người dùng'),
  })

  const savePermsMutation = useMutation({
    mutationFn: () => {
      const perms = interacted ? pendingPerms : (permData?.data?.customPermissions ?? [])
      return adminApi.updateUserPermissions(selectedUserId!, perms, token!)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-permissions', selectedUserId] })
      toast.success('Cập nhật quyền thành công')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi cập nhật quyền'),
  })

  const assignGroupMutation = useMutation({
    mutationFn: (groupId: string) => adminApi.assignUserGroup(selectedUserId!, groupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-groups', selectedUserId] })
      toast.success('Đã gán nhóm quyền')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi gán nhóm'),
  })

  const unassignGroupMutation = useMutation({
    mutationFn: (groupId: string) => adminApi.unassignUserGroup(selectedUserId!, groupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-groups', selectedUserId] })
      toast.success('Đã huỷ nhóm quyền')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi huỷ nhóm'),
  })

  // ─── Handlers ───────────────────────────────────────────────

  const handleCreateUser = () => {
    const result = userSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(i => {
        if (i.path[0]) fieldErrors[i.path[0] as string] = i.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    createMutation.mutate(result.data as any)
  }

  const handleUpdateUser = () => {
    const result = editSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(i => {
        if (i.path[0]) fieldErrors[i.path[0] as string] = i.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    updateMutation.mutate(result.data as any)
  }

  const openPermsDialog = (userId: string) => {
    setSelectedUserId(userId)
    setPendingPerms([])
    setInteracted(false)
    setActiveTab('groups')
    setPermsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setSelectedUserId(user.id)
    setErrors({})
    setFormData({ username: user.username, email: user.email, role: user.role, status: user.status })
    setEditDialogOpen(true)
  }

  const openDetailsSheet = (userId: string) => {
    setSelectedUserId(userId)
    setDetailsSheetOpen(true)
  }

  const closePermsDialog = () => {
    setPermsDialogOpen(false)
    setSelectedUserId(null)
    setPendingPerms([])
    setInteracted(false)
  }

  const customPerms = permData?.data?.customPermissions ?? []
  const rolePerms = permData?.data?.rolePermissions ?? []
  const userRole = permData?.data?.role ?? ''
  const displayPerms = interacted ? pendingPerms : customPerms

  const handleTogglePerm = (perm: string) => {
    if (!interacted) {
      setInteracted(true)
      setPendingPerms(
        customPerms.includes(perm) ? customPerms.filter(p => p !== perm) : [...customPerms, perm]
      )
    } else {
      setPendingPerms(prev =>
        prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
      )
    }
  }

  const users = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Người dùng</h1>
        <Button onClick={() => {
          setErrors({})
          setFormData({ username: '', email: '', password: '', role: 'user' })
          setCreateDialogOpen(true)
        }}>
          Thêm người dùng
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo username hoặc email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">Tổng: {total.toLocaleString()}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right">Streak</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-center w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Không tìm thấy người dùng
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.username[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_COLORS[user.role] ?? ROLE_COLORS.user}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">{user.points.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={user.loginStreak >= 7 ? 'success' : 'outline'}>{user.loginStreak}🔥</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailsSheet(user.id)}>
                            <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPermsDialog(user.id)}>
                            <Key className="mr-2 h-4 w-4" /> Phân quyền
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffset(offset + LIMIT)} disabled={!hasMore}>
              Tiếp <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      <Dialog open={permsDialogOpen} onClose={closePermsDialog} title="Quản lý quyền" className="max-w-xl">
        <div className="flex border-b mt-4">
          {(['groups', 'perms'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab === 'groups' ? '🗂 Nhóm quyền' : '🔑 Quyền tuỳ chỉnh'}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'groups' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vai trò:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[userRole] ?? ROLE_COLORS.user}`}>
                  {(ROLE_LABELS[userRole] ?? userRole) || '…'}
                </span>
                {userRole === 'root' && <span className="text-xs text-amber-600 font-medium">Root bypass toàn bộ</span>}
              </div>

              {(groupLoading || permLoading) ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                </div>
              ) : (
                <>
                  {assignedGroups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Đã gán</p>
                      <div className="space-y-1.5">
                        {assignedGroups.map(g => (
                          <div key={g.groupId} className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{g.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {g.permissions.slice(0, 4).map(p => <span key={p} className="text-[9px] font-mono text-muted-foreground">{p}</span>)}
                                {g.permissions.length > 4 && <span className="text-[9px] text-muted-foreground">+{g.permissions.length - 4} more</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => unassignGroupMutation.mutate(g.groupId)}
                              disabled={unassignGroupMutation.isPending}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allGroups.filter(g => !assignedGroupIds.has(g.id)).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Thêm nhóm</p>
                      <div className="space-y-1.5">
                        {allGroups.filter(g => !assignedGroupIds.has(g.id)).map(g => (
                          <div key={g.id} className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted/50">
                            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{g.name}</span>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {g.permissions.slice(0, 5).join(', ')}
                                {g.permissions.length > 5 ? ` +${g.permissions.length - 5}` : ''}
                              </div>
                            </div>
                            <Button
                              size="sm" variant="outline" className="h-6 px-2 text-xs"
                              disabled={assignGroupMutation.isPending}
                              onClick={() => assignGroupMutation.mutate(g.id)}
                            >
                              Gán
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'perms' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Quyền tuỳ chỉnh được cộng thêm vào quyền của vai trò.</p>
              {permLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
                </div>
              ) : (
                Object.entries(PERMISSION_GROUPS_MAP).map(([group, perms]) => (
                  <div key={group} className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group}</p>
                    <div className="space-y-1">
                      {perms.map(perm => {
                        const isFromRole = rolePerms.includes(perm)
                        const isCustom = displayPerms.includes(perm)
                        return (
                          <label
                            key={perm}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors ${isFromRole ? 'bg-muted/40 cursor-default' : 'hover:bg-muted/60 cursor-pointer'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isFromRole || isCustom}
                              disabled={isFromRole}
                              onChange={() => { if (!isFromRole) handleTogglePerm(perm) }}
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="flex-1 font-mono text-xs">{perm}</span>
                            {isFromRole && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">từ role</span>}
                            {!isFromRole && isCustom && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">custom</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            {assignedGroups.length} nhóm · {displayPerms.length} custom · {rolePerms.length} từ role
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={closePermsDialog}>Đóng</Button>
            {activeTab === 'perms' && (
              <Button size="sm" disabled={savePermsMutation.isPending || permLoading} onClick={() => savePermsMutation.mutate()}>
                {savePermsMutation.isPending ? 'Đang lưu...' : 'Lưu quyền'}
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} title="Tạo người dùng mới" className="max-w-md">
        <div className="space-y-5 px-6 pt-6 pb-2">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="nhap_username"
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mật khẩu ít nhất 6 ký tự"
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={formData.role ?? ''} onValueChange={(r: any) => setFormData({ ...formData, role: r })}>
              <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{ROLE_LABELS[r] ?? r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 bg-muted/30 border-t justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>Huỷ</Button>
          <Button
            size="sm"
            disabled={createMutation.isPending}
            onClick={handleCreateUser}
          >
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo mới'}
          </Button>
        </div>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} title="Chỉnh sửa người dùng" className="max-w-md">
        <div className="space-y-5 px-6 pt-6 pb-2">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Vai trò</Label>
            <Select value={formData.role ?? ''} onValueChange={(r: any) => setFormData({ ...formData, role: r })}>
              <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{ROLE_LABELS[r] ?? r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select value={formData.status ?? ''} onValueChange={(s: any) => setFormData({ ...formData, status: s })}>
              <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 bg-muted/30 border-t justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Huỷ</Button>
          <Button
            size="sm"
            disabled={updateMutation.isPending}
            onClick={handleUpdateUser}
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Dialog>

      {/* User Details Sheet */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết người dùng</SheetTitle>
            <SheetDescription>
              Xem thông tin thống kê chi tiết của người dùng này.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {detailsLoading ? (
              <div className="space-y-4">
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-40 bg-muted rounded animate-pulse" />
              </div>
            ) : userDetails?.data ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {userDetails.data.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{userDetails.data.username}</h2>
                    <p className="text-sm text-muted-foreground">{userDetails.data.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={ROLE_COLORS[userDetails.data.role] ?? ROLE_COLORS.user}>
                        {ROLE_LABELS[userDetails.data.role] ?? userDetails.data.role}
                      </Badge>
                      <Badge variant={userDetails.data.status === 'active' ? 'success' : 'destructive'} className="capitalize">
                        {userDetails.data.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Điểm hiện tại</span>
                      <span className="text-2xl font-bold text-primary font-mono">{userDetails.data.points.toLocaleString()}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Tổng điểm đã kiếm</span>
                      <span className="text-2xl font-bold font-mono">{userDetails.data.totalPointsEarned.toLocaleString()}</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Level / EXP</span>
                      <span className="text-xl font-bold">Lvl {userDetails.data.level}</span>
                      <span className="text-xs text-muted-foreground mt-1">{userDetails.data.experience.toLocaleString()} exp</span>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground">Chuỗi đăng nhập</span>
                      <span className="text-xl font-bold">{userDetails.data.loginStreak} 🔥</span>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Các giao dịch gần đây</h3>
                  <div className="space-y-2">
                    {userDetails.data.transactions?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">Không có giao dịch nào</p>
                    ) : (
                      userDetails.data.transactions?.slice(0, 5).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                          <div>
                            <p className="font-medium">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                          </div>
                          <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Không tải được thông tin người dùng</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
