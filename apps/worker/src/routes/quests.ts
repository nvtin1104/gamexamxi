import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { groupQuests } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'

const questsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/quests — All active quests for user's groups
questsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  // Get user's groups
  const memberships = await db.query.groupMembers.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
  })
  const groupIds = memberships.map((m) => m.groupId)

  if (groupIds.length === 0) return c.json({ data: [], ok: true })

  // Get active quests from those groups
  const quests = await Promise.all(
    groupIds.map((groupId) =>
      db.query.groupQuests.findMany({
        where: (t, { and, eq }) => and(eq(t.groupId, groupId), eq(t.status, 'ACTIVE')),
      })
    )
  )

  return c.json({ data: quests.flat(), ok: true })
})

export { questsRouter }
