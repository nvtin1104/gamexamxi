import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HomeIcon, ArrowLeftIcon } from 'lucide-react'

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
  staticData: {
    layout: false,
  },
})

function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl font-bold text-primary">404</CardTitle>
          <h2 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to="/">
              <HomeIcon className="mr-2 h-4 w-4" />
              Về trang chủ
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
