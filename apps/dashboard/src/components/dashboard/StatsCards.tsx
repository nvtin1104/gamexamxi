import { Users, Activity, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stats = [
  {
    title: 'Total Users',
    value: '2,350',
    change: '+12.5%',
    icon: Users,
  },
  {
    title: 'Active Sessions',
    value: '1,247',
    change: '+4.1%',
    icon: Activity,
  },
  {
    title: 'Revenue',
    value: '$45,231',
    change: '+20.1%',
    icon: DollarSign,
  },
  {
    title: 'Growth',
    value: '+573',
    change: '+8.2%',
    icon: TrendingUp,
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500">{stat.change}</span> from
                last month
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
