import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate as useRouterNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import { getItem, updateItem } from '@/lib/api/items'
import { ItemForm } from '@/components/items/item-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { UpdateItemFormData } from '@gamexamxi/shared'

export const Route = createFileRoute('/_authenticated/items/$itemId/edit')({
  component: EditItemPage,
})

function EditItemPage() {
  const { itemId } = Route.useParams()
  const navigate = useRouterNavigate()

  const { data: res, isLoading } = useQuery({
    queryKey: ['items', itemId],
    queryFn: () => getItem(itemId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateItemFormData) => updateItem(itemId, data),
    onSuccess: () => {
      toast.success('Đã cập nhật item')
      navigate({ to: '/items/$itemId', params: { itemId } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại')
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
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (!res?.data) {
    return (
      <>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">Chỉnh sửa item</h1>
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

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/items/$itemId', params: { itemId } })}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chỉnh sửa item</CardTitle>
            <CardDescription>
              Cập nhật thông tin {res.data.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemForm
              mode="edit"
              defaultValues={res.data}
              onSubmit={async (data) => {
                await updateMutation.mutateAsync(data)
              }}
              isLoading={updateMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
