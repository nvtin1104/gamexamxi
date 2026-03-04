import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const activities = [
  {
    user: 'Admin',
    action: 'Tạo tài khoản người dùng mới',
    time: '2 phút trước',
  },
  {
    user: 'Hệ thống',
    action: 'Sao lưu cơ sở dữ liệu hoàn tất',
    time: '15 phút trước',
  },
  {
    user: 'Admin',
    action: 'Cập nhật cài đặt hệ thống',
    time: '1 giờ trước',
  },
  {
    user: 'Hệ thống',
    action: 'Bảo trì theo lịch hoàn tất',
    time: '3 giờ trước',
  },
  {
    user: 'Admin',
    action: 'Triển khai phiên bản mới v1.2.0',
    time: '5 giờ trước',
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
        <CardDescription>Các hành động mới nhất trong hệ thống</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {activity.user[0]}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {activity.user}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.action}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
