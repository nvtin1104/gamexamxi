/**
 * Rate Limiter Unit Tests
 * Tests token bucket algorithm with edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Context } from 'hono'
import { perUserRateLimitMiddleware, authRateLimitMiddleware } from '../rate-limit-per-user'

// Mock Hono Context and KV
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
}

const mockEnv = {
  CACHE: mockKV,
}

const createMockContext = (overrides = {}) => ({
  env: mockEnv,
  set: vi.fn(),
  get: vi.fn((key) => {
    if (key === 'userId') return 'user-123'
    return undefined
  }),
  json: vi.fn((data, status) => ({ data, status })),
  header: vi.fn((name) => {
    if (name === 'cf-connecting-ip') return '192.168.1.1'
    if (name === 'x-forwarded-for') return '10.0.0.1'
    return undefined
  }),
  ...overrides,
} as unknown as Context)

describe('perUserRateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow first request for fresh user', async () => {
    mockKV.get.mockResolvedValue(null) // No existing bucket
    const context = createMockContext()
    let nextCalled = false

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(true)
    expect(mockKV.put).toHaveBeenCalled()
  })

  it('should return 429 after 100 requests', async () => {
    // Simulate bucket with 0 tokens remaining
    const emptyBucket = { tokens: 0, lastRefill: Date.now() }
    mockKV.get.mockResolvedValue(JSON.stringify(emptyBucket))

    const context = createMockContext()
    let nextCalled = false

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(false)
    expect(context.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Too many requests' }),
      expect.objectContaining({ status: 429 })
    )
  })

  it('should refill tokens proportionally over time', async () => {
    const now = Date.now()
    const pastBucket = { tokens: 90, lastRefill: now - 6000 } // 6 seconds ago

    mockKV.get.mockResolvedValue(JSON.stringify(pastBucket))

    const context = createMockContext()
    let nextCalled = false

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(true)

    // After 6 seconds, should have refilled 6 tokens (1 per second of 60s window)
    const savedBucket = JSON.parse(mockKV.put.mock.calls[0][1])
    expect(savedBucket.tokens).toBeGreaterThan(90)
    expect(savedBucket.tokens).toBeLessThanOrEqual(96)
  })

  it('should cap tokens at max limit', async () => {
    const now = Date.now()
    // Simulate 70 seconds of refilling (should cap at 100)
    const pastBucket = { tokens: 50, lastRefill: now - 70000 }

    mockKV.get.mockResolvedValue(JSON.stringify(pastBucket))

    const context = createMockContext()
    let nextCalled = false

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(true)

    const savedBucket = JSON.parse(mockKV.put.mock.calls[0][1])
    expect(savedBucket.tokens).toBe(100) // Should cap at max
  })

  it('should add rate limit response headers', async () => {
    mockKV.get.mockResolvedValue(null)

    const context = createMockContext()
    const headerSpy = vi.fn()
    context.header = headerSpy

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {})

    expect(headerSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
    expect(headerSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
    expect(headerSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
  })

  it('should skip rate limiting if no userId', async () => {
    const context = createMockContext()
    context.get = vi.fn(() => null) // No userId

    let nextCalled = false
    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(true)
    expect(mockKV.get).not.toHaveBeenCalled()
  })

  it('should fail open on KV error', async () => {
    mockKV.get.mockRejectedValue(new Error('KV Error'))

    const context = createMockContext()
    let nextCalled = false

    const middleware = perUserRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    // Should allow request despite KV error (fail open)
    expect(nextCalled).toBe(true)
  })
})

describe('authRateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should limit auth endpoints to 20 requests per minute', async () => {
    // Simulate bucket with 0 tokens
    const emptyBucket = { tokens: 0, lastRefill: Date.now() }
    mockKV.get.mockResolvedValue(JSON.stringify(emptyBucket))

    const context = createMockContext()
    let nextCalled = false

    const middleware = authRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(false)
    expect(context.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'auth_rate_limit_exceeded' }),
      expect.objectContaining({ status: 429 })
    )
  })

  it('should use IP address for rate limiting', async () => {
    mockKV.get.mockResolvedValue(null)

    const context = createMockContext()
    const middleware = authRateLimitMiddleware
    await middleware(context, async () => {})

    const kvKey = mockKV.put.mock.calls[0][0]
    expect(kvKey).toContain('ratelimit:auth:')
  })

  it('should return Retry-After header on rate limit', async () => {
    const emptyBucket = { tokens: 0, lastRefill: Date.now() }
    mockKV.get.mockResolvedValue(JSON.stringify(emptyBucket))

    const context = createMockContext()
    const middleware = authRateLimitMiddleware
    await middleware(context, async () => {})

    const responseCall = context.json.mock.calls[0]
    expect(responseCall[1]).toHaveProperty('headers')
    expect(responseCall[1].headers).toHaveProperty('Retry-After')
  })

  it('should allow 20 requests before rate limiting auth', async () => {
    const fullBucket = { tokens: 20, lastRefill: Date.now() }
    mockKV.get.mockResolvedValue(JSON.stringify(fullBucket))

    const context = createMockContext()
    let nextCalled = false

    const middleware = authRateLimitMiddleware
    await middleware(context, async () => {
      nextCalled = true
    })

    expect(nextCalled).toBe(true)

    // After consuming 1 token, should have 19 left
    const savedBucket = JSON.parse(mockKV.put.mock.calls[0][1])
    expect(savedBucket.tokens).toBe(19)
  })
})
