import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, or } from 'drizzle-orm'
import { users } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { createJWT, hashPassword, verifyPassword, sanitizeUser } from '../lib/auth'
import { createSession, deleteSession, getSession, KVKeys } from '../lib/kv'
import { calculateLoginBonus } from '@gamexamxi/shared'

const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password } = c.req.valid('json')
  const db = createDb(c.env.DB)

  // Check duplicate
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  })
  if (existing) {
    return c.json({ error: 'Username or email already exists', ok: false }, 409)
  }

  const hashedPassword = await hashPassword(password)
  const [user] = await db
    .insert(users)
    .values({ username, email, password: hashedPassword })
    .returning()

  if (!user) {
    return c.json({ error: 'Failed to create user', ok: false }, 500)
  }

  // Welcome points via queue
  await c.env.POINTS_QUEUE.send({
    type: 'WELCOME_BONUS',
    userId: user.id,
    amount: 100,
    note: 'Welcome to GameXamXi!',
  })

  const token = await createJWT(user.id, c.env.JWT_SECRET)
  await createSession(c.env.KV_SESSIONS, user.id, token)

  return c.json({ token, user: sanitizeUser(user), ok: true }, 201)
})

authRouter.post(
  '/login',
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  ),
  async (c) => {
    const { email, password } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const user = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (!user || !user.password) {
      return c.json({ error: 'Invalid email or password', ok: false }, 401)
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return c.json({ error: 'Invalid email or password', ok: false }, 401)
    }

    // Daily login streak (idempotent via KV lock)
    const today = new Date().toISOString().slice(0, 10)
    const streakKey = KVKeys.streakClaim(user.id, today)
    const alreadyClaimed = await c.env.KV_SESSIONS.get(streakKey)

    if (!alreadyClaimed) {
      await c.env.KV_SESSIONS.put(streakKey, '1', { expirationTtl: 86400 * 2 })

      // Calculate streak
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      const lastLoginDate = user.lastLoginAt?.slice(0, 10)
      const newStreak = lastLoginDate === yesterdayStr ? user.loginStreak + 1 : 1
      const bonus = calculateLoginBonus(newStreak)

      await db
        .update(users)
        .set({ loginStreak: newStreak, lastLoginAt: new Date().toISOString() })
        .where(eq(users.id, user.id))

      await c.env.POINTS_QUEUE.send({
        type: 'LOGIN_STREAK',
        userId: user.id,
        amount: bonus,
        note: `Day ${newStreak} streak bonus`,
      })
    }

    const token = await createJWT(user.id, c.env.JWT_SECRET)
    await createSession(c.env.KV_SESSIONS, user.id, token)

    // Refresh user data
    const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })

    return c.json({ token, user: sanitizeUser(updatedUser ?? user), ok: true })
  }
)

authRouter.post('/logout', async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (token) {
    await deleteSession(c.env.KV_SESSIONS, token)
  }
  return c.json({ ok: true, message: 'Logged out successfully' })
})

authRouter.get('/me', async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized', ok: false }, 401)

  const session = await getSession(c.env.KV_SESSIONS, token)
  if (!session) return c.json({ error: 'Session expired', ok: false }, 401)

  const db = createDb(c.env.DB)
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  return c.json({ user: sanitizeUser(user), ok: true })
})

export { authRouter }
