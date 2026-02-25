'use client'
import { useQuery } from '@tanstack/react-query'
import { Users, Gamepad2, UsersRound, Receipt, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
  trend?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{trend}</p>}
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { token } = useAuthStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(token!),
    enabled: !!token,
  })

  const stats = data?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm">
        Không thể tải thống kê. Kiểm tra kết nối API.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng người dùng" value={stats?.totalUsers ?? 0} icon={Users} description="Tất cả tài khoản đã đăng ký" />
        <StatCard title="Sự kiện dự đoán" value={stats?.totalEvents ?? 0} icon={Gamepad2} description="Tổng số sự kiện" />
        <StatCard title="Nhóm" value={stats?.totalGroups ?? 0} icon={UsersRound} description="Nhóm đang hoạt động" />
        <StatCard title="Giao dịch điểm" value={stats?.totalTransactions ?? 0} icon={Receipt} description="Lịch sử giao dịch" />
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Người dùng mới nhất
          </CardTitle>
          <CardDescription>10 tài khoản đăng ký gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {user.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.points.toLocaleString()} điểm</Badge>
                    <span className="text-xs text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Chưa có người dùng</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
