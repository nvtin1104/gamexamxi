'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Lock, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { GroupStyle } from '@gamexamxi/shared'

const LIMIT = 20

const styleLabel: Record<GroupStyle, string> = {
  FRIENDS: 'Bạn bè',
  COUPLE: 'Cặp đôi',
  FAMILY: 'Gia đình',
}

export default function GroupsPage() {
  const { token } = useAuthStore()
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups', offset],
    queryFn: () => adminApi.groups(token!, { limit: LIMIT, offset }),
    enabled: !!token,
  })

  const groups = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Tổng: {total.toLocaleString()} nhóm</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên nhóm</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Truy cập</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thành viên</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có nhóm</td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{group.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{styleLabel[group.style]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {group.isPrivate ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="text-xs">Riêng tư</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <Globe className="h-3 w-3" />
                            <span className="text-xs">Công khai</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {(group.memberCount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {group.createdAt ? new Date(group.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>
              <ChevronLeft className="h-4 w-4" />Trước
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffset(offset + LIMIT)} disabled={!hasMore}>
              Tiếp<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
