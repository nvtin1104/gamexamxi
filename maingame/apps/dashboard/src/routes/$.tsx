import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { HomeIcon, ArrowLeftIcon, TriangleAlertIcon } from 'lucide-react'

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
  staticData: {
    layout: false,
  },
})

function NotFoundPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <TriangleAlertIcon className="h-12 w-12 text-primary" />
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-8xl font-bold tracking-wider text-primary">404</h1>
          <h2 className="text-2xl font-semibold tracking-tight">
            Không tìm thấy trang
          </h2>
          <p className="max-w-md text-muted-foreground">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <Button asChild size="lg">
            <Link to="/">
              <HomeIcon className="mr-2 h-4 w-4" />
              Về trang chủ
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  )
}
