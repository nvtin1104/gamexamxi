import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, or } from 'drizzle-orm'
import { users, permissionGroups, userPermissionGroups } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { createJWT, hashPassword, verifyPassword, sanitizeUser } from '../lib/auth'
import { createSession, deleteSession, getSession, KVKeys } from '../lib/kv'
import { calculateLoginBonus, mergePermissions } from '@gamexamxi/shared'

const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── Shared helpers ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/** Load all extra permissions for a user (custom + groups) and check for a given permission. */
async function userHasPermission(
  db: ReturnType<typeof import('../lib/db').createDb>,
  userId: string,
  role: string,
  customPermissions: string | null,
  permission: string
): Promise<boolean> {
  const customPerms: string[] = customPermissions ? JSON.parse(customPermissions) : []

  // Fast path: role already grants the permission
  const effectiveFromRole = mergePermissions(role, customPerms)
  if (effectiveFromRole.has(permission as never)) return true

  // Check permission groups
  const groupRows = await db
    .select({ permissions: permissionGroups.permissions })
    .from(userPermissionGroups)
    .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
    .where(eq(userPermissionGroups.userId, userId))

  const groupPerms = groupRows.flatMap(g => {
    try { return JSON.parse(g.permissions) as string[] } catch { return [] }
  })

  return mergePermissions(role, [...customPerms, ...groupPerms]).has(permission as never)
}

/** Apply daily login streak and send points — idempotent (KV lock per day). */
async function applyLoginStreak(
  c: { env: Env },
  db: ReturnType<typeof import('../lib/db').createDb>,
  user: { id: string; loginStreak: number; lastLoginAt: string | null }
) {
  const today = new Date().toISOString().slice(0, 10)
  const streakKey = KVKeys.streakClaim(user.id, today)
  const alreadyClaimed = await c.env.KV_SESSIONS.get(streakKey)
  if (alreadyClaimed) return

  await c.env.KV_SESSIONS.put(streakKey, '1', { expirationTtl: 86400 * 2 })

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const lastLoginDate = user.lastLoginAt?.slice(0, 10)
  const newStreak = lastLoginDate === yesterday.toISOString().slice(0, 10) ? user.loginStreak + 1 : 1
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

// ─── POST /api/auth/register ──────────────────────────────────────────────

authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password } = c.req.valid('json')
  const db = createDb(c.env.DB)

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

// ─── POST /api/auth/login (web app) ───────────────────────────────────────

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
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

  if (user.status !== 'active') {
    return c.json({ error: 'Account suspended or banned', ok: false }, 403)
  }

  await applyLoginStreak(c, db, user)

  const token = await createJWT(user.id, c.env.JWT_SECRET)
  await createSession(c.env.KV_SESSIONS, user.id, token)

  const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  return c.json({ token, user: sanitizeUser(updatedUser ?? user), ok: true })
})

// ─── POST /api/auth/admin-login (dashboard only) ──────────────────────────
// Requires admin:panel permission (admin role, root role, or custom/group grant).

authRouter.post('/admin-login', zValidator('json', loginSchema), async (c) => {
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

  if (user.status !== 'active') {
    return c.json({ error: 'Account suspended or banned', ok: false }, 403)
  }

  // Gate: must have admin:panel permission
  const canAccess = await userHasPermission(db, user.id, user.role, user.customPermissions, 'admin:panel')
  if (!canAccess) {
    return c.json({ error: 'Access denied: admin panel permission required', ok: false }, 403)
  }

  const token = await createJWT(user.id, c.env.JWT_SECRET)
  await createSession(c.env.KV_SESSIONS, user.id, token)

  return c.json({ token, user: sanitizeUser(user), ok: true })
})

// ─── GET /api/auth/google ─────────────────────────────────────────────────
// Returns the Google OAuth authorization URL. Frontend redirects the user to it.

authRouter.get('/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  if (!clientId) return c.json({ error: 'Google OAuth not configured', ok: false }, 503)

  const state = crypto.randomUUID()
  // Store state in KV for 10 minutes to verify on callback
  await c.env.KV_SESSIONS.put(KVKeys.oauthState(state), '1', { expirationTtl: 600 })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, ok: true })
})

// ─── POST /api/auth/google/callback ──────────────────────────────────────
// Receives the auth code from the frontend callback page, exchanges for a session.

authRouter.post('/google/callback', zValidator('json', z.object({
  code: z.string().max(512),
  state: z.string().uuid(),
})), async (c) => {
  const { code, state } = c.req.valid('json')
  const db = createDb(c.env.DB)

  // Verify CSRF state
  const stateKey = KVKeys.oauthState(state)
  const validState = await c.env.KV_SESSIONS.get(stateKey)
  if (!validState) return c.json({ error: 'Invalid or expired OAuth state', ok: false }, 400)
  await c.env.KV_SESSIONS.delete(stateKey)

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json<{ error: string }>()
    return c.json({ error: `Google token error: ${err.error}`, ok: false }, 400)
  }

  const { access_token } = await tokenRes.json<{ access_token: string }>()

  // Fetch Google user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!profileRes.ok) {
    return c.json({ error: 'Failed to fetch Google profile', ok: false }, 400)
  }

  const profile = await profileRes.json<{
    sub: string         // Google user ID
    email: string
    name: string
    picture?: string
    email_verified?: boolean
  }>()

  if (profile.email_verified !== true) {
    return c.json({ error: 'Google account email not verified', ok: false }, 403)
  }

  // Find existing user by Google ID or email
  let user = await db.query.users.findFirst({
    where: or(eq(users.ggId, profile.sub), eq(users.email, profile.email)),
  })

  // Status check before any DB writes
  if (user && user.status !== 'active') {
    return c.json({ error: 'Account suspended or banned', ok: false }, 403)
  }

  if (!user) {
    // Auto-generate a unique username from Google display name
    const base = profile.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 16)
      .replace(/^_|_$/g, '') || 'user'

    // Use a random suffix to avoid TOCTOU race on concurrent signups
    const suffix = Math.random().toString(36).slice(2, 6)
    let username = base
    if (await db.query.users.findFirst({ where: eq(users.username, username) })) {
      username = `${base.slice(0, 12)}_${suffix}`
    }

    try {
      const [created] = await db
        .insert(users)
        .values({
          username,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture ?? null,
          ggId: profile.sub,
          password: null, // OAuth account — no password
        })
        .returning()

      if (!created) return c.json({ error: 'Failed to create user', ok: false }, 500)
      user = created
    } catch {
      // Unique constraint: username or email collision — re-fetch and continue
      const existing = await db.query.users.findFirst({
        where: or(eq(users.ggId, profile.sub), eq(users.email, profile.email)),
      })
      if (!existing) return c.json({ error: 'Failed to create user', ok: false }, 500)
      user = existing
    }

    // Welcome bonus for new OAuth users
    await c.env.POINTS_QUEUE.send({
      type: 'WELCOME_BONUS',
      userId: user.id,
      amount: 100,
      note: 'Welcome to GameXamXi!',
    })
  } else {
    // Link ggId if user signed up with email first, update avatar if unset
    const updates: Record<string, string> = {}
    if (!user.ggId) updates.ggId = profile.sub
    if (!user.avatar && profile.picture) updates.avatar = profile.picture
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, user.id))
    }
  }

  await applyLoginStreak(c, db, user)

  const token = await createJWT(user.id, c.env.JWT_SECRET)
  await createSession(c.env.KV_SESSIONS, user.id, token)

  const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })
  return c.json({ token, user: sanitizeUser(updatedUser ?? user), ok: true })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────

authRouter.post('/logout', async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (token) {
    await deleteSession(c.env.KV_SESSIONS, token)
  }
  return c.json({ ok: true })
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────

authRouter.get('/me', async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized', ok: false }, 401)

  const session = await getSession(c.env.KV_SESSIONS, token)
  if (!session) return c.json({ error: 'Session expired', ok: false }, 401)

  const db = createDb(c.env.DB)
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)

  if (user.status !== 'active') {
    return c.json({ error: 'Account suspended or banned', ok: false }, 403)
  }

  return c.json({ user: sanitizeUser(user), ok: true })
})

export { authRouter }
