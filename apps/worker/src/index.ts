import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { MessageBatch } from '@cloudflare/workers-types'
import { authRouter } from './routes/auth'
import { gamesRouter, publicGamesRouter } from './routes/games'
import { groupsRouter } from './routes/groups'
import { shopRouter } from './routes/shop'
import { usersRouter } from './routes/users'
import { questsRouter } from './routes/quests'
import { adminRouter } from './routes/admin'
import { uploadsRouter } from './routes/uploads'
import { authMiddleware } from './middleware/auth'
import { adminAuthMiddleware } from './middleware/adminAuth'
import { rateLimitMiddleware } from './middleware/ratelimit'
import { handlePointsBatch } from './queue-handlers/points'
import { handleAchievementBatch } from './queue-handlers/achievements'
import { handleNotificationBatch } from './queue-handlers/notifications'
import type { Env, Variables } from './types'
import type { PointsQueueMessage, AchievementQueueMessage, NotificationQueueMessage } from '@gamexamxi/shared'

// Re-export Durable Objects so Wrangler can find them
export { GameRoom } from './durable-objects/GameRoom'
export { GroupRoom } from './durable-objects/GroupRoom'
export { PointsLedger } from './durable-objects/PointsLedger'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── Global Middleware ────────────────────────────────────────

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://gamexamxi.pages.dev',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8788',
      ]
      return allowed.includes(origin) ? origin : allowed[0]
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
)

app.use('*', logger())
app.use('*', rateLimitMiddleware)

// ─── Public Routes ────────────────────────────────────────────

app.route('/api/auth', authRouter)

app.get('/api/health', (c) => c.json({ ok: true, env: c.env.APP_ENV }))

// Public game read routes (no auth required — guests can browse events)
app.route('/api/games', publicGamesRouter)

// ─── Protected Routes ─────────────────────────────────────────

app.use('/api/*', authMiddleware)
app.route('/api/users', usersRouter)
app.route('/api/games', gamesRouter)
app.route('/api/groups', groupsRouter)
app.route('/api/shop', shopRouter)
app.route('/api/quests', questsRouter)
app.route('/api/uploads', uploadsRouter)

// ─── Admin Routes (require auth + admin check) ────────────────

app.use('/api/admin/*', adminAuthMiddleware)
app.route('/api/admin', adminRouter)

// ─── WebSocket Upgrade → Durable Objects ──────────────────────

app.get('/ws/game/:eventId', async (c) => {
  const eventId = c.req.param('eventId')
  const id = c.env.GAME_ROOM.idFromName(eventId)
  const room = c.env.GAME_ROOM.get(id)
  return room.fetch(c.req.raw)
})

app.get('/ws/group/:groupId', async (c) => {
  const groupId = c.req.param('groupId')
  const id = c.env.GROUP_ROOM.idFromName(groupId)
  const room = c.env.GROUP_ROOM.get(id)
  return room.fetch(c.req.raw)
})

// ─── CDN Proxy (serves R2 files — useful for dev & fallback) ──

app.get('/cdn/*', async (c) => {
  const key = c.req.path.replace('/cdn/', '')
  if (!key) return c.json({ error: 'Missing key', ok: false }, 400)

  const object = await c.env.R2_PUBLIC.get(key)
  if (!object) return c.notFound()

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable')
  headers.set('ETag', object.httpEtag)

  return new Response(object.body as ReadableStream, { headers })
})

// ─── 404 Handler ──────────────────────────────────────────────

app.notFound((c) => c.json({ error: 'Not found', ok: false }, 404))
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error', ok: false }, 500)
})

// ─── Export ───────────────────────────────────────────────────

export default {
  // HTTP handler
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  // Queue consumer handler
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    if (batch.queue === 'points-queue') {
      await handlePointsBatch(
        batch.messages as Parameters<typeof handlePointsBatch>[0],
        env
      )
    } else if (batch.queue === 'achievements-queue') {
      await handleAchievementBatch(
        batch.messages as Parameters<typeof handleAchievementBatch>[0],
        env
      )
    } else if (batch.queue === 'notifications-queue') {
      await handleNotificationBatch(
        batch.messages as Parameters<typeof handleNotificationBatch>[0],
        env
      )
    }
  },
}
