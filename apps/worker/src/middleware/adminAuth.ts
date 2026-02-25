import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'

// Allows only admin and root roles.
// Note: auth middleware must run first — it sets userId, userRole, userPermissions.
export const adminAuthMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized', ok: false }, 401)
  }

  const userRole = c.get('userRole')
  if (userRole !== 'admin' && userRole !== 'root') {
    return c.json({ error: 'Forbidden: Admin only', ok: false }, 403)
  }

  await next()
}
