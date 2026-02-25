import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users, userAchievements, userItems, pointTransactions } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { getLeaderboard, KVKeys } from '../lib/kv'
import { sanitizeUser } from '../lib/auth'

const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/users/me
usersRouter.get('/me', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  return c.json({ data: sanitizeUser(user), ok: true })
})

// PATCH /api/users/me — Update profile
usersRouter.patch(
  '/me',
  zValidator(
    'json',
    z.object({
      bio: z.string().max(200).optional(),
      avatarUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId')
    const updates = c.req.valid('json')
    const db = createDb(c.env.DB)

    await db.update(users).set(updates).where(eq(users.id, userId))
    const updated = await db.query.users.findFirst({ where: eq(users.id, userId) })

    return c.json({ data: sanitizeUser(updated!), ok: true })
  }
)

// GET /api/users/:username — Public profile
usersRouter.get('/:username', async (c) => {
  const username = c.req.param('username')
  const db = createDb(c.env.DB)

  const user = await db.query.users.findFirst({ where: eq(users.username, username) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  const achievements = await db.query.userAchievements.findMany({
    where: eq(userAchievements.userId, user.id),
    limit: 10,
  })

  return c.json({
    data: {
      ...sanitizeUser(user),
      achievements,
    },
    ok: true,
  })
})

// GET /api/users/me/transactions
usersRouter.get('/me/transactions', async (c) => {
  const userId = c.get('userId')
  const { limit = '20', offset = '0' } = c.req.query()
  const db = createDb(c.env.DB)

  const transactions = await db.query.pointTransactions.findMany({
    where: eq(pointTransactions.userId, userId),
    orderBy: (t, { desc }) => desc(t.createdAt),
    limit: parseInt(limit),
    offset: parseInt(offset),
  })

  return c.json({ data: transactions, ok: true })
})

// GET /api/users/me/achievements
usersRouter.get('/me/achievements', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const achievements = await db.query.userAchievements.findMany({
    where: eq(userAchievements.userId, userId),
  })

  return c.json({ data: achievements, ok: true })
})

// GET /api/users/leaderboard
usersRouter.get('/leaderboard/global', async (c) => {
  const { limit = '100' } = c.req.query()
  const board = await getLeaderboard(
    c.env.KV_LEADERBOARD,
    KVKeys.globalLB(),
    parseInt(limit)
  )

  // Enrich with user data
  const db = createDb(c.env.DB)
  const enriched = await Promise.all(
    board.map(async (entry) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, entry.userId),
        columns: { id: true, username: true, avatarUrl: true },
      })
      return { ...entry, user }
    })
  )

  return c.json({ data: enriched, ok: true })
})

export { usersRouter }
