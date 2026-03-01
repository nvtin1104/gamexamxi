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
    action: 'Created a new user account',
    time: '2 minutes ago',
  },
  {
    user: 'System',
    action: 'Database backup completed',
    time: '15 minutes ago',
  },
  {
    user: 'Admin',
    action: 'Updated system settings',
    time: '1 hour ago',
  },
  {
    user: 'System',
    action: 'Scheduled maintenance completed',
    time: '3 hours ago',
  },
  {
    user: 'Admin',
    action: 'Deployed new version v1.2.0',
    time: '5 hours ago',
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions in the system</CardDescription>
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
