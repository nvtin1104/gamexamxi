import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { verify } from 'hono/jwt'
import { OAuth2Client } from 'google-auth-library'
import { rateLimiter } from '../middleware/rate-limit'
import { authMiddleware } from '../middleware/auth'
import { UserService } from '../services/user.service'
import { AuthService } from '../services/auth.service'
import type { Bindings, Variables } from '../types'
import type { users } from '../db/schemas'

export const authRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function stripSensitive(user: typeof users.$inferSelect) {
  const { passwordHash, ggId, lastLoginIp, ...rest } = user
  return rest
}

function setAuthCookies(c: any, accessToken: string, refreshToken: string) {
  const isLocal = c.req.header('host')?.includes('localhost')
  const cookieOptions = `HttpOnly; ${!isLocal ? 'Secure; ' : ''}SameSite=lax; Path=/`
  c.header('Set-Cookie', `access_token=${accessToken}; Max-Age=${60 * 60}; ${cookieOptions}`)
  c.header('Set-Cookie', `refresh_token=${refreshToken}; Max-Age=${60 * 60 * 24 * 7}; ${cookieOptions}`)
}

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

const googleSchema = z.object({
  idToken: z.string(),
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
      return c.json({ error: 'Email đã được đăng ký' }, 409)
    }

    // Hash password and create user
    const passwordHash = await authService.hashPassword(password)
    const user = await userService.create({
      email,
      name,
      passwordHash,
    })

    // Generate tokens
    const accessToken = await authService.generateAccessToken(user.id, user.role, user.accountRole)
    const refreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, refreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    setAuthCookies(c, accessToken, refreshToken)

    return c.json(stripSensitive(user), 201)
  } catch (err) {
    console.error('Registration failed:', err)
    return c.json({ error: 'Đăng ký thất bại' }, 500)
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
      return c.json({ error: 'Thông tin đăng nhập không đúng' }, 401)
    }

    const valid = await authService.verifyPassword(password, user.passwordHash)
    if (!valid) {
      return c.json({ error: 'Thông tin đăng nhập không đúng' }, 401)
    }

    const accessToken = await authService.generateAccessToken(user.id, user.role, user.accountRole)
    const refreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, refreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    const isLocal = c.req.header('host')?.includes('localhost')
    const cookieOptions = `HttpOnly; ${!isLocal ? 'Secure; ' : ''}SameSite=lax; Path=/`

    c.header('Set-Cookie', `access_token=${accessToken}; Max-Age=${60 * 60}; ${cookieOptions}`)
    c.header('Set-Cookie', `refresh_token=${refreshToken}; Max-Age=${60 * 60 * 24 * 7}; ${cookieOptions}`)

    return c.json(stripSensitive(user))
  } catch (err) {
    console.error('Login failed:', err)
    return c.json({ error: 'Đăng nhập thất bại' }, 500)
  }
})

// POST /api/v1/auth/refresh
authRoute.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  try {
    const { refreshToken } = c.req.valid('json')
    const authService = new AuthService(c.env.JWT_SECRET)

    const payload = await verify(refreshToken, c.env.JWT_SECRET, 'HS256')
    if (payload.type !== 'refresh') {
      return c.json({ error: 'Loại token không hợp lệ' }, 401)
    }

    const userId = payload.sub as string
    const stored = await c.env.SESSIONS.get(`refresh:${userId}`)
    if (stored !== refreshToken) {
      return c.json({ error: 'Token đã bị thu hồi' }, 401)
    }

    // Issue new tokens
    const userService = new UserService(c.env.DB)
    const user = await userService.findById(userId)
    if (!user) {
      return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    }

    const newAccessToken = await authService.generateAccessToken(user.id, user.role, user.accountRole)
    const newRefreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, newRefreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    setAuthCookies(c, newAccessToken, newRefreshToken)

    return c.json(stripSensitive(user))
  } catch (err) {
    console.error('Token refresh failed:', err)
    return c.json({ error: 'Refresh token không hợp lệ' }, 401)
  }
})

// GET /api/v1/auth/me — return current authenticated user
authRoute.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    const userService = new UserService(c.env.DB)
    const user = await userService.findById(userId)
    if (!user) {
      return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    }
    return c.json(stripSensitive(user))
  } catch (err) {
    console.error('Get me failed:', err)
    return c.json({ error: 'Lỗi máy chủ nội bộ' }, 500)
  }
})

// POST /api/v1/auth/logout — revoke refresh token from KV
authRoute.post('/logout', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')
    await c.env.SESSIONS.delete(`refresh:${userId}`)
    return c.json({ success: true })
  } catch (err) {
    console.error('Logout failed:', err)
    return c.json({ error: 'Đăng xuất thất bại' }, 500)
  }
})

// POST /api/v1/auth/google — Login or register with Google
authRoute.post('/google', zValidator('json', googleSchema), async (c) => {
  try {
    const { idToken } = c.req.valid('json')
    const userService = new UserService(c.env.DB)
    const authService = new AuthService(c.env.JWT_SECRET)

    const client = new OAuth2Client(c.env.GOOGLE_CLIENT_ID)

    let ticket
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: c.env.GOOGLE_CLIENT_ID,
      })
    } catch {
      return c.json({ error: 'Token Google không hợp lệ' }, 401)
    }

    const payload = ticket.getPayload()
    if (!payload) {
      return c.json({ error: 'Token Google không hợp lệ' }, 401)
    }

    const { sub: ggId, email, name, email_verified } = payload

    if (!email) {
      return c.json({ error: 'Không lấy được email từ Google' }, 400)
    }

    let user = await userService.findByGgId(ggId)

    if (!user) {
      user = await userService.findByEmail(email)
      if (user) {
        if (user.ggId) {
          return c.json({ error: 'Email đã được liên kết với tài khoản Google khác' }, 409)
        }
        await userService.update(user.id, { ggId })
      } else {
        const userName = name ?? email.split('@')[0] ?? 'User'
        user = await userService.create({
          email,
          name: userName,
          ggId,
          passwordHash: `google_oauth:${ggId}`,
          accountRole: 'user',
          role: 'user',
          status: 'active',
          emailVerifiedAt: email_verified ? new Date() : null,
        })
      }
    }

    if (user.status === 'banned') {
      return c.json({ error: 'Tài khoản đã bị khóa vĩnh viễn' }, 403)
    }

    if (user.status === 'block' && user.blockExpiresAt && user.blockExpiresAt > new Date()) {
      return c.json({ error: 'Tài khoản đang bị khóa tạm thời' }, 403)
    }

    const accessToken = await authService.generateAccessToken(user.id, user.role, user.accountRole)
    const refreshToken = await authService.generateRefreshToken(user.id)

    await c.env.SESSIONS.put(`refresh:${user.id}`, refreshToken, {
      expirationTtl: 60 * 60 * 24 * 7,
    })

    setAuthCookies(c, accessToken, refreshToken)

    return c.json(stripSensitive(user))
  } catch (err) {
    console.error('Google login failed:', err)
    return c.json({ error: 'Đăng nhập Google thất bại' }, 500)
  }
})
