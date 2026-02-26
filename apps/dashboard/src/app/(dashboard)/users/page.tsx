'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, ChevronLeft, ChevronRight,
  MoreHorizontal, Eye, Edit, Key, UserPlus, Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { User } from '@gamexamxi/shared'
import { z } from 'zod'
import { toast } from 'sonner'

// ─── Constants & Schemas ─────────────────────────────────────

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

const ROLE_COLORS: Record<string, string> = {
  root: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  admin: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400',
  moderator: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
  user: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400',
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Người dùng',
  moderator: 'Kiểm duyệt viên',
  admin: 'Quản trị viên',
  root: 'Hệ thống (Root)',
}

const PERMISSION_GROUPS_MAP: Record<string, string[]> = {
  'Sự kiện': ['events:read', 'events:create', 'events:resolve', 'events:manage', 'events:delete'],
  'Nhóm': ['groups:read', 'groups:create', 'groups:manage'],
  'Người dùng': ['users:read', 'users:manage', 'users:suspend'],
  'Cửa hàng': ['shop:purchase', 'shop:manage'],
  'Hệ thống': ['points:grant', 'quests:create', 'admin:panel', 'admin:root'],
}

// ─── Page Component ─────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter()
  const { token, user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  // State Management (create dialog only — detail/edit use dedicated pages)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<User> & { password?: string }>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ─── Queries ────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', offset, search],
    queryFn: () => adminApi.users(token!, { limit: LIMIT, offset, search: search || undefined }),
    enabled: !!token,
  })

  // ─── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: any) => adminApi.createUser(body, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setCreateDialogOpen(false)
      toast.success('Đã tạo tài khoản người dùng mới')
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi hệ thống')
  })

  // ─── Render Helpers ──────────────────────────────────────────

  const users = data?.data?.items ?? []
  const hasMore = data?.data?.hasMore ?? false
  const total = data?.data?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Quản lý Người dùng</h1>
          <p className="text-muted-foreground text-sm">Điều hành tài khoản, phân quyền và giám sát biến động điểm.</p>
        </div>
        <Button size="lg" className="shadow-lg shadow-primary/20" onClick={() => {
          setFormData({ role: 'user' }); setCreateDialogOpen(true);
        }}>
          <UserPlus className="mr-2 h-5 w-5" /> Thêm người dùng
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm theo username, email hoặc ID..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
            className="pl-9 h-11 bg-background shadow-sm"
          />
        </div>
        <Card className="flex items-center px-4 h-11 border-dashed">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Tổng cộng: <span className="text-foreground">{total.toLocaleString()}</span>
          </span>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold py-4">Người dùng</TableHead>
              <TableHead className="font-bold">Vai trò</TableHead>
              <TableHead className="font-bold text-right">Số dư điểm</TableHead>
              <TableHead className="font-bold text-center">Streak</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={6}><div className="h-12 bg-muted/50 rounded-lg w-full" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p>Không tìm thấy kết quả nào trùng khớp</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center font-bold text-primary border border-primary/10">
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${ROLE_COLORS[user.role]} border px-2 py-0.5 shadow-sm`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-sm text-primary font-mono">{user.points.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Level {user.level}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black shadow-inner ${
                      user.loginStreak >= 7 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.loginStreak} <Flame className={`h-3.5 w-3.5 ${user.loginStreak >= 7 ? 'fill-current' : ''}`} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_8px] ${user.status === 'active' ? 'shadow-green-500/50' : 'shadow-red-500/50'}`} />
                      <span className="text-xs font-medium capitalize">{user.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-primary font-bold" onClick={() => router.push(`/users/${user.id}/edit?tab=permissions`)}>
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

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <p className="text-xs text-muted-foreground font-medium">
            Trang {Math.floor(offset / LIMIT) + 1} trên {Math.ceil(total / LIMIT)}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0" 
              disabled={offset === 0} 
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0" 
              disabled={!hasMore}
              onClick={() => setOffset(offset + LIMIT)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

    </div>
  )
}