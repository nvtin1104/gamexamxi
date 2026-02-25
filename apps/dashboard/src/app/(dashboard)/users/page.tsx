'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const LIMIT = 20

export default function UsersPage() {
  const { token } = useAuthStore()
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', offset, search],
    queryFn: () => adminApi.users(token!, { limit: LIMIT, offset, search: search || undefined }),
    enabled: !!token,
  })

  const users = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Search */}
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
        <span className="text-sm text-muted-foreground">Tổng: {total.toLocaleString()} người dùng</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Người dùng</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Điểm</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Streak</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Không tìm thấy người dùng
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {user.username[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {user.points.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={user.loginStreak >= 7 ? 'success' : 'outline'}>
                          {user.loginStreak}🔥
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!hasMore}
            >
              Tiếp
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
