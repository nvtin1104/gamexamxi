'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { PermissionGroup } from '@gamexamxi/shared'

const PERMISSION_GROUPS: Record<string, string[]> = {
  'Events':  ['events:read', 'events:create', 'events:resolve', 'events:manage', 'events:delete'],
  'Groups':  ['groups:read', 'groups:create', 'groups:manage'],
  'Users':   ['users:read', 'users:manage', 'users:suspend'],
  'Shop':    ['shop:purchase', 'shop:manage'],
  'Points':  ['points:grant'],
  'Quests':  ['quests:create', 'quests:manage'],
  'Admin':   ['admin:panel', 'admin:root'],
}

const EMPTY_FORM = { name: '', description: '', permissions: [] as string[] }

export default function PermissionGroupsPage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PermissionGroup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PermissionGroup | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => adminApi.listPermissionGroups(token!),
    enabled: !!token,
  })

  const pgList = data?.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['permission-groups'] })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createPermissionGroup(form, token!),
    onSuccess: () => { invalidate(); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updatePermissionGroup(editTarget!.id, form, token!),
    onSuccess: () => { invalidate(); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePermissionGroup(id, token!),
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (pg: PermissionGroup) => {
    setEditTarget(pg)
    setForm({ name: pg.name, description: pg.description ?? '', permissions: pg.permissions })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const togglePerm = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const handleSave = () => {
    if (editTarget) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const saveError = (createMutation.error || updateMutation.error) as Error | null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Permission Groups</h1>
          <p className="text-sm text-muted-foreground">Nhóm quyền có thể gán cho nhiều người dùng</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tạo nhóm mới
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pgList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Chưa có nhóm quyền nào.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              Tạo nhóm đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pgList.map(pg => (
            <Card key={pg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{pg.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {pg.permissions.length} quyền
                      </span>
                    </div>
                    {pg.description && (
                      <p className="text-xs text-muted-foreground mb-2">{pg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {pg.permissions.map(perm => (
                        <Badge key={perm} variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(pg)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(pg)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? `Sửa: ${editTarget.name}` : 'Tạo nhóm quyền mới'}
        className="max-w-xl"
      >
        <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="pg-name">Tên nhóm</Label>
            <Input
              id="pg-name"
              placeholder="vd: Content Manager"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-desc">Mô tả (tuỳ chọn)</Label>
            <Input
              id="pg-desc"
              placeholder="Mô tả ngắn gọn về nhóm quyền..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label className="mb-2 block">Quyền ({form.permissions.length} đã chọn)</Label>
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
              <div key={group} className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group}</p>
                <div className="space-y-1">
                  {perms.map(perm => (
                    <label
                      key={perm}
                      className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm)}
                        onChange={() => togglePerm(perm)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="font-mono text-xs flex-1">{perm}</span>
                      {perm === 'admin:root' && (
                        <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">root only</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {saveError && (
            <p className="text-sm text-destructive">{saveError.message}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={closeDialog}>Huỷ</Button>
          <Button
            size="sm"
            disabled={isSaving || !form.name.trim()}
            onClick={handleSave}
          >
            {isSaving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Tạo nhóm'}
          </Button>
        </div>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xoá nhóm quyền"
      >
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xoá nhóm <strong className="text-foreground">{deleteTarget?.name}</strong>?
            Tất cả user được gán nhóm này sẽ mất quyền tương ứng.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
          <Button
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
