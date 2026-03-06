import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import { createUser } from '@/lib/api/users'
import { UserForm } from '@/components/users/user-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_authenticated/users/new')({
  component: NewUserPage,
})

function NewUserPage() {
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (res) => {
      toast.success('Đã tạo người dùng mới')
      navigate({ to: '/users/$userId', params: { userId: res.data.id } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Tạo người dùng thất bại')
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
          <h1 className="text-base font-medium">Tạo người dùng mới</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Button variant="ghost" size="sm" className="self-start -ml-2" asChild>
          <Link to="/users">
            <ArrowLeftIcon className="size-4 mr-2" />
            Quay lại danh sách
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin người dùng</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
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
