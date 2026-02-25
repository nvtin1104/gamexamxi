import type { MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import type { Env, Variables } from '../types'
import { verifyJWT } from '../lib/auth'
import { getSession } from '../lib/kv'
import { createDb } from '../lib/db'
import { users, permissionGroups, userPermissionGroups } from '@gamexamxi/db/schema'
import { mergePermissions } from '@gamexamxi/shared'

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  const authorization = c.req.header('Authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : c.req.header('X-Auth-Token')

  if (!token) {
    return c.json({ error: 'Unauthorized', ok: false }, 401)
  }

  // Verify JWT signature
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload?.sub) {
    return c.json({ error: 'Invalid token', ok: false }, 401)
  }

  // Verify live session in KV (enables instant logout)
  const session = await getSession(c.env.KV_SESSIONS, token)
  if (!session) {
    return c.json({ error: 'Session expired', ok: false }, 401)
  }

  const db = createDb(c.env.DB)

  // Load user + permission groups in parallel
  const [user, groupRows] = await Promise.all([
    db
      .select({ id: users.id, role: users.role, status: users.status, customPermissions: users.customPermissions })
      .from(users)
      .where(eq(users.id, payload.sub))
      .then(rows => rows[0]),
    db
      .select({ permissions: permissionGroups.permissions })
      .from(userPermissionGroups)
      .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
      .where(eq(userPermissionGroups.userId, payload.sub)),
  ])

  if (!user) {
    return c.json({ error: 'User not found', ok: false }, 401)
  }

  // Block non-active accounts from making any request
  if (user.status !== 'active') {
    return c.json({ error: 'Account suspended or banned', ok: false }, 403)
  }

  // Collect all extra permissions: individual custom + permission groups
  const customPerms: string[] = user.customPermissions
    ? JSON.parse(user.customPermissions)
    : []

  const groupPerms: string[] = groupRows.flatMap(g => {
    try { return JSON.parse(g.permissions) as string[] } catch { return [] }
  })

  c.set('userId', user.id)
  c.set('userRole', user.role)
  c.set('userPermissions', mergePermissions(user.role, [...customPerms, ...groupPerms]))

  await next()
}
