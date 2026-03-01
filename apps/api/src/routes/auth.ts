import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { verify } from 'hono/jwt'
import { rateLimiter } from '../middleware/rate-limit'
import { UserService } from '../services/user.service'
import { AuthService } from '../services/auth.service'
import type { Bindings } from '../types'

export const authRoute = new Hono<{ Bindings: Bindings }>()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

// Rate limit auth endpoints: 20 requests / 60 seconds
authRoute.use('*', rateLimiter(20, 60))

// POST /api/v1/auth/register
authRoute.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid('json')
    const userService = new UserService(c.env.DB)
    const authService = new AuthService(c.env.JWT_SECRET)

    // Check if email already taken
    const existing = await userService.findByEmail(email)
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    // Hash password and create user
    const passwordHash = await authService.hashPassword(password)
    const user = await userService.create({
      email,
      name,
      passwordHash,
    })

    // Generate tokens
    const accessToken = await authService.generateAccessToken(user.id, user.role)
    const refreshToken = await authService.generateRefreshToken(user.id)

    // Store refresh token in KV
    await c.env.SESSIONS.put(`refresh:${user.id}`, refreshToken, {
      expirationTtl: 60 * 60 * 24 * 7, // 7 days
    })

    return c.json(
      {
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          accessToken,
          refreshToken,
        },
      },
      201
    )
  } catch (err) {
    console.error('Registration failed:', err)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// POST /api/v1/auth/login
authRoute.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')
    const userService = new UserService(c.env.DB)
    const authService = new AuthService(c.env.JWT_SECRET)

    const user = await userService.findByEmail(email)
    if (!user || !user.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await authService.verifyPassword(password, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const accessToken = await authService.generateAccessToken(user.id, user.role)
    const refreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, refreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    return c.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    })
  } catch (err) {
    console.error('Login failed:', err)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// POST /api/v1/auth/refresh
authRoute.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json')
    const authService = new AuthService(c.env.JWT_SECRET)

    const payload = await verify(refreshToken, c.env.JWT_SECRET, 'HS256')
    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401)
    }

    const userId = payload.sub as string
    const stored = await c.env.SESSIONS.get(`refresh:${userId}`)
    if (stored !== refreshToken) {
      return c.json({ error: 'Token revoked' }, 401)
    }

    // Issue new tokens
    const userService = new UserService(c.env.DB)
    const user = await userService.findById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const newAccessToken = await authService.generateAccessToken(user.id, user.role)
    const newRefreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, newRefreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    return c.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    })
  } catch (err) {
    console.error('Token refresh failed:', err)
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
})
