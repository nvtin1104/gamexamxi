import type { MiddlewareHandler } from 'hono'
import type { Env, Variables } from '../types'
import type { Permission } from '@gamexamxi/shared'

// Require ALL listed permissions (AND logic).
// Root role bypasses all permission checks — always passes.
export const requirePermission = (
  ...perms: Permission[]
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =>
  async (c, next) => {
    // Root bypasses all permission checks
    if (c.get('userRole') === 'root') return await next()

    const userPermissions = c.get('userPermissions')
    const missing = perms.filter(p => !userPermissions.has(p))
    if (missing.length > 0) {
      return c.json({ error: 'Forbidden: Insufficient permissions', ok: false }, 403)
    }
    await next()
  }

// Require at least one of the listed roles (OR logic).
// No bypass — role must match exactly.
export const requireRole = (
  ...roles: string[]
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> =>
  async (c, next) => {
    const userRole = c.get('userRole')
    if (!roles.includes(userRole)) {
      return c.json({ error: 'Forbidden: Role not allowed', ok: false }, 403)
    }
    await next()
  }
