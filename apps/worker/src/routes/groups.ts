import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { groups, groupMembers, groupQuests, questCompletions } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { getCache, setCache, invalidateCache, KVKeys } from '../lib/kv'
import { trackEvent } from '../lib/analytics'
import { CACHE_TTL_MEDIUM } from '@gamexamxi/shared'

const groupsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/groups — My groups
groupsRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
    with: { group: true },
  })

  return c.json({ data: memberships.map((m) => m.group), ok: true })
})

// POST /api/groups — Create group
groupsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(2).max(50),
      description: z.string().max(500).optional(),
      style: z.enum(['FRIENDS', 'COUPLE', 'FAMILY']),
      isPrivate: z.boolean().default(false),
    })
  ),
  async (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')
    const db = createDb(c.env.DB)

    const [group] = await db.insert(groups).values({ ...body, createdBy: userId }).returning()

    // Auto-add creator as OWNER
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId,
      role: 'OWNER',
    })

    // Achievement check
    await c.env.ACHIEVEMENTS_QUEUE.send({
      userId,
      trigger: 'GROUP_JOIN',
      metadata: { groupId: group.id, role: 'OWNER' },
    })

    trackEvent(c.env.ANALYTICS, { type: 'GROUP_CREATED', userId, groupId: group.id })

    return c.json({ data: group, ok: true }, 201)
  }
)

// GET /api/groups/:id — Get group
groupsRouter.get('/:id', async (c) => {
  const groupId = c.req.param('id')
  const userId = c.get('userId')

  const cacheKey = KVKeys.groupCache(groupId)
  const cached = await getCache(c.env.KV_CACHE, cacheKey)
  if (cached) return c.json({ data: cached, ok: true })

  const db = createDb(c.env.DB)

  // Check membership
  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  })

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  })

  if (!group) return c.json({ error: 'Group not found', ok: false }, 404)
  if (group.isPrivate && !membership) {
    return c.json({ error: 'Access denied', ok: false }, 403)
  }

  await setCache(c.env.KV_CACHE, cacheKey, group, CACHE_TTL_MEDIUM)
  return c.json({ data: group, ok: true })
})

// POST /api/groups/join — Join by invite code
groupsRouter.post(
  '/join',
  zValidator('json', z.object({ inviteCode: z.string().length(8) })),
  async (c) => {
    const userId = c.get('userId')
    const { inviteCode } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const group = await db.query.groups.findFirst({
      where: eq(groups.inviteCode, inviteCode.toUpperCase()),
    })

    if (!group) return c.json({ error: 'Invalid invite code', ok: false }, 404)

    const existing = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)),
    })
    if (existing) return c.json({ error: 'Already a member', ok: false }, 409)

    await db.insert(groupMembers).values({ groupId: group.id, userId, role: 'MEMBER' })

    await invalidateCache(c.env.KV_CACHE, KVKeys.groupCache(group.id))

    await c.env.ACHIEVEMENTS_QUEUE.send({
      userId,
      trigger: 'GROUP_JOIN',
      metadata: { groupId: group.id },
    })

    trackEvent(c.env.ANALYTICS, { type: 'GROUP_JOINED', userId, groupId: group.id })

    return c.json({ data: group, ok: true })
  }
)

// GET /api/groups/:id/members
groupsRouter.get('/:id/members', async (c) => {
  const groupId = c.req.param('id')
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  })
  if (!membership) return c.json({ error: 'Access denied', ok: false }, 403)

  const members = await db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    with: { user: { columns: { passwordHash: false } } },
  })

  return c.json({ data: members, ok: true })
})

// GET /api/groups/:id/quests
groupsRouter.get('/:id/quests', async (c) => {
  const groupId = c.req.param('id')
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const membership = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
  })
  if (!membership) return c.json({ error: 'Access denied', ok: false }, 403)

  const quests = await db.query.groupQuests.findMany({
    where: and(eq(groupQuests.groupId, groupId), eq(groupQuests.status, 'ACTIVE')),
  })

  return c.json({ data: quests, ok: true })
})

// POST /api/groups/:id/quests — Create quest
groupsRouter.post(
  '/:id/quests',
  zValidator(
    'json',
    z.object({
      title: z.string().min(5).max(200),
      description: z.string().max(500).optional(),
      pointReward: z.number().int().min(10).max(1000).default(50),
      deadline: z.string().datetime().optional(),
      assignedTo: z.array(z.string().uuid()).optional(),
    })
  ),
  async (c) => {
    const groupId = c.req.param('id')
    const userId = c.get('userId')
    const body = c.req.valid('json')
    const db = createDb(c.env.DB)

    const membership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    })
    if (!membership || membership.role === 'MEMBER') {
      return c.json({ error: 'Only admins can create quests', ok: false }, 403)
    }

    const [quest] = await db
      .insert(groupQuests)
      .values({ ...body, groupId, createdBy: userId })
      .returning()

    return c.json({ data: quest, ok: true }, 201)
  }
)

// POST /api/groups/:id/quests/:questId/complete
groupsRouter.post('/:id/quests/:questId/complete', async (c) => {
  const groupId = c.req.param('id')
  const questId = c.req.param('questId')
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const quest = await db.query.groupQuests.findFirst({
    where: and(eq(groupQuests.id, questId), eq(groupQuests.groupId, groupId)),
  })
  if (!quest) return c.json({ error: 'Quest not found', ok: false }, 404)
  if (quest.status !== 'ACTIVE') return c.json({ error: 'Quest is not active', ok: false }, 400)

  const existing = await db.query.questCompletions.findFirst({
    where: and(eq(questCompletions.questId, questId), eq(questCompletions.userId, userId)),
  })
  if (existing) return c.json({ error: 'Quest already completed', ok: false }, 409)

  await db.insert(questCompletions).values({ questId, userId })

  if (quest.pointReward) {
    await c.env.POINTS_QUEUE.send({
      type: 'QUEST_COMPLETE',
      userId,
      amount: quest.pointReward,
      referenceId: questId,
      note: `Quest: ${quest.title}`,
    })
  }

  return c.json({ ok: true, message: 'Quest completed!' })
})

export { groupsRouter }
