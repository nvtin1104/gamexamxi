import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { usersRoute } from './routes/users'
import { authRoute } from './routes/auth'
import type { Bindings } from './types'

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

// ── 404 Handler ──────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// ── Global Error Handler ─────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
