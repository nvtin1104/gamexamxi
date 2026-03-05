import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import type { UpdateUserFormData } from '@gamexamxi/shared'
import { getUser, updateUser } from '@/lib/api/users'
import { UserForm } from '@/components/users/user-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/users/$userId/edit')({
  component: EditUserPage,
})

function EditUserPage() {
  const { userId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: userResp, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => getUser(userId),
  })

  const editMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) => updateUser(userId, data),
    onSuccess: () => {
      toast.success('Đã cập nhật người dùng')
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      router.navigate({ to: '/users/$userId', params: { userId } })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại')
    },
  })

  const user = userResp?.data

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <Button variant="ghost" size="sm" asChild className="-ml-1">
            <Link to="/users/$userId" params={{ userId }}>
              <ArrowLeftIcon className="size-4 mr-1" />
              {isLoading ? 'Người dùng' : (user?.name ?? 'Chi tiết')}
            </Link>
          </Button>
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="text-base font-medium">Chỉnh sửa</h1>
        </div>
      </header>

      <div className="flex flex-1 justify-center p-4 lg:p-6">
        <div className="w-full">
          <Card>
            <CardHeader>
              <CardTitle>
                {isLoading ? <Skeleton className="h-6 w-40" /> : `Sửa: ${user?.name}`}
              </CardTitle>
              <CardDescription>Cập nhật thông tin tài khoản người dùng.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : user ? (
                <UserForm
                  mode="edit"
                  defaultValues={{
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar ?? '',
                    phone: user.phone ?? '',
                    address: user.address ?? '',
                    birthdate: user.birthdate ?? '',
                    banReason: user.banReason ?? '',
                    blockReason: user.blockReason ?? '',
                    blockExpiresAt: user.blockExpiresAt ?? '',
                  }}
                  onSubmit={async (data) => { await editMutation.mutateAsync(data) }}
                  isLoading={editMutation.isPending}
                />
              ) : (
                <p className="text-muted-foreground">Không tìm thấy người dùng.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
