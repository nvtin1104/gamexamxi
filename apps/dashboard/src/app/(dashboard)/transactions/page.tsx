'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { PointTransactionType } from '@gamexamxi/shared'

const LIMIT = 30

const typeConfig: Record<PointTransactionType, { label: string; positive: boolean }> = {
  PREDICTION_WIN: { label: 'Thắng dự đoán', positive: true },
  LOGIN_STREAK: { label: 'Streak đăng nhập', positive: true },
  QUEST_COMPLETE: { label: 'Hoàn thành quest', positive: true },
  ACHIEVEMENT: { label: 'Thành tích', positive: true },
  SHOP_PURCHASE: { label: 'Mua hàng', positive: false },
  WELCOME_BONUS: { label: 'Bonus chào mừng', positive: true },
  ADMIN_GRANT: { label: 'Admin tặng', positive: true },
  ADMIN_DEDUCT: { label: 'Admin trừ', positive: false },
}

export default function TransactionsPage() {
  const { token } = useAuthStore()
  const [offset, setOffset] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', offset],
    queryFn: () => adminApi.transactions(token!, { limit: LIMIT, offset }),
    enabled: !!token,
  })

  const transactions = data?.data?.items ?? []
  const total = data?.data?.total ?? 0
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Tổng: {total.toLocaleString()} giao dịch</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Loại</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Điểm</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ghi chú</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thời gian</th>
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
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có giao dịch</td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const config = typeConfig[tx.type]
                    return (
                      <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.userId?.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          <Badge variant={config.positive ? 'success' : 'destructive'}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`flex items-center justify-end gap-1 font-mono font-medium ${config.positive ? 'text-green-600' : 'text-red-600'}`}>
                            {config.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {config.positive ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{tx.description ?? '-'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '-'}
                        </td>
                      </tr>
                    )
                  })
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
