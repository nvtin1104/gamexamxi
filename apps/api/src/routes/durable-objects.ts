/**
 * Durable Objects API Routes
 * Interfaces with GameRoom, GroupRoom, and PointsLedger
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import type { Bindings, Variables } from '../types'

export const doRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

// All DO routes require authentication
doRoute.use('*', authMiddleware)

// ────────────────────────────────────────────────────────
// GAME ROOM ROUTES (Per-Event)
// ────────────────────────────────────────────────────────

const pickSchema = z.object({
  optionId: z.string().min(1),
})

/** POST /api/v1/durable-objects/game-room/:eventId/pick */
doRoute.post(
  '/game-room/:eventId/pick',
  zValidator('json', pickSchema),
  async (c) => {
    const eventId = c.req.param('eventId')
    const userId = c.get('userId')
    const { optionId } = c.req.valid('json')

    try {
      const stub = c.env.GAME_ROOM.get(eventId)
      const response = await stub.fetch(
        new Request('http://do/pick', {
          method: 'POST',
          body: JSON.stringify({ userId, optionId }),
        })
      )

      const data = await response.json()
      return c.json(data, response.status as any)
    } catch (error) {
      console.error('[DO] GameRoom pick error:', error)
      return c.json({ error: 'Failed to submit pick' }, 500)
    }
  }
)

/** GET /api/v1/durable-objects/game-room/:eventId/state */
doRoute.get('/game-room/:eventId/state', async (c) => {
  const eventId = c.req.param('eventId')

  try {
    const stub = c.env.GAME_ROOM.get(eventId)
    const response = await stub.fetch(new Request('http://do/state', { method: 'GET' }))
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] GameRoom state error:', error)
    return c.json({ error: 'Failed to get game state' }, 500)
  }
})

/** GET /api/v1/durable-objects/game-room/:eventId/pick */
doRoute.get('/game-room/:eventId/pick', async (c) => {
  const eventId = c.req.param('eventId')
  const userId = c.get('userId')

  try {
    const stub = c.env.GAME_ROOM.get(eventId)
    const response = await stub.fetch(
      new Request(`http://do/pick/${userId}`, { method: 'GET' })
    )
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] GameRoom pick fetch error:', error)
    return c.json({ error: 'Failed to get pick' }, 500)
  }
})

/** POST /api/v1/durable-objects/game-room/:eventId/close */
doRoute.post('/game-room/:eventId/close', async (c) => {
  const eventId = c.req.param('eventId')

  // TODO: Add admin authorization check
  try {
    const stub = c.env.GAME_ROOM.get(eventId)
    const response = await stub.fetch(new Request('http://do/close', { method: 'POST' }))
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] GameRoom close error:', error)
    return c.json({ error: 'Failed to close picks' }, 500)
  }
})

/** WebSocket /api/v1/durable-objects/game-room/:eventId/ws */
doRoute.get('/game-room/:eventId/ws', async (c) => {
  const eventId = c.req.param('eventId')

  if (!c.req.header('upgrade')) {
    return c.json({ error: 'WebSocket upgrade required' }, 400)
  }

  try {
    const stub = c.env.GAME_ROOM.get(eventId)
    const response = await stub.fetch(
      new Request(c.req.raw.url.replace('/api/v1/durable-objects', ''), {
        method: 'GET',
        headers: c.req.raw.headers,
      })
    )
    return new Response(response.body, response)
  } catch (error) {
    console.error('[DO] GameRoom WebSocket error:', error)
    return c.json({ error: 'WebSocket connection failed' }, 500)
  }
})

// ────────────────────────────────────────────────────────
// GROUP ROOM ROUTES (Per-Group)
// ────────────────────────────────────────────────────────

const updateMemberSchema = z.object({
  userId: z.string().min(1),
  stats: z.object({
    username: z.string().optional(),
    points: z.number().optional(),
    level: z.number().optional(),
    picksMade: z.number().optional(),
    winsCount: z.number().optional(),
  }),
})

/** POST /api/v1/durable-objects/group-room/:groupId/update */
doRoute.post(
  '/group-room/:groupId/update',
  zValidator('json', updateMemberSchema),
  async (c) => {
    const groupId = c.req.param('groupId')
    const { userId, stats } = c.req.valid('json')

    // TODO: Add authorization check (user can only update own stats or admin)

    try {
      const stub = c.env.GROUP_ROOM.get(groupId)
      const response = await stub.fetch(
        new Request('http://do/update', {
          method: 'POST',
          body: JSON.stringify({ userId, stats }),
        })
      )
      const data = await response.json()
      return c.json(data)
    } catch (error) {
      console.error('[DO] GroupRoom update error:', error)
      return c.json({ error: 'Failed to update member stats' }, 500)
    }
  }
)

/** GET /api/v1/durable-objects/group-room/:groupId/leaderboard */
doRoute.get('/group-room/:groupId/leaderboard', async (c) => {
  const groupId = c.req.param('groupId')
  const limit = Number(c.req.query('limit') ?? '100')

  try {
    const stub = c.env.GROUP_ROOM.get(groupId)
    const response = await stub.fetch(
      new Request(`http://do/leaderboard?limit=${limit}`, { method: 'GET' })
    )
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] GroupRoom leaderboard error:', error)
    return c.json({ error: 'Failed to get leaderboard' }, 500)
  }
})

/** GET /api/v1/durable-objects/group-room/:groupId/rank */
doRoute.get('/group-room/:groupId/rank', async (c) => {
  const groupId = c.req.param('groupId')
  const userId = c.get('userId')

  try {
    const stub = c.env.GROUP_ROOM.get(groupId)
    const response = await stub.fetch(
      new Request(`http://do/rank/${userId}`, { method: 'GET' })
    )
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] GroupRoom rank error:', error)
    return c.json({ error: 'Failed to get user rank' }, 500)
  }
})

/** WebSocket /api/v1/durable-objects/group-room/:groupId/ws */
doRoute.get('/group-room/:groupId/ws', async (c) => {
  const groupId = c.req.param('groupId')

  if (!c.req.header('upgrade')) {
    return c.json({ error: 'WebSocket upgrade required' }, 400)
  }

  try {
    const stub = c.env.GROUP_ROOM.get(groupId)
    const response = await stub.fetch(
      new Request(c.req.raw.url.replace('/api/v1/durable-objects', ''), {
        method: 'GET',
        headers: c.req.raw.headers,
      })
    )
    return new Response(response.body, response)
  } catch (error) {
    console.error('[DO] GroupRoom WebSocket error:', error)
    return c.json({ error: 'WebSocket connection failed' }, 500)
  }
})

// ────────────────────────────────────────────────────────
// POINTS LEDGER ROUTES (Per-User)
// ────────────────────────────────────────────────────────

const recordTransactionSchema = z.object({
  type: z.enum(['credit', 'debit', 'adjustment']),
  amount: z.number(),
  reason: z.string(),
  metadata: z.record(z.any()).optional(),
})

/** POST /api/v1/durable-objects/points-ledger/:userId/record */
doRoute.post(
  '/points-ledger/:userId/record',
  zValidator('json', recordTransactionSchema),
  async (c) => {
    const userId = c.req.param('userId')
    const currentUserId = c.get('userId')

    // TODO: Add authorization (own balance or admin)

    const { type, amount, reason, metadata } = c.req.valid('json')

    try {
      const stub = c.env.POINTS_LEDGER.get(userId)
      const response = await stub.fetch(
        new Request('http://do/record', {
          method: 'POST',
          body: JSON.stringify({ type, amount, reason, metadata }),
        })
      )
      const data = await response.json()
      return c.json(data)
    } catch (error) {
      console.error('[DO] PointsLedger record error:', error)
      return c.json({ error: 'Failed to record transaction' }, 500)
    }
  }
)

/** GET /api/v1/durable-objects/points-ledger/:userId/balance */
doRoute.get('/points-ledger/:userId/balance', async (c) => {
  const userId = c.req.param('userId')

  try {
    const stub = c.env.POINTS_LEDGER.get(userId)
    const response = await stub.fetch(new Request('http://do/balance', { method: 'GET' }))
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] PointsLedger balance error:', error)
    return c.json({ error: 'Failed to get balance' }, 500)
  }
})

/** GET /api/v1/durable-objects/points-ledger/:userId/history */
doRoute.get('/points-ledger/:userId/history', async (c) => {
  const userId = c.req.param('userId')
  const limit = Number(c.req.query('limit') ?? '50')
  const offset = Number(c.req.query('offset') ?? '0')

  try {
    const stub = c.env.POINTS_LEDGER.get(userId)
    const response = await stub.fetch(
      new Request(`http://do/history?limit=${limit}&offset=${offset}`, { method: 'GET' })
    )
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] PointsLedger history error:', error)
    return c.json({ error: 'Failed to get history' }, 500)
  }
})

/** GET /api/v1/durable-objects/points-ledger/:userId/audit */
doRoute.get('/points-ledger/:userId/audit', async (c) => {
  const userId = c.req.param('userId')
  const currentUserId = c.get('userId')

  // TODO: Only allow admins
  if (currentUserId !== userId) {
    // Check if admin
    // return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const stub = c.env.POINTS_LEDGER.get(userId)
    const response = await stub.fetch(new Request('http://do/audit', { method: 'GET' }))
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    console.error('[DO] PointsLedger audit error:', error)
    return c.json({ error: 'Failed to audit ledger' }, 500)
  }
})
