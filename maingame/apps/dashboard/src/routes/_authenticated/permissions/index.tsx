import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { PlusIcon, Loader2Icon, EditIcon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import type { PermissionGroup } from '@gamexamxi/shared'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@gamexamxi/shared'
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  assignUserToGroup,
} from '@/lib/api/permissions'
import { listUsers } from '@/lib/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_authenticated/permissions/')({
  component: PermissionsPage,
})

// ─── Group Form Dialog ─────────────────────────────────────────────────────

interface GroupFormDialogProps {
  open: boolean
  onClose: () => void
  editing?: PermissionGroup
}

function GroupFormDialog({ open, onClose, editing }: GroupFormDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(editing?.name ?? '')
  const [selected, setSelected] = useState<string[]>(editing?.permissions ?? [])

  const createMutation = useMutation({
    mutationFn: () => createGroup({ name: name.trim(), permissions: selected }),
    onSuccess: () => {
      toast.success('Đã tạo nhóm quyền')
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Thao tác thất bại'),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateGroup(editing!.id, selected),
    onSuccess: () => {
      toast.success('Đã cập nhật nhóm quyền')
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Thao tác thất bại'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function togglePermission(p: string) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  function handleSubmit() {
    if (!editing && !name.trim()) {
      toast.error('Tên nhóm không được để trống')
      return
    }
    if (editing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa nhóm quyền' : 'Tạo nhóm quyền mới'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-name">Tên nhóm</Label>
              <Input
                id="group-name"
                placeholder="Nhập tên nhóm..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Quyền hạn</Label>
            <div className="grid grid-cols-1 gap-2">
              {ALL_PERMISSIONS.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${p}`}
                    checked={selected.includes(p)}
                    onCheckedChange={() => togglePermission(p)}
                  />
                  <label htmlFor={`perm-${p}`} className="text-sm cursor-pointer select-none">
                    <span className="font-medium">{PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS] ?? p}</span>
                    <span className="text-muted-foreground ml-2 text-xs">({p})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="size-4 animate-spin mr-2" />}
            {editing ? 'Cập nhật' : 'Tạo nhóm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Assign User Dialog ────────────────────────────────────────────────────

interface AssignUserDialogProps {
  open: boolean
  onClose: () => void
  group: PermissionGroup
}

function AssignUserDialog({ open, onClose, group }: AssignUserDialogProps) {
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => listUsers({ pageSize: 100 }),
    enabled: open,
  })

  const assignMutation = useMutation({
    mutationFn: () => assignUserToGroup(group.id, selectedUserId),
    onSuccess: () => {
      toast.success('Đã thêm người dùng vào nhóm')
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Thao tác thất bại'),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm người dùng vào &quot;{group.name}&quot;</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder={usersLoading ? 'Đang tải...' : 'Chọn người dùng'} />
            </SelectTrigger>
            <SelectContent>
              {usersData?.data?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedUserId || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2Icon className="size-4 animate-spin mr-2" />}
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function PermissionsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)
  const [assignGroup, setAssignGroup] = useState<PermissionGroup | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: listGroups,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      toast.success('Đã xóa nhóm quyền')
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
      setDeleteTargetId(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Xóa thất bại'),
  })

  const groups = data?.data ?? []

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Phân quyền</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {groups.length} nhóm quyền
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4 mr-2" />
            Tạo nhóm mới
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-lg border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground border rounded-lg">
            Chưa có nhóm quyền nào. Tạo nhóm đầu tiên!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {group.permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Không có quyền nào</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {group.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS] ?? p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAssignGroup(group)}
                  >
                    <UserPlusIcon className="size-3.5 mr-1.5" />
                    Thêm user
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingGroup(group)}
                  >
                    <EditIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTargetId(group.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <GroupFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit dialog */}
      {editingGroup && (
        <GroupFormDialog
          open={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          editing={editingGroup}
        />
      )}

      {/* Assign user dialog */}
      {assignGroup && (
        <AssignUserDialog
          open={!!assignGroup}
          onClose={() => setAssignGroup(null)}
          group={assignGroup}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nhóm quyền này không? Hành động này không thể hoàn tác.
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
