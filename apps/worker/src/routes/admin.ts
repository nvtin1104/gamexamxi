import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, like, or, sql } from 'drizzle-orm'
import { users, predictionEvents, groups, pointTransactions, permissionGroups, userPermissionGroups } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { sanitizeUser, hashPassword } from '../lib/auth'
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, mergePermissions, type Permission } from '@gamexamxi/shared'

const adminRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/admin/stats — Platform overview stats
adminRouter.get('/stats', async (c) => {
  const db = createDb(c.env.DB)

  const [userCount, eventCount, groupCount, txCount, recentUsers] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users).then(r => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(predictionEvents).then(r => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(groups).then(r => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(pointTransactions).then(r => r[0]?.count ?? 0),
    db.query.users.findMany({
      orderBy: (u, { desc }) => desc(u.createdAt),
      limit: 10,
    }),
  ])

  return c.json({
    data: {
      totalUsers: Number(userCount),
      totalEvents: Number(eventCount),
      totalGroups: Number(groupCount),
      totalTransactions: Number(txCount),
      recentUsers: recentUsers.map(sanitizeUser),
    },
    ok: true,
  })
})

// GET /api/admin/users?limit=20&offset=0&search=
adminRouter.get('/users', async (c) => {
  const { limit = '20', offset = '0', search = '' } = c.req.query()
  const lim = Math.min(parseInt(limit, 10), 100)
  const off = parseInt(offset, 10)
  const db = createDb(c.env.DB)

  const whereClause = search
    ? or(
        like(users.username, `%${search}%`),
        like(users.email, `%${search}%`)
      )
    : undefined

  const [items, total] = await Promise.all([
    db.query.users.findMany({
      where: whereClause,
      orderBy: (u, { desc }) => desc(u.createdAt),
      limit: lim,
      offset: off,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause ?? sql`1=1`)
      .then(r => Number(r[0]?.count ?? 0)),
  ])

  return c.json({
    data: {
      items: items.map(sanitizeUser),
      total,
      limit: lim,
      offset: off,
      hasMore: off + lim < total,
    },
    ok: true,
  })
})

// POST /api/admin/users
adminRouter.post(
  '/users',
  zValidator(
    'json',
    z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['user', 'moderator', 'admin', 'root']).optional().default('user'),
    })
  ),
  async (c) => {
    const { username, email, password, role } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const existing = await db.query.users.findFirst({
      where: or(eq(users.username, username), eq(users.email, email)),
    })
    if (existing) {
      return c.json({ error: 'Username or email already exists', ok: false }, 409)
    }

    const hashedPassword = await hashPassword(password)
    const [newUser] = await db
      .insert(users)
      .values({ username, email, password: hashedPassword, role })
      .returning()

    if (!newUser) {
      return c.json({ error: 'Failed to create user', ok: false }, 500)
    }

    return c.json({ data: sanitizeUser(newUser), ok: true }, 201)
  }
)

// PUT /api/admin/users/:id
adminRouter.put(
  '/users/:id',
  zValidator(
    'json',
    z.object({
      username: z.string().min(3).optional(),
      email: z.string().email().optional(),
      role: z.enum(['user', 'moderator', 'admin', 'root']).optional(),
      status: z.enum(['active', 'suspended', 'banned']).optional(),
    })
  ),
  async (c) => {
    const id = c.req.param('id')
    const updates = c.req.valid('json')
    const db = createDb(c.env.DB)

    if (Object.keys(updates).length === 0) {
      const user = await db.query.users.findFirst({ where: eq(users.id, id) })
      if (!user) return c.json({ error: 'User not found', ok: false }, 404)
      return c.json({ data: sanitizeUser(user), ok: true })
    }

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning()

    if (!updated) {
      return c.json({ error: 'User not found', ok: false }, 404)
    }

    return c.json({ data: sanitizeUser(updated), ok: true })
  }
)

// GET /api/admin/users/:id
adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)

  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  const transactions = await db.query.pointTransactions.findMany({
    where: eq(pointTransactions.userId, id),
    orderBy: (t, { desc }) => desc(t.createdAt),
    limit: 20,
  })

  return c.json({
    data: { ...sanitizeUser(user), transactions },
    ok: true,
  })
})

// POST /api/admin/users/:id/points — Grant or deduct points
adminRouter.post(
  '/users/:id/points',
  zValidator(
    'json',
    z.object({
      amount: z.number().positive(),
      type: z.enum(['ADMIN_GRANT', 'ADMIN_DEDUCT']),
      note: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param('id')
    const { amount, type, note } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const user = await db.query.users.findFirst({ where: eq(users.id, id) })
    if (!user) return c.json({ error: 'User not found', ok: false }, 404)

    const delta = type === 'ADMIN_GRANT' ? amount : -amount
    const newPoints = Math.max(0, user.points + delta)

    await Promise.all([
      db.update(users).set({ points: newPoints }).where(eq(users.id, id)),
      db.insert(pointTransactions).values({
        userId: id,
        amount: delta,
        type,
        description: note ?? null,
        referenceId: null,
        balanceAfter: newPoints,
      }),
    ])

    const updated = await db.query.users.findFirst({ where: eq(users.id, id) })
    return c.json({ data: sanitizeUser(updated!), ok: true })
  }
)

// GET /api/admin/events?limit=20&offset=0&status=
adminRouter.get('/events', async (c) => {
  const { limit = '20', offset = '0', status = '' } = c.req.query()
  const lim = Math.min(parseInt(limit, 10), 100)
  const off = parseInt(offset, 10)
  const db = createDb(c.env.DB)

  const whereClause = status
    ? eq(predictionEvents.status, status as 'OPEN' | 'LOCKED' | 'RESOLVED' | 'CANCELLED')
    : undefined

  const [items, total] = await Promise.all([
    db.query.predictionEvents.findMany({
      where: whereClause,
      orderBy: (e, { desc }) => desc(e.createdAt),
      limit: lim,
      offset: off,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(predictionEvents)
      .where(whereClause ?? sql`1=1`)
      .then(r => Number(r[0]?.count ?? 0)),
  ])

  return c.json({
    data: { items, total, limit: lim, offset: off, hasMore: off + lim < total },
    ok: true,
  })
})

// DELETE /api/admin/events/:id
adminRouter.delete('/events/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)

  const event = await db.query.predictionEvents.findFirst({ where: eq(predictionEvents.id, id) })
  if (!event) return c.json({ error: 'Event not found', ok: false }, 404)

  await db.delete(predictionEvents).where(eq(predictionEvents.id, id))
  return c.json({ ok: true })
})

// GET /api/admin/groups?limit=20&offset=0
adminRouter.get('/groups', async (c) => {
  const { limit = '20', offset = '0' } = c.req.query()
  const lim = Math.min(parseInt(limit, 10), 100)
  const off = parseInt(offset, 10)
  const db = createDb(c.env.DB)

  const [items, total] = await Promise.all([
    db.query.groups.findMany({
      orderBy: (g, { desc }) => desc(g.createdAt),
      limit: lim,
      offset: off,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(groups)
      .then(r => Number(r[0]?.count ?? 0)),
  ])

  return c.json({
    data: { items, total, limit: lim, offset: off, hasMore: off + lim < total },
    ok: true,
  })
})

// GET /api/admin/transactions?limit=30&offset=0
adminRouter.get('/transactions', async (c) => {
  const { limit = '30', offset = '0' } = c.req.query()
  const lim = Math.min(parseInt(limit, 10), 100)
  const off = parseInt(offset, 10)
  const db = createDb(c.env.DB)

  const [items, total] = await Promise.all([
    db.query.pointTransactions.findMany({
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: lim,
      offset: off,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(pointTransactions)
      .then(r => Number(r[0]?.count ?? 0)),
  ])

  return c.json({
    data: { items, total, limit: lim, offset: off, hasMore: off + lim < total },
    ok: true,
  })
})

// ─── Permission Groups CRUD ───────────────────────────────────

// GET /api/admin/permission-groups — list all groups
adminRouter.get('/permission-groups', async (c) => {
  const db = createDb(c.env.DB)
  const items = await db.query.permissionGroups.findMany({
    orderBy: (g, { asc }) => asc(g.name),
  })
  return c.json({
    data: items.map(g => ({ ...g, permissions: JSON.parse(g.permissions) as string[] })),
    ok: true,
  })
})

// POST /api/admin/permission-groups — create
adminRouter.post(
  '/permission-groups',
  zValidator('json', z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(200).optional(),
    permissions: z.array(z.string()).refine(
      p => p.every(x => (ALL_PERMISSIONS as string[]).includes(x)),
      { message: 'Invalid permission value' }
    ),
  })),
  async (c) => {
    const { name, description, permissions } = c.req.valid('json')
    const db = createDb(c.env.DB)
    const [existing] = await db.select({ id: permissionGroups.id }).from(permissionGroups).where(eq(permissionGroups.name, name))
    if (existing) return c.json({ error: 'Group name already exists', ok: false }, 409)
    await db.insert(permissionGroups).values({
      name, description: description ?? null, permissions: JSON.stringify(permissions),
    })
    const group = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.name, name) })
    return c.json({ data: { ...group!, permissions }, ok: true }, 201)
  }
)

// GET /api/admin/permission-groups/:id
adminRouter.get('/permission-groups/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)
  const group = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.id, id) })
  if (!group) return c.json({ error: 'Group not found', ok: false }, 404)
  return c.json({ data: { ...group, permissions: JSON.parse(group.permissions) as string[] }, ok: true })
})

// PUT /api/admin/permission-groups/:id — update
adminRouter.put(
  '/permission-groups/:id',
  zValidator('json', z.object({
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(200).nullable().optional(),
    permissions: z.array(z.string()).refine(
      p => p.every(x => (ALL_PERMISSIONS as string[]).includes(x)),
      { message: 'Invalid permission value' }
    ).optional(),
  })),
  async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const db = createDb(c.env.DB)
    const existing = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.id, id) })
    if (!existing) return c.json({ error: 'Group not found', ok: false }, 404)
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.permissions !== undefined) updates.permissions = JSON.stringify(body.permissions)
    await db.update(permissionGroups).set(updates).where(eq(permissionGroups.id, id))
    const updated = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.id, id) })
    return c.json({ data: { ...updated!, permissions: JSON.parse(updated!.permissions) as string[] }, ok: true })
  }
)

// DELETE /api/admin/permission-groups/:id
adminRouter.delete('/permission-groups/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)
  const group = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.id, id) })
  if (!group) return c.json({ error: 'Group not found', ok: false }, 404)
  await db.delete(permissionGroups).where(eq(permissionGroups.id, id))
  return c.json({ ok: true })
})

// ─── User ↔ Permission Group assignment ──────────────────────

// GET /api/admin/users/:id/groups — list groups assigned to user
adminRouter.get('/users/:id/groups', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)
  const rows = await db
    .select({
      groupId: userPermissionGroups.groupId,
      assignedAt: userPermissionGroups.assignedAt,
      assignedBy: userPermissionGroups.assignedBy,
      name: permissionGroups.name,
      description: permissionGroups.description,
      permissions: permissionGroups.permissions,
    })
    .from(userPermissionGroups)
    .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
    .where(eq(userPermissionGroups.userId, id))
  return c.json({
    data: rows.map(r => ({
      groupId: r.groupId,
      assignedAt: r.assignedAt,
      assignedBy: r.assignedBy,
      name: r.name,
      description: r.description,
      permissions: JSON.parse(r.permissions) as string[],
    })),
    ok: true,
  })
})

// POST /api/admin/users/:id/groups — assign a group
adminRouter.post(
  '/users/:id/groups',
  zValidator('json', z.object({ groupId: z.string() })),
  async (c) => {
    const userId = c.req.param('id')
    const { groupId } = c.req.valid('json')
    const callerId = c.get('userId')
    const db = createDb(c.env.DB)
    const group = await db.query.permissionGroups.findFirst({ where: eq(permissionGroups.id, groupId) })
    if (!group) return c.json({ error: 'Permission group not found', ok: false }, 404)
    // Upsert — ignore if already assigned
    await db.insert(userPermissionGroups).values({ userId, groupId, assignedBy: callerId }).onConflictDoNothing()
    return c.json({ ok: true })
  }
)

// DELETE /api/admin/users/:id/groups/:groupId — unassign a group
adminRouter.delete('/users/:id/groups/:groupId', async (c) => {
  const userId = c.req.param('id')
  const groupId = c.req.param('groupId')
  const db = createDb(c.env.DB)
  await db
    .delete(userPermissionGroups)
    .where(and(eq(userPermissionGroups.userId, userId), eq(userPermissionGroups.groupId, groupId)))
  return c.json({ ok: true })
})

// GET /api/admin/users/:id/permissions — effective + custom permissions breakdown
adminRouter.get('/users/:id/permissions', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DB)

  const user = await db
    .select({ id: users.id, role: users.role, customPermissions: users.customPermissions })
    .from(users)
    .where(eq(users.id, id))
    .then(rows => rows[0])
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  const rolePerms = Array.from(ROLE_PERMISSIONS[user.role] ?? ROLE_PERMISSIONS.user)
  const customPerms: string[] = user.customPermissions ? JSON.parse(user.customPermissions) : []
  const effectivePerms = Array.from(mergePermissions(user.role, customPerms))

  return c.json({
    data: {
      userId: user.id,
      role: user.role,
      rolePermissions: rolePerms,
      customPermissions: customPerms,
      effectivePermissions: effectivePerms,
    },
    ok: true,
  })
})

// PUT /api/admin/users/:id/permissions — set custom permissions
adminRouter.put(
  '/users/:id/permissions',
  zValidator(
    'json',
    z.object({
      customPermissions: z.array(z.string()).refine(
        perms => perms.every(p => (ALL_PERMISSIONS as string[]).includes(p)),
        { message: 'One or more invalid permissions' }
      ),
    })
  ),
  async (c) => {
    const id = c.req.param('id')
    const { customPermissions } = c.req.valid('json')
    const callerRole = c.get('userRole')
    const db = createDb(c.env.DB)

    const target = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .then(rows => rows[0])
    if (!target) return c.json({ error: 'User not found', ok: false }, 404)

    // Only root can assign admin:root permission
    if (callerRole !== 'root' && (customPermissions as Permission[]).includes('admin:root')) {
      return c.json({ error: 'Forbidden: Only root can assign admin:root', ok: false }, 403)
    }

    const stored = customPermissions.length > 0 ? JSON.stringify(customPermissions) : null
    await db.update(users).set({ customPermissions: stored }).where(eq(users.id, id))

    const effectivePerms = Array.from(mergePermissions(target.role, customPermissions))

    return c.json({
      data: {
        userId: id,
        customPermissions,
        effectivePermissions: effectivePerms,
      },
      ok: true,
    })
  }
)

export { adminRouter }
