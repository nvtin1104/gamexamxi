import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@gamexamxi/shared'
import { MoreHorizontal, Pencil, Trash2, ShieldBan } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoleBadge, StatusBadge, formatDate } from '@/lib/formatters'

export type UserAction =
  | { type: 'edit'; user: User }
  | { type: 'ban'; user: User }
  | { type: 'delete'; user: User }

interface MakeColumnsOpts {
  onAction: (action: UserAction) => void
}

export function makeUserColumns({ onAction }: MakeColumnsOpts): ColumnDef<User, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      cell: ({ row }) => (
        <a
          href={`/users/${row.original.id}`}
          className="flex items-center gap-2.5 group"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium leading-none group-hover:underline underline-offset-2">
              {row.original.name}
            </p>
            <p className="truncate text-xs text-muted-foreground mt-0.5">{row.original.email}</p>
          </div>
        </a>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableHiding: true,
      // hidden — we show email inside Name cell; keep for filtering
      cell: () => null,
      size: 0,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      size: 90,
      cell: ({ getValue }) => <RoleBadge role={getValue() as User['role']} />,
      filterFn: (row, _id, filterValue) =>
        !filterValue || row.original.role === filterValue,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 90,
      cell: ({ getValue }) => <StatusBadge status={getValue() as User['status']} />,
      filterFn: (row, _id, filterValue) =>
        !filterValue || row.original.status === filterValue,
    },
    {
      accessorKey: 'level',
      header: 'Level',
      size: 70,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">Lv {getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'pointsBalance',
      header: 'Points',
      size: 90,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{(getValue() as number).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction({ type: 'edit', user })}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {user.status === 'active' ? (
                <DropdownMenuItem
                  className="text-yellow-600"
                  onClick={() => onAction({ type: 'ban', user })}
                >
                  <ShieldBan className="mr-2 h-4 w-4" />
                  Ban
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onAction({ type: 'ban', user })}>
                  <ShieldBan className="mr-2 h-4 w-4" />
                  Unban
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onAction({ type: 'delete', user })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
