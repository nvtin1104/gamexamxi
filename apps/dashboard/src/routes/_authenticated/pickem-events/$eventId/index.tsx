import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate as useRouterNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeftIcon, PencilIcon, TrashIcon, Loader2Icon } from 'lucide-react'
import { getPickemEventDetail, deletePickemEvent } from '@/lib/api/pickem-events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/pickem-events/$eventId/')({
  component: PickemEventDetailPage,
})

type PickemEventDetail = {
  id: string
  title: string
  thumbnail: string
  description: string
  winPoints: number
  pickPoints: number
  winExp: number
  pickExp: number
  eventDate: string
  createdBy: string
  createdAt: string
  updatedAt: string
  options: {
    id: string
    eventId: string
    eventItemId: string
    isWinningOption: number
    itemName?: string
    itemLogo?: string
  }[]
}

function PickemEventDetailPage() {
  const { eventId } = Route.useParams()
  const navigate = useRouterNavigate()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['pickem-events', eventId, 'detail'],
    queryFn: () => getPickemEventDetail(eventId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePickemEvent(eventId),
    onSuccess: () => {
      toast.success('Đã xóa sự kiện')
      queryClient.invalidateQueries({ queryKey: ['pickem-events'] })
      navigate({ to: '/pickem-events' })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
      setShowDeleteDialog(false)
    },
  })

  if (isLoading) {
    return (
      <>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>
              <ArrowLeftIcon className="size-4 mr-1" />
              Quay lại
            </Button>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (error || !res?.data) {
    return (
      <>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">Chi tiết sự kiện</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Không tìm thấy sự kiện</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const event = res.data as PickemEventDetail

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/pickem-events' })}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/pickem-events/$eventId/edit" params={{ eventId }}>
                <PencilIcon className="size-4 mr-1" />
                Sửa
              </Link>
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <TrashIcon className="size-4 mr-1" />
              Xóa
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin sự kiện</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={event.thumbnail ?? undefined} alt={event.title} />
                  <AvatarFallback>{event.title.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.id}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mô tả</p>
                <p className="text-sm">{event.description || 'Không có mô tả'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ngày sự kiện</p>
                <p className="text-sm font-medium">
                  {new Date(event.eventDate).toLocaleString('vi-VN')}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ngày tạo</p>
                <p className="text-sm">
                  {new Date(event.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thưởng (khi thắng)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600 text-lg px-3 py-1">
                  +{event.winPoints} điểm
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-purple-600 border-purple-600 text-lg px-3 py-1">
                  +{event.winExp} XP
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cược</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Điểm cược</p>
                <p className="text-lg font-medium">{event.pickPoints} điểm</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">EXP cược</p>
                <p className="text-lg font-medium">{event.pickExp} XP</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lựa chọn ({event.options?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {event.options && event.options.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {event.options.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      option.isWinningOption ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                    }`}
                  >
                    <Avatar className="size-10">
                      <AvatarImage src={option.itemLogo ?? undefined} alt={option.itemName} />
                      <AvatarFallback className="text-xs">
                        {option.itemName?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{option.itemName ?? 'Unknown'}</p>
                      {option.isWinningOption === 1 && (
                        <Badge className="mt-1 bg-green-500">Thắng</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Chưa có lựa chọn nào</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sự kiện "{event.title}" không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2Icon className="size-4 animate-spin mr-2" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
