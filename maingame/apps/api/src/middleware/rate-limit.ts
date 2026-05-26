import { createMiddleware } from 'hono/factory'
import type { Bindings } from '../types'

/**
 * KV-based rate limiting middleware using a sliding-window token bucket.
 * @param limit - Max requests per window
 * @param windowSeconds - Window size in seconds
 */
export const rateLimiter = (limit = 100, windowSeconds = 60) =>
  createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const key = `rate:${ip}`

    const record = await c.env.CACHE.get<{
      count: number
      resetAt: number
    }>(key, 'json')

    const now = Date.now()

    if (record && now < record.resetAt) {
      if (record.count >= limit) {
        return c.json(
          { error: 'Too many requests', code: 'RATE_LIMITED' },
          429
        )
      }
      await c.env.CACHE.put(
        key,
        JSON.stringify({ count: record.count + 1, resetAt: record.resetAt }),
        { expirationTtl: windowSeconds }
      )
    } else {
      await c.env.CACHE.put(
        key,
        JSON.stringify({ count: 1, resetAt: now + windowSeconds * 1000 }),
        { expirationTtl: windowSeconds }
      )
    }

    await next()
  })
