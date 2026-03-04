import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Sale {
  name: string
  email: string
  amount: string
  status: "completed" | "pending" | "failed"
  avatar?: string
}

const recentSales: Sale[] = [
  {
    name: "Olivia Martin",
    email: "olivia.martin@email.com",
    amount: "+$1,999.00",
    status: "completed",
  },
  {
    name: "Jackson Lee",
    email: "jackson.lee@email.com",
    amount: "+$39.00",
    status: "completed",
  },
  {
    name: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    amount: "+$299.00",
    status: "pending",
  },
  {
    name: "William Kim",
    email: "will@email.com",
    amount: "+$99.00",
    status: "completed",
  },
  {
    name: "Sofia Davis",
    email: "sofia.davis@email.com",
    amount: "+$39.00",
    status: "failed",
  },
]

const statusVariant: Record<
  Sale["status"],
  "default" | "secondary" | "destructive"
> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
}

const statusLabel: Record<Sale["status"], string> = {
  completed: "Hoàn thành",
  pending: "Chờ xử lý",
  failed: "Thất bại",
}

export function RecentSales() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Doanh số gần đây</CardTitle>
        <CardDescription>Bạn đã thực hiện 265 giao dịch trong tháng này.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentSales.map((sale) => (
            <div key={sale.email} className="flex items-center gap-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={sale.avatar} alt={sale.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {sale.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sale.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {sale.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm font-medium text-emerald-500">
                  {sale.amount}
                </p>
                <Badge
                  variant={statusVariant[sale.status]}
                  className="text-[10px] h-4 px-1.5"
                >
                  {statusLabel[sale.status]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
