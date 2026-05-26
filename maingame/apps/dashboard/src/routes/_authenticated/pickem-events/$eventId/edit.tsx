import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate as useRouterNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { getPickemEvent, updatePickemEvent } from '@/lib/api/pickem-events'
import { PickemEventForm } from '@/components/pickem-events/pickem-event-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { UpdatePickemEventFormData } from '@gamexamxi/shared'

export const Route = createFileRoute('/_authenticated/pickem-events/$eventId/edit')({
  component: EditPickemEventPage,
})

function EditPickemEventPage() {
  const { eventId } = Route.useParams()
  const navigate = useRouterNavigate()

  const { data: res, isLoading } = useQuery({
    queryKey: ['pickem-events', eventId],
    queryFn: () => getPickemEvent(eventId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePickemEventFormData) => updatePickemEvent(eventId, data),
    onSuccess: () => {
      toast.success('Đã cập nhật sự kiện')
      navigate({ to: '/pickem-events/$eventId', params: { eventId } })
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
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
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
            <h1 className="text-base font-medium">Chỉnh sửa sự kiện</h1>
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

  const event = res.data

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/pickem-events/$eventId', params: { eventId } })}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Quay lại
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chỉnh sửa sự kiện</CardTitle>
            <CardDescription>
              Cập nhật thông tin sự kiện "{event.title}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PickemEventForm
              mode="edit"
              defaultValues={{
                title: event.title,
                thumbnail: event.thumbnail,
                description: event.description,
                winPoints: event.winPoints,
                pickPoints: event.pickPoints,
                winExp: event.winExp,
                pickExp: event.pickExp,
                eventDate: event.eventDate,
              }}
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
