import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { PermissionService } from '../services/permission.service'
import type { Bindings, Variables } from '../types'

export const permissionsRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

// All permission routes require authentication
permissionsRoute.use('*', authMiddleware)

// ── Group CRUD (admin only) ──────────────────────────

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).min(1),
})

const updateGroupSchema = z.object({
  permissions: z.array(z.string()).min(1),
})

// GET /api/v1/permissions/groups — list all groups
permissionsRoute.get('/groups', async (c) => {
  const svc = new PermissionService(c.env.DB)
  const groups = await svc.listGroups()
  return c.json({
    data: groups.map((g) => ({
      ...g,
      permissions: JSON.parse(g.permissions),
    })),
  })
})

// POST /api/v1/permissions/groups — create group (admin)
permissionsRoute.post(
  '/groups',
  requireRole('admin'),
  zValidator('json', createGroupSchema),
  async (c) => {
    const { name, permissions } = c.req.valid('json')
    const svc = new PermissionService(c.env.DB)
    const group = await svc.createGroup(name, permissions)
    return c.json(
      { data: { ...group, permissions: JSON.parse(group.permissions) } },
      201
    )
  }
)

// PATCH /api/v1/permissions/groups/:id — update group permissions (admin)
permissionsRoute.patch(
  '/groups/:id',
  requireRole('admin'),
  zValidator('json', updateGroupSchema),
  async (c) => {
    const id = c.req.param('id')
    const { permissions } = c.req.valid('json')
    const svc = new PermissionService(c.env.DB)
    const group = await svc.updateGroup(id, permissions)
    if (!group) return c.json({ error: 'Group not found' }, 404)
    return c.json({
      data: { ...group, permissions: JSON.parse(group.permissions) },
    })
  }
)

// DELETE /api/v1/permissions/groups/:id — delete group (admin)
permissionsRoute.delete('/groups/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id')
  const svc = new PermissionService(c.env.DB)
  await svc.deleteGroup(id)
  return c.json({ success: true })
})

// ── User ↔ Group assignment ──────────────────────────

const assignSchema = z.object({
  userId: z.string().min(1),
})

// POST /api/v1/permissions/groups/:id/users — assign user to group (admin)
permissionsRoute.post(
  '/groups/:id/users',
  requireRole('admin'),
  zValidator('json', assignSchema),
  async (c) => {
    const groupId = c.req.param('id')
    const { userId } = c.req.valid('json')
    const svc = new PermissionService(c.env.DB)
    await svc.assignUserToGroup(userId, groupId)
    return c.json({ success: true }, 201)
  }
)

// DELETE /api/v1/permissions/groups/:id/users/:userId — remove user from group (admin)
permissionsRoute.delete(
  '/groups/:id/users/:userId',
  requireRole('admin'),
  async (c) => {
    const groupId = c.req.param('id')
    const userId = c.req.param('userId')
    const svc = new PermissionService(c.env.DB)
    await svc.removeUserFromGroup(userId, groupId)
    return c.json({ success: true })
  }
)

// ── User permissions query ───────────────────────────

// GET /api/v1/permissions/users/:id — get merged permissions of a user
permissionsRoute.get('/users/:id', async (c) => {
  const userId = c.req.param('id')
  const svc = new PermissionService(c.env.DB)
  const permissions = await svc.getUserPermissions(userId)
  return c.json({ data: { userId, permissions } })
})
