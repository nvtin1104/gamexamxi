import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'
import { checkRateLimit, KVKeys } from '../lib/kv'

// Rate limits per route pattern
const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  '/api/auth/login': { limit: 10, window: 60 },
  '/api/auth/register': { limit: 5, window: 60 },
  default: { limit: 100, window: 60 },
}

export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  // Skip rate limiting if KV_RATELIMIT is not configured
  if (!c.env.KV_RATELIMIT) {
    await next()
    return
  }

  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
  const path = new URL(c.req.url).pathname
  const config = RATE_LIMITS[path] ?? RATE_LIMITS['default']
  const key = KVKeys.rateLimit(ip, path)

  const { allowed, remaining } = await checkRateLimit(
    c.env.KV_RATELIMIT,
    key,
    config.limit,
    config.window
  )

  c.header('X-RateLimit-Remaining', String(remaining))
  c.header('X-RateLimit-Limit', String(config.limit))

  if (!allowed) {
    return c.json({ error: 'Too many requests', ok: false }, 429)
  }

  await next()
}
