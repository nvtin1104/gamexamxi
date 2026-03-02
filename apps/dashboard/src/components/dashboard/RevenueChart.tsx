"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const data = [
  { month: "Jan", revenue: 4000, subscriptions: 240 },
  { month: "Feb", revenue: 3000, subscriptions: 139 },
  { month: "Mar", revenue: 9800, subscriptions: 980 },
  { month: "Apr", revenue: 3908, subscriptions: 390 },
  { month: "May", revenue: 4800, subscriptions: 480 },
  { month: "Jun", revenue: 3800, subscriptions: 380 },
  { month: "Jul", revenue: 5000, subscriptions: 430 },
  { month: "Aug", revenue: 7200, subscriptions: 520 },
  { month: "Sep", revenue: 6100, subscriptions: 620 },
  { month: "Oct", revenue: 8900, subscriptions: 750 },
  { month: "Nov", revenue: 11000, subscriptions: 890 },
  { month: "Dec", revenue: 13500, subscriptions: 1200 },
]

export function RevenueChart() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>
          Monthly revenue and subscriptions for the current year
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient
                id="colorSubscriptions"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--card-foreground))",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === "revenue" ? `$${value.toLocaleString()}` : value,
                name === "revenue" ? "Revenue" : "Subscriptions",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="subscriptions"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorSubscriptions)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
