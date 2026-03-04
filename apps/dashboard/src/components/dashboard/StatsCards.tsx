import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCard {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  description: string
  icon: LucideIcon
}

const stats: StatCard[] = [
  {
    title: "Tổng doanh thu",
    value: "$45,231.89",
    change: "+20.1%",
    trend: "up",
    description: "so với tháng trước",
    icon: DollarSign,
  },
  {
    title: "Lượt đăng ký",
    value: "+2,350",
    change: "+180.1%",
    trend: "up",
    description: "so với tháng trước",
    icon: Users,
  },
  {
    title: "Doanh số",
    value: "+12,234",
    change: "+19%",
    trend: "up",
    description: "so với tháng trước",
    icon: CreditCard,
  },
  {
    title: "Đang hoạt động",
    value: "+573",
    change: "+201",
    trend: "up",
    description: "trong giờ qua",
    icon: Activity,
  },
]

function StatCard({ stat }: { stat: StatCard }) {
  const Icon = stat.icon
  const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <TrendIcon
            className={`h-3 w-3 ${stat.trend === "up" ? "text-emerald-500" : "text-red-500"}`}
          />
          <span className={stat.trend === "up" ? "text-emerald-500" : "text-red-500"}>
            {stat.change}
          </span>
          {stat.description}
        </p>
      </CardContent>
    </Card>
  )
}

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} stat={stat} />
      ))}
    </div>
  )
}
