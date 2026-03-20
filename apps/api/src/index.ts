import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { usersRoute } from './routes/users'
import { authRoute } from './routes/auth'
import { permissionsRoute } from './routes/permissions'
import { pointsRoute } from './routes/points'
import { xpRoute } from './routes/xp'
import { itemsRoute } from './routes/item-events'
import { pickemEventsRoute } from './routes/pickem-events'
import { mediaRoute } from './routes/media'
import { doRoute } from './routes/durable-objects'
import { handleQueueMessage } from './consumers'
import { GameRoom } from './durable-objects/game-room'
import { GroupRoom } from './durable-objects/group-room'
import { PointsLedger } from './durable-objects/points-ledger'
import type { Bindings } from './types'
import type { QueueMessage } from './types/queue-messages'

const app = new Hono<{ Bindings: Bindings }>()

// ── Global Middleware ────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', prettyJSON())
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGINS?.split(',') ?? ['*']
      if (allowed.includes('*') || allowed.includes(origin)) return origin
      return ''
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Set-Cookie'],
    credentials: true,
    maxAge: 86400,
  })
)

// ── Health Check ─────────────────────────────────────
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// ── API Routes ───────────────────────────────────────
app.route('/api/v1/auth', authRoute)
app.route('/api/v1/users', usersRoute)
app.route('/api/v1/permissions', permissionsRoute)
app.route('/api/v1/points', pointsRoute)
app.route('/api/v1/xp', xpRoute)
app.route('/api/v1/items', itemsRoute)
app.route('/api/v1/pickem-events', pickemEventsRoute)
app.route('/api/v1/media', mediaRoute)
app.route('/api/v1/durable-objects', doRoute)

// ── 404 Handler ──────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// ── Global Error Handler ─────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app

// ── Durable Objects ──────────────────────────────────
export { GameRoom, GroupRoom, PointsLedger }

// ── Queue Consumers ──────────────────────────────────
export const queue = async (batch: MessageBatch<QueueMessage>, env: Bindings) => {
  const deadLetterKey = `queue:deadletter:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`
  const processedMessages = { success: 0, failed: 0 }

  for (const message of batch.messages) {
    try {
      await handleQueueMessage(message.body as QueueMessage, env)
      message.ack()
      processedMessages.success++
    } catch (error) {
      processedMessages.failed++
      console.error(
        `[Queue] Error processing message (ID: ${message.id}):`,
        error,
        'Body:',
        message.body
      )

      // Store failed message in KV for observability
      try {
        const deadLetterEntry = {
          messageId: message.id,
          body: message.body,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          retryCount: (message.body as any)._retryCount ?? 0,
        }

        // After 3 retries, send to dead-letter storage
        if ((message.body as any)._retryCount >= 3) {
          console.warn(`[Queue] Message ${message.id} exceeded max retries, moving to dead-letter`)
          await env.CACHE.put(
            deadLetterKey,
            JSON.stringify(deadLetterEntry),
            { expirationTtl: 86400 * 30 } // 30-day retention
          )
          message.ack() // Acknowledge to prevent infinite retries
        } else {
          // Retry with incremented counter
          const retryBody = {
            ...(message.body as object),
            _retryCount: ((message.body as any)._retryCount ?? 0) + 1,
          }
          message.retry()
          console.log(`[Queue] Retrying message ${message.id} (attempt ${(retryBody as any)._retryCount})`)
        }
      } catch (dlError) {
        console.error('[Queue] Failed to store dead-letter:', dlError)
        message.retry() // Still retry even if dead-letter storage fails
      }
    }
  }

  console.log(
    `[Queue] Batch processed: ${processedMessages.success} succeeded, ${processedMessages.failed} failed`
  )
}
