import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeftIcon, PencilIcon, TrashIcon, Loader2Icon } from 'lucide-react'
import { getItem, deleteItem } from '@/lib/api/items'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ITEM_TYPE_LABELS } from '@gamexamxi/shared'
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

export const Route = createFileRoute('/_authenticated/items/$itemId/')({
  component: ItemDetailPage,
})

function ItemDetailPage() {
  const { itemId } = Route.useParams()
  const queryClient = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: res, isLoading, error } = useQuery({
    queryKey: ['items', itemId],
    queryFn: () => getItem(itemId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteItem(itemId),
    onSuccess: () => {
      toast.success('Đã xóa item')
      queryClient.invalidateQueries({ queryKey: ['items'] })
      window.location.href = '/items'
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
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
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
            <h1 className="text-base font-medium">Chi tiết item</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Không tìm thấy item</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const item = res.data
  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/items">
              <ArrowLeftIcon className="size-4 mr-1" />
              Quay lại
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={item.logo} alt={item.name} />
              <AvatarFallback className="text-lg">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <p className="text-sm text-muted-foreground">{item.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/items/$itemId/edit" params={{ itemId: item.id }}>
                <PencilIcon className="size-4 mr-2" />
                Chỉnh sửa
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <TrashIcon className="size-4 mr-2" />
              Xóa
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Loại" value={<Badge>{ITEM_TYPE_LABELS[item.type] ?? item.type}</Badge>} />
              <InfoRow label="Level" value={`Lv.${item.level}`} />
              <InfoRow label="Ngày tạo" value={new Date(item.createdAt).toLocaleDateString('vi-VN')} />
              <InfoRow label="Cập nhật" value={new Date(item.updatedAt).toLocaleDateString('vi-VN')} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Mô tả</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>

          {item.linkSocial && (
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Liên kết mạng xã hội</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Mạng" value={item.linkSocial.type} />
                <InfoRow label="URL" value={item.linkSocial.url || '-'} />
                <InfoRow label="Handle" value={item.linkSocial.handle || '-'} />
                <InfoRow label="Công khai" value={item.linkSocial.isPublic ? 'Có' : 'Không'} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa item &quot;{item.name}&quot; không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
