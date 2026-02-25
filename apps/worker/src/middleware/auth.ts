import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'
import { verifyJWT } from '../lib/auth'
import { getSession } from '../lib/kv'

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

  // Verify JWT
  const payload = await verifyJWT(token, c.env.JWT_SECRET)
  if (!payload?.sub) {
    return c.json({ error: 'Invalid token', ok: false }, 401)
  }

  // Verify session exists in KV (allows logout by deleting session)
  const session = await getSession(c.env.KV_SESSIONS, token)
  if (!session) {
    return c.json({ error: 'Session expired', ok: false }, 401)
  }

  c.set('userId', payload.sub)
  await next()
}
