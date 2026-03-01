import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { Bindings, Variables } from '../types'

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and sets userId + role on the context.
 */
export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header) {
    return c.json({ error: 'Missing Authorization header' }, 401)
  }

  const token = header.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.sub as string)
    c.set('role', payload.role as string)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

/**
 * Role-based access guard.
 * Usage: `route.use(requireRole('admin'))`
 */
export const requireRole = (...allowedRoles: string[]) =>
  createMiddleware<{
    Bindings: Bindings
    Variables: Variables
  }>(async (c, next) => {
    const role = c.get('role')
    if (!allowedRoles.includes(role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  })
