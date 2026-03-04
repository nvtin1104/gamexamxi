'use client'

import * as React from 'react'
import { Users, ShieldCheck, RefreshCw } from 'lucide-react'
import type { User, PermissionGroup } from '@gamexamxi/shared'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import { makeUserColumns, type UserAction } from './UserColumns'
import { UserEditSheet } from './UserEditSheet'
import { PermissionManagement } from '@/components/permissions/PermissionManagement'
import { api } from '@/lib/api'

// ── Filter definitions ────────────────────────────────────────────────────────

const ROLE_FILTER = {
  columnId: 'role',
  placeholder: 'Tất cả vai trò',
  options: [
    { label: 'Quản trị viên', value: 'admin' },
    { label: 'Kiểm duyệt viên', value: 'mod' },
    { label: 'Người dùng', value: 'user' },
  ],
}

const STATUS_FILTER = {
  columnId: 'status',
  placeholder: 'Tất cả trạng thái',
  options: [
    { label: 'Hoạt động', value: 'active' },
    { label: 'Bị cấm', value: 'banned' },
    { label: 'Bị khóa', value: 'block' },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserManagement() {
  const [users, setUsers] = React.useState<User[]>([])
  const [groups, setGroups] = React.useState<PermissionGroup[]>([])
  const [loadingUsers, setLoadingUsers] = React.useState(true)

  // Sheet state
  const [editUser, setEditUser] = React.useState<User | null>(null)
  const [assignedGroupIds, setAssignedGroupIds] = React.useState<string[]>([])
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // ── Data loading ────────────────────────────────────────────────────────

  async function loadData() {
    setLoadingUsers(true)
    try {
      const [usersRes, groupsRes] = await Promise.all([
        api.users.list(),
        api.permissions.listGroups(),
      ])
      setUsers(usersRes.data ?? [])
      setGroups(groupsRes.data ?? [])
    } catch (e) {
      console.error('Failed to load data', e)
    } finally {
      setLoadingUsers(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────

  async function openEditUser(user: User) {
    setEditUser(user)
    // Fetch user's current group assignments
    try {
      const permsRes = await api.permissions.getUserPermissions(user.id)
      // getUserPermissions returns merged permissions, not group ids
      // We need to cross-reference which groups assign those permissions
      // Simple heuristic: check group assignments by seeing which groups' perms subset match
      // Better: call a dedicated endpoint. For now, we use a client-side approach.
      const userPermSet = new Set(permsRes.data?.permissions ?? [])
      const matchedGroups = groups.filter((g) =>
        g.permissions.every((p) => userPermSet.has(p))
      )
      setAssignedGroupIds(matchedGroups.map((g) => g.id))
    } catch {
      setAssignedGroupIds([])
    }
    setSheetOpen(true)
  }

  async function handleAction(action: UserAction) {
    if (action.type === 'edit') {
      await openEditUser(action.user)
      return
    }

    if (action.type === 'ban') {
      const newStatus =
        action.user.status === 'active' ? 'banned' : 'active'
      try {
        const res = await api.users.update(action.user.id, { status: newStatus })
        setUsers((prev) =>
          prev.map((u) => (u.id === action.user.id ? res.data : u))
        )
      } catch (e) {
        console.error(e)
      }
      return
    }

    if (action.type === 'delete') {
      if (!confirm(`Xóa người dùng "${action.user.name}"?`)) return
      try {
        await api.users.delete(action.user.id)
        setUsers((prev) => prev.filter((u) => u.id !== action.user.id))
      } catch (e) {
        console.error(e)
      }
    }
  }

  async function handleSaveUser(id: string, updates: Partial<User>) {
    // Strip null values — UpdateUserInput uses `undefined` not `null`
    const payload = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v ?? undefined])
    )
    const res = await api.users.update(id, payload)
    setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)))
  }

  async function handleAssignGroups(
    userId: string,
    add: string[],
    remove: string[]
  ) {
    await Promise.all([
      ...add.map((gId) => api.permissions.assignUser(gId, userId)),
      ...remove.map((gId) => api.permissions.removeUser(gId, userId)),
    ])
  }

  // ── Column memoization ───────────────────────────────────────────────────

  const columns = React.useMemo(
    () => makeUserColumns({ onAction: handleAction }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users]
  )

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
            <p className="text-sm text-muted-foreground">
              {users.length} người dùng đã đăng ký
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loadingUsers}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
          Cài lại
        </Button>
      </div>

      {/* Tabs: Users / Permissions */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Nhóm quyền hạn
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ──────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          <DataTable
            columns={columns}
            data={users}
            searchColumn="email"
            searchPlaceholder="Tìm theo tên hoặc email…"
            filters={[ROLE_FILTER, STATUS_FILTER]}
            isLoading={loadingUsers}
            pageSize={15}
          />
        </TabsContent>

        {/* ── Permissions Tab ────────────────────────────────────────── */}
        <TabsContent value="permissions" className="mt-4">
          <PermissionManagement />
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <UserEditSheet
        user={editUser}
        open={sheetOpen}
        groups={groups}
        assignedGroupIds={assignedGroupIds}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveUser}
        onAssignGroups={handleAssignGroups}
      />
    </div>
  )
}
