import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, like, or, sql } from 'drizzle-orm'
import { users, predictionEvents, groups, pointTransactions } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { sanitizeUser } from '../lib/auth'

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

export { adminRouter }
