'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { EventStatus } from '@gamexamxi/shared'

const LIMIT = 20

const statusVariant: Record<EventStatus, 'default' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  OPEN: 'success',
  LOCKED: 'warning',
  RESOLVED: 'default',
  CANCELLED: 'destructive',
}

const statusLabel: Record<EventStatus, string> = {
  OPEN: 'Đang mở',
  LOCKED: 'Đã khóa',
  RESOLVED: 'Đã giải',
  CANCELLED: 'Đã hủy',
}

export default function EventsPage() {
  const { token } = useAuthStore()
  const [offset, setOffset] = useState(0)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', offset],
    queryFn: () => adminApi.events(token!, { limit: LIMIT, offset }),
    enabled: !!token,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteEvent(id, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-events'] }),
  })

  const events = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Tổng: {total.toLocaleString()} sự kiện</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên sự kiện</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Phần thưởng</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hạn chót</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có sự kiện</td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{event.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{event.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[event.status]}>
                          {statusLabel[event.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{event.pointReward.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(event.predictDeadline).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Xóa sự kiện "${event.title}"?`)) {
                              deleteMutation.mutate(event.id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
