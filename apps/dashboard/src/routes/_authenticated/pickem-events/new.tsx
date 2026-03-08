import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate as useRouterNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { createPickemEvent } from '@/lib/api/pickem-events'
import { PickemEventForm } from '@/components/pickem-events/pickem-event-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import type { CreatePickemEventFormData } from '@gamexamxi/shared'

export const Route = createFileRoute('/_authenticated/pickem-events/new')({
  component: NewPickemEventPage,
})

function NewPickemEventPage() {
  const navigate = useRouterNavigate()

  const createMutation = useMutation({
    mutationFn: (data: CreatePickemEventFormData) => createPickemEvent(data),
    onSuccess: (res) => {
      toast.success('Đã tạo sự kiện mới')
      navigate({ to: '/pickem-events/$eventId', params: { eventId: res.data.id } })
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
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/pickem-events' })}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tạo sự kiện Pickem mới</CardTitle>
            <CardDescription>
              Tạo sự kiện dự đoán mới cho người chơi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PickemEventForm
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
