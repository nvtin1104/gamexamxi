import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'
import { eq } from 'drizzle-orm'
import { users } from '@gamexamxi/db/schema'
import { createDb } from '../lib/db'

// Admin emails stored as comma-separated ADMIN_EMAILS env var.
// If ADMIN_EMAILS is unset or empty, all authenticated users pass (dev-only fallback).
export const adminAuthMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized', ok: false }, 401)
  }

  const db = createDb(c.env.DB)
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    return c.json({ error: 'User not found', ok: false }, 404)
  }

  // Parse admin email list from env var (comma-separated)
  const adminEmails = (c.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean)

  if (adminEmails.length > 0 && !adminEmails.includes(user.email)) {
    return c.json({ error: 'Forbidden: Admin only', ok: false }, 403)
  }

  await next()
}
