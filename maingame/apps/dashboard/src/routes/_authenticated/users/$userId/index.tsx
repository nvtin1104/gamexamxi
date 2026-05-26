import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeftIcon,
  EditIcon,
  Trash2Icon,
  Loader2Icon,
  ShieldIcon,
  TrophyIcon,
  CoinsIcon,
} from 'lucide-react'
import { getUser, getUserProfile, deleteUser } from '@/lib/api/users'
import { getUserPermissions } from '@/lib/api/permissions'
import { StatusBadge } from '@/components/users/status-badge'
import { RoleBadge } from '@/components/users/role-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_authenticated/users/$userId/')({
  component: UserDetailPage,
})

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  )
}

function UserDetailPage() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: userRes, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  })

  const { data: profileRes, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getUserProfile(userId),
  })

  const { data: permRes } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => getUserPermissions(userId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      toast.success('Đã xóa người dùng')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate({ to: '/users' })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    },
  })

  const isLoading = userLoading || profileLoading
  const user = userRes?.data
  const profile = profileRes?.data

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Chi tiết người dùng</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Button variant="ghost" size="sm" className="self-start -ml-2" asChild>
          <Link to="/users">
            <ArrowLeftIcon className="size-4 mr-2" />
            Quay lại danh sách
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-col gap-4">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Avatar className="size-20">
                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-2xl">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col gap-2">
                    <h2 className="text-xl font-semibold">{user.name}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={user.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/users/$userId/edit" params={{ userId }}>
                        <EditIcon className="size-4 mr-2" />
                        Chỉnh sửa
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2Icon className="size-4 mr-2" />
                          Xóa
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa người dùng <strong>{user.name}</strong> không?
                            Hành động này không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate()}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2Icon className="size-4 animate-spin mr-2" />
                            ) : null}
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoRow label="Số điện thoại" value={profile?.phone} />
                  <InfoRow label="Địa chỉ" value={profile?.address} />
                  <InfoRow
                    label="Ngày sinh"
                    value={
                      profile?.birthdate
                        ? new Date(profile.birthdate).toLocaleDateString('vi-VN')
                        : undefined
                    }
                  />
                  <InfoRow
                    label="Ngày tạo"
                    value={new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  />
                  <InfoRow
                    label="Cập nhật lần cuối"
                    value={new Date(user.updatedAt).toLocaleDateString('vi-VN')}
                  />
                  {user.banReason && <InfoRow label="Lý do cấm" value={user.banReason} />}
                  {user.blockReason && <InfoRow label="Lý do khóa" value={user.blockReason} />}
                  {user.blockExpiresAt && (
                    <InfoRow
                      label="Khóa đến"
                      value={new Date(user.blockExpiresAt).toLocaleString('vi-VN')}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrophyIcon className="size-4" />
                    <CardTitle className="text-sm font-medium">Cấp độ & Kinh nghiệm</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">Lv. {user.level}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(profile?.stats?.currentXp ?? user.experience).toLocaleString('vi-VN')} XP
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CoinsIcon className="size-4" />
                    <CardTitle className="text-sm font-medium">Điểm thưởng</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {user.pointsBalance.toLocaleString('vi-VN')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">điểm hiện có</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldIcon className="size-4" />
                    <CardTitle className="text-sm font-medium">Phân quyền</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {profile?.groups?.length ? (
                      profile.groups.map((g) => (
                        <Badge key={g.id} variant="secondary" className="text-xs">
                          {g.name}
                        </Badge>
                      ))
                    ) : null}
                    {permRes?.data?.permissions?.length ? (
                      permRes.data.permissions.map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))
                    ) : null}
                    {!profile?.groups?.length && !permRes?.data?.permissions?.length && (
                      <span className="text-sm text-muted-foreground">Chưa có quyền nào</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Không tìm thấy người dùng.
          </div>
        )}
      </div>
    </>
  )
}
