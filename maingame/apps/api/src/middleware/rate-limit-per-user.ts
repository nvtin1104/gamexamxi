/**
 * Per-User Rate Limiter Middleware
 * Implements token bucket algorithm with KV storage
 * Limits: 100 requests per minute per user
 */

import { createMiddleware } from 'hono/factory'
import type { Bindings, Variables } from '../types'

interface RateLimitBucket {
  tokens: number
  lastRefill: number
}

const RATE_LIMIT_REQUESTS = 100 // Requests per minute
const RATE_LIMIT_WINDOW = 60 // Seconds
const KV_KEY_PREFIX = 'ratelimit:user:'
const KV_TTL = 3600 // 1 hour

/**
 * Per-user rate limiter middleware
 * Returns 429 Too Many Requests if limit exceeded
 */
export const perUserRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const userId = c.get('userId')

  if (!userId) {
    // Skip rate limiting if no user (public endpoint)
    await next()
    return
  }

  try {
    const kvKey = `${KV_KEY_PREFIX}${userId}`

    // Get current bucket from KV
    const storedBucket = await c.env.CACHE.get(kvKey)
    let bucket: RateLimitBucket = storedBucket
      ? JSON.parse(storedBucket)
      : { tokens: RATE_LIMIT_REQUESTS, lastRefill: Date.now() }

    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000 // Convert to seconds

    // Refill tokens based on time passed
    if (timePassed > 0) {
      const tokensToAdd = (timePassed / RATE_LIMIT_WINDOW) * RATE_LIMIT_REQUESTS
      bucket.tokens = Math.min(RATE_LIMIT_REQUESTS, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    // Check if request allowed
    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil(
        (RATE_LIMIT_WINDOW - timePassed) % RATE_LIMIT_WINDOW
      )

      // Save bucket state
      await c.env.CACHE.put(kvKey, JSON.stringify(bucket), { expirationTtl: KV_TTL })

      return c.json(
        {
          error: 'Too many requests',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + retryAfter * 1000).toString(),
          },
        }
      )
    }

    // Consume one token
    bucket.tokens -= 1

    // Save updated bucket
    await c.env.CACHE.put(kvKey, JSON.stringify(bucket), { expirationTtl: KV_TTL })

    // Add rate limit headers to response
    const remaining = Math.floor(bucket.tokens)
    const resetTime = new Date(bucket.lastRefill + RATE_LIMIT_WINDOW * 1000).getTime()

    c.header('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())

    console.log(
      `[RateLimit] User ${userId}: ${remaining + 1}/${RATE_LIMIT_REQUESTS} tokens remaining`
    )

    await next()
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    // On error, allow request to proceed (fail open)
    await next()
  }
})

/**
 * Endpoint-specific rate limiter (stricter limits for auth)
 * Limits: 20 requests per minute for auth endpoints
 */
export const authRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  // Use IP address for rate limiting (since user not authenticated yet)
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'

  try {
    const kvKey = `ratelimit:auth:${clientIp}`
    const storedBucket = await c.env.CACHE.get(kvKey)
    let bucket: RateLimitBucket = storedBucket
      ? JSON.parse(storedBucket)
      : { tokens: 20, lastRefill: Date.now() }

    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000

    // Refill tokens
    if (timePassed > 0) {
      const tokensToAdd = (timePassed / RATE_LIMIT_WINDOW) * 20
      bucket.tokens = Math.min(20, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }

    // Check limit
    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - timePassed) % RATE_LIMIT_WINDOW)

      await c.env.CACHE.put(kvKey, JSON.stringify(bucket), { expirationTtl: KV_TTL })

      return c.json(
        {
          error: 'auth_rate_limit_exceeded',
          message: 'Too many authentication attempts',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    bucket.tokens -= 1
    await c.env.CACHE.put(kvKey, JSON.stringify(bucket), { expirationTtl: KV_TTL })

    console.log(`[AuthRateLimit] IP ${clientIp}: ${Math.floor(bucket.tokens) + 1}/20 attempts remaining`)

    await next()
  } catch (error) {
    console.error('[AuthRateLimit] Error:', error)
    await next()
  }
})
