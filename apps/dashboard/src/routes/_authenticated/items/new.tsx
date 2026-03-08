import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate as useRouterNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { createItem } from '@/lib/api/items'
import { ItemForm } from '@/components/items/item-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import type { CreateItemFormData } from '@gamexamxi/shared'

export const Route = createFileRoute('/_authenticated/items/new')({
  component: NewItemPage,
})

function NewItemPage() {
  const navigate = useRouterNavigate()

  const createMutation = useMutation({
    mutationFn: (data: CreateItemFormData) => createItem(data),
    onSuccess: (res) => {
      toast.success('Đã tạo item mới')
      navigate({ to: '/items/$itemId', params: { itemId: res.data.id } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Tạo thất bại')
    },
  })

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/items' })}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tạo item mới</CardTitle>
            <CardDescription>
              Thêm player, team hoặc tournament mới vào hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemForm
              mode="create"
              onSubmit={async (data) => {
                await createMutation.mutateAsync(data)
              }}
              isLoading={createMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
