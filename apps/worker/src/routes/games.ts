import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc, isNull } from 'drizzle-orm'
import { predictionEvents, predictions } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { getCache, setCache, KVKeys } from '../lib/kv'
import { trackEvent } from '../lib/analytics'
import { chunk } from '../lib/utils'
import { CACHE_TTL_SHORT } from '@gamexamxi/shared'

// ─── Public (no auth) — guests can browse events ──────────────
const publicGamesRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/games — List events
publicGamesRouter.get('/', async (c) => {
  const {
    status = 'OPEN',
    groupId,
    limit = '20',
    offset = '0',
  } = c.req.query()

  const cacheKey = KVKeys.eventsListCache(status, groupId ?? 'global', limit, offset)
  const cached = await getCache(c.env.KV_CACHE, cacheKey)
  if (cached) return c.json({ data: cached, ok: true })

  const db = createDb(c.env.DB)
  const events = await db.query.predictionEvents.findMany({
    where: and(
      eq(predictionEvents.status, status as 'OPEN' | 'LOCKED' | 'RESOLVED' | 'CANCELLED'),
      groupId ? eq(predictionEvents.groupId, groupId) : isNull(predictionEvents.groupId)
    ),
    orderBy: desc(predictionEvents.createdAt),
    limit: parseInt(limit),
    offset: parseInt(offset),
  })

  await setCache(c.env.KV_CACHE, cacheKey, events, CACHE_TTL_SHORT)
  return c.json({ data: events, ok: true })
})

// GET /api/games/:id — Get single event
publicGamesRouter.get('/:id', async (c) => {
  const eventId = c.req.param('id')
  const cacheKey = KVKeys.eventCache(eventId)
  const cached = await getCache(c.env.KV_CACHE, cacheKey)
  if (cached) return c.json({ data: cached, ok: true })

  const db = createDb(c.env.DB)
  const event = await db.query.predictionEvents.findFirst({
    where: eq(predictionEvents.id, eventId),
  })

  if (!event) return c.json({ error: 'Event not found', ok: false }, 404)

  await setCache(c.env.KV_CACHE, cacheKey, event, CACHE_TTL_SHORT)
  return c.json({ data: event, ok: true })
})

// GET /api/games/:id/stats — Live stats (public)
publicGamesRouter.get('/:id/stats', async (c) => {
  const eventId = c.req.param('id')
  try {
    const roomId = c.env.GAME_ROOM.idFromName(eventId)
    const room = c.env.GAME_ROOM.get(roomId)
    const response = await room.fetch(new Request('https://do/stats'))
    const stats = await response.json()
    return c.json({ data: stats, ok: true })
  } catch {
    return c.json({ data: null, ok: false, error: 'Stats unavailable' })
  }
})

// ─── Protected (auth required) — write operations ─────────────
const gamesRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/games — Create event
gamesRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      title: z.string().min(5).max(200),
      description: z.string().max(1000).optional(),
      type: z.enum(['BINARY', 'SCORE', 'RANKING', 'POLL', 'TIMELINE']),
      options: z.unknown(),
      pointReward: z.number().int().min(10).max(10000).default(100),
      bonusMultiplier: z.number().min(1.0).max(5.0).default(1.0),
      predictDeadline: z.string().datetime(),
      resolveAt: z.string().datetime().optional(),
      groupId: z.string().uuid().optional(),
      isPublic: z.boolean().default(true),
    })
  ),
  async (c) => {
    const userId = c.get('userId')
    const { title, description, type, options, pointReward, bonusMultiplier, predictDeadline, resolveAt, groupId, isPublic } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const [event] = await db
      .insert(predictionEvents)
      .values({
        creatorId: userId,
        title,
        description,
        type,
        options: options ?? null,
        pointReward: pointReward ?? 100,
        bonusMultiplier: bonusMultiplier ?? 1.0,
        predictDeadline,
        resolveAt,
        groupId,
        isPublic: isPublic ?? true,
      })
      .returning()

    // Initialize Durable Object for this event
    const roomId = c.env.GAME_ROOM.idFromName(event.id)
    const room = c.env.GAME_ROOM.get(roomId)
    await room.fetch(
      new Request('https://do/init', {
        method: 'POST',
        body: JSON.stringify({ eventId: event.id }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    trackEvent(c.env.ANALYTICS, { type: 'EVENT_CREATED', userId, eventId: event.id })

    return c.json({ data: event, ok: true }, 201)
  }
)

// POST /api/games/:id/predict — Submit prediction
gamesRouter.post(
  '/:id/predict',
  zValidator('json', z.object({ answer: z.unknown() })),
  async (c) => {
    const eventId = c.req.param('id')
    const userId = c.get('userId')
    const { answer } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const event = await db.query.predictionEvents.findFirst({
      where: eq(predictionEvents.id, eventId),
    })

    if (!event) return c.json({ error: 'Event not found', ok: false }, 404)
    if (event.status !== 'OPEN') return c.json({ error: 'Predictions are closed', ok: false }, 400)
    if (new Date(event.predictDeadline) < new Date()) {
      return c.json({ error: 'Prediction deadline has passed', ok: false }, 400)
    }

    // Check if already predicted
    const existing = await db.query.predictions.findFirst({
      where: and(eq(predictions.userId, userId), eq(predictions.eventId, eventId)),
    })
    if (existing) {
      return c.json({ error: 'You have already made a prediction', ok: false }, 409)
    }

    const [prediction] = await db
      .insert(predictions)
      .values({ userId, eventId, answer })
      .returning()

    // Update live counter in Durable Object
    try {
      const roomId = c.env.GAME_ROOM.idFromName(eventId)
      const room = c.env.GAME_ROOM.get(roomId)
      await room.fetch(
        new Request('https://do/predict', {
          method: 'POST',
          body: JSON.stringify({ userId, answer: JSON.stringify(answer) }),
          headers: { 'Content-Type': 'application/json' },
        })
      )
    } catch {
      // DO update is best-effort, don't fail the request
    }

    // Trigger achievement check
    await c.env.ACHIEVEMENTS_QUEUE.send({
      userId,
      trigger: 'PREDICTION_CORRECT',
      metadata: { eventId },
    })

    trackEvent(c.env.ANALYTICS, { type: 'PREDICTION_SUBMIT', userId, eventId })

    return c.json({ data: prediction, ok: true, message: 'Prediction recorded!' })
  }
)

// POST /api/games/:id/resolve — Resolve event (creator/admin only)
gamesRouter.post('/:id/resolve', async (c) => {
  const eventId = c.req.param('id')
  const userId = c.get('userId')
  const { correctAnswer } = await c.req.json<{ correctAnswer: unknown }>()
  const db = createDb(c.env.DB)

  const event = await db.query.predictionEvents.findFirst({
    where: eq(predictionEvents.id, eventId),
  })
  if (!event) return c.json({ error: 'Event not found', ok: false }, 404)
  if (event.creatorId !== userId) {
    return c.json({ error: 'Only the creator can resolve this event', ok: false }, 403)
  }
  if (event.status === 'RESOLVED') {
    return c.json({ error: 'Event already resolved', ok: false }, 400)
  }

  // Mark event resolved
  await db
    .update(predictionEvents)
    .set({ status: 'RESOLVED', correctAnswer })
    .where(eq(predictionEvents.id, eventId))

  // Get all predictions for this event
  const allPredictions = await db.query.predictions.findMany({
    where: eq(predictions.eventId, eventId),
  })

  const winners = allPredictions.filter(
    (p) => JSON.stringify(p.answer) === JSON.stringify(correctAnswer)
  )

  // Queue points for winners
  const pointMessages = winners.map((p) => ({
    type: 'PREDICTION_WIN' as const,
    userId: p.userId!,
    amount: Math.floor(event.pointReward * event.bonusMultiplier),
    referenceId: eventId,
    note: `Won: ${event.title}`,
  }))

  if (pointMessages.length > 0) {
    await Promise.all(
      chunk(pointMessages, 10).map((batch) =>
        c.env.POINTS_QUEUE.sendBatch(batch.map((body) => ({ body })))
      )
    )
  }

  // Mark correct/wrong in DB (batch)
  const updateBatch = [
    ...winners.map((p) =>
      db
        .update(predictions)
        .set({ isCorrect: true, pointsEarned: Math.floor(event.pointReward * event.bonusMultiplier) })
        .where(eq(predictions.id, p.id))
    ),
    ...allPredictions
      .filter((p) => !winners.find((w) => w.id === p.id))
      .map((p) =>
        db.update(predictions).set({ isCorrect: false, pointsEarned: 0 }).where(eq(predictions.id, p.id))
      ),
  ]

  // Execute in batches of 20 to avoid D1 limits
  for (const batch of chunk(updateBatch, 20)) {
    await Promise.all(batch)
  }

  // Broadcast result via Durable Object
  try {
    const roomId = c.env.GAME_ROOM.idFromName(eventId)
    const room = c.env.GAME_ROOM.get(roomId)
    await room.fetch(
      new Request('https://do/resolve', {
        method: 'POST',
        body: JSON.stringify({ correctAnswer }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
  } catch {
    // Best-effort
  }

  trackEvent(c.env.ANALYTICS, {
    type: 'EVENT_RESOLVED',
    userId,
    eventId,
    value: winners.length,
  })

  return c.json({
    ok: true,
    data: {
      totalParticipants: allPredictions.length,
      winners: winners.length,
    },
  })
})

export { publicGamesRouter, gamesRouter }
