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
  Loader2Icon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from 'lucide-react'
import type { PickemEvent } from '@gamexamxi/shared'
import { listPickemEvents, deletePickemEvent } from '@/lib/api/pickem-events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'

const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional().catch(undefined),
  pageSize: z.coerce.number().int().positive().max(100).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  sortBy: z.enum(['title', 'eventDate', 'createdAt']).optional().catch(undefined),
  sortOrder: z.enum(['asc', 'desc']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/pickem-events/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: PickemEventsPage,
})

function PickemEventsPage() {
  const navigate = Route.useNavigate()
  const filters = Route.useSearch()
  const queryClient = useQueryClient()

  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20

  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pickem-events', filters],
    queryFn: () => listPickemEvents(filters),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePickemEvent(id),
    onSuccess: () => {
      toast.success('Đã xóa sự kiện')
      queryClient.invalidateQueries({ queryKey: ['pickem-events'] })
      setDeleteTargetId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    },
  })

  const columns: ColumnDef<PickemEvent>[] = [
    {
      accessorKey: 'title',
      header: 'Sự kiện',
      cell: ({ row }) => {
        const event = row.original
        const initials = event.title.slice(0, 2).toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={event.thumbnail ?? undefined} alt={event.title} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-none">{event.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{event.id}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'eventDate',
      header: 'Ngày sự kiện',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.eventDate).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      accessorKey: 'winPoints',
      header: 'Thưởng',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            +{row.original.winPoints} điểm
          </Badge>
          <Badge variant="outline" className="text-purple-600 border-purple-600">
            +{row.original.winExp} XP
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'pickPoints',
      header: 'Cược',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {row.original.pickPoints} điểm
          </span>
          <span className="text-sm text-muted-foreground">
            {row.original.pickExp} XP
          </span>
        </div>
      ),
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
        const event = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <Link to="/pickem-events/$eventId" params={{ eventId: event.id }}>
                <EyeIcon className="size-4" />
                <span className="sr-only">Xem</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="size-8" asChild>
              <Link to="/pickem-events/$eventId/edit" params={{ eventId: event.id }}>
                <PencilIcon className="size-4" />
                <span className="sr-only">Sửa</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTargetId(event.id)}
            >
              <TrashIcon className="size-4" />
              <span className="sr-only">Xóa</span>
            </Button>
          </div>
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

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Quản lý Pickem Events</h1>
          {isFetching && !isLoading && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên..."
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
            <Button asChild>
              <Link to="/pickem-events/new">
                <PlusIcon className="size-4 mr-1" />
                Tạo sự kiện
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Tổng {data?.total ?? 0} bản ghi, trang {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ search: { ...filters, page: page - 1 } })}
              disabled={page <= 1}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ search: { ...filters, page: page + 1 } })}
              disabled={page >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sự kiện</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sự kiện này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
