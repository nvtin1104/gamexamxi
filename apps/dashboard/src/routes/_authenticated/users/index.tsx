import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PlusIcon,
  SearchIcon,
  ArrowUpDownIcon,
  MoreHorizontalIcon,
  Loader2Icon,
} from 'lucide-react'
import type { User } from '@gamexamxi/shared'
import { listUsers, deleteUser } from '@/lib/api/users'
import { StatusBadge } from '@/components/users/status-badge'
import { RoleBadge } from '@/components/users/role-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional().catch(undefined),
  pageSize: z.coerce.number().int().positive().max(100).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  role: z.enum(['root', 'staff', 'kol', 'mod', 'user']).optional().catch(undefined),
  status: z.enum(['active', 'banned', 'block']).optional().catch(undefined),
  sortBy: z
    .enum(['name', 'email', 'createdAt', 'level', 'pointsBalance'])
    .optional()
    .catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: UsersPage,
})

function UsersPage() {
  const navigate = Route.useNavigate()
  const filters = Route.useSearch()
  const queryClient = useQueryClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20

  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => listUsers(filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success('Đã xóa người dùng')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteTargetId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    },
  })

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'Người dùng',
      cell: ({ row }) => {
        const user = row.original
        const initials = user.name.slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'level',
      header: 'Cấp độ',
      cell: ({ row }) => <span className="font-medium">Lv.{row.original.level}</span>,
    },
    {
      accessorKey: 'pointsBalance',
      header: 'Điểm',
      cell: ({ row }) => <span>{row.original.pointsBalance.toLocaleString('vi-VN')}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontalIcon className="size-4" />
                <span className="sr-only">Tùy chọn</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/users/$userId" params={{ userId: user.id }}>
                  Xem chi tiết
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/users/$userId/edit" params={{ userId: user.id }}>
                  Chỉnh sửa
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTargetId(user.id)}
              >
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: data?.total ?? 0,
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  function handleSearch() {
    navigate({ search: { ...filters, search: searchInput, page: 1 } })
  }

  function handleRoleFilter(val: string) {
    navigate({
      search: {
        ...filters,
        role: val === 'all' ? undefined : (val as 'root' | 'staff' | 'kol' | 'mod' | 'user'),
        page: 1,
      },
    })
  }

  function handleStatusFilter(val: string) {
    navigate({
      search: {
        ...filters,
        status: val === 'all' ? undefined : (val as 'active' | 'banned' | 'block'),
        page: 1,
      },
    })
  }

  function handleSortBy(col: string) {
    const validCols = ['name', 'email', 'createdAt', 'level', 'pointsBalance'] as const
    type SortCol = (typeof validCols)[number]
    if (!validCols.includes(col as SortCol)) return
    const sortCol = col as SortCol
    if (filters.sortBy === sortCol) {
      navigate({
        search: {
          ...filters,
          sortOrder: (filters.sortOrder ?? 'desc') === 'asc' ? 'desc' : 'asc',
        },
      })
    } else {
      navigate({ search: { ...filters, sortBy: sortCol, sortOrder: 'desc', page: 1 } })
    }
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
          <h1 className="text-base font-medium">Quản lý người dùng</h1>
          {isFetching && !isLoading && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên, email..."
                className="pl-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Tìm
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filters.role ?? 'all'} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="user">Người dùng</SelectItem>
                <SelectItem value="mod">Mod</SelectItem>
                <SelectItem value="kol">KOL</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="root">Root</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status ?? 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="banned">Bị cấm</SelectItem>
                <SelectItem value="block">Bị khóa</SelectItem>
              </SelectContent>
            </Select>

            <Button asChild>
              <Link to="/users/new">
                <PlusIcon className="size-4 mr-2" />
                Thêm người dùng
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={() =>
                            header.column.id !== 'actions' && handleSortBy(header.column.id)
                          }
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {['name', 'email', 'createdAt', 'level', 'pointsBalance'].includes(
                            header.column.id,
                          ) && <ArrowUpDownIcon className="size-3 text-muted-foreground" />}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Không tìm thấy người dùng nào.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && (data?.total ?? 0) > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Hiển thị {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, data?.total ?? 0)} trong {data?.total ?? 0} người dùng
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => navigate({ search: { ...filters, page: page - 1 } })}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => navigate({ search: { ...filters, page: page + 1 } })}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
