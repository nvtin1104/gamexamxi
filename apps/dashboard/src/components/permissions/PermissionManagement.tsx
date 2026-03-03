'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { PermissionGroup } from '@gamexamxi/shared'
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import { PermissionChip } from '@/lib/formatters'
import { api } from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  'game:create', 'game:edit', 'game:delete', 'game:all',
  'user:moderate', 'user:ban',
  'points:grant', 'points:deduct',
  'xp:grant',
] as const

// ── Main Component ────────────────────────────────────────────────────────────

export function PermissionManagement() {
  const [groups, setGroups] = React.useState<PermissionGroup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<PermissionGroup | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Form state
  const [formName, setFormName] = React.useState('')
  const [formPerms, setFormPerms] = React.useState<Set<string>>(new Set())

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function loadGroups() {
    try {
      setLoading(true)
      const res = await api.permissions.listGroups()
      setGroups(res.data ?? [])
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadGroups()
  }, [])

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setFormName('')
    setFormPerms(new Set())
    setDialogOpen(true)
  }

  function openEdit(g: PermissionGroup) {
    setEditTarget(g)
    setFormName(g.name)
    setFormPerms(new Set(g.permissions))
    setDialogOpen(true)
  }

  function togglePerm(p: string) {
    setFormPerms((prev) => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  async function handleSave() {
    if (!formName.trim() || formPerms.size === 0) return
    setSaving(true)
    try {
      const permissions = [...formPerms]
      if (editTarget) {
        const res = await api.permissions.updateGroup(editTarget.id, { permissions })
        setGroups((prev) =>
          prev.map((g) => (g.id === editTarget.id ? res.data : g))
        )
      } else {
        const res = await api.permissions.createGroup({ name: formName.trim(), permissions })
        setGroups((prev) => [...prev, res.data])
      }
      setDialogOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this permission group?')) return
    await api.permissions.deleteGroup(id)
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnDef<PermissionGroup, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Group Name',
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'permissions',
      header: 'Permissions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.permissions.map((p) => (
            <PermissionChip key={p} perm={p} />
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Permission Groups</h2>
          <p className="text-sm text-muted-foreground">
            Manage named groups and their permissions.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={groups}
        searchColumn="name"
        searchPlaceholder="Search groups…"
        isLoading={loading}
        pageSize={10}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Group' : 'Create Group'}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? 'Update the permissions for this group.'
                : 'Create a new permission group.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name (disabled when editing) */}
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input
                placeholder="e.g. Moderation Team"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={!!editTarget}
              />
            </div>

            {/* Permissions checkboxes */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((p) => {
                  const checked = formPerms.has(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePerm(p)}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-mono transition-colors ${
                        checked
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div
                        className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${
                          checked ? 'bg-primary border-primary' : 'border-input'
                        }`}
                      />
                      {p}
                    </button>
                  )
                })}
              </div>
              {formPerms.size === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select at least one permission.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim() || formPerms.size === 0}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
