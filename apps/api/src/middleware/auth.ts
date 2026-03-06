import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { Bindings, Variables } from '../types'
import { PermissionService } from '../services/permission.service'

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
    return c.json({ error: 'Thiếu header Authorization' }, 401)
  }

  const token = header.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: 'Không có quyền truy cập' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.sub as string)
    c.set('role', payload.role as string)
    await next()
  } catch {
    return c.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, 401)
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
      return c.json({ error: 'Không có quyền' }, 403)
    }
    await next()
  })

/**
 * Permission-based access guard.
 * Resolves user's merged permissions from groups, caches in context.
 * Admins always pass.
 * Usage: `route.use(requirePermission('game:create'))`
 */
export const requirePermission = (...requiredPermissions: string[]) =>
  createMiddleware<{
    Bindings: Bindings
    Variables: Variables
  }>(async (c, next) => {
    const role = c.get('role')
    if (role === 'admin') {
      await next()
      return
    }

    // Resolve & cache permissions in context
    let perms = c.get('permissions')
    if (!perms) {
      const permService = new PermissionService(c.env.DB)
      perms = await permService.getUserPermissions(c.get('userId'))
      c.set('permissions', perms)
    }

    const hasAll = requiredPermissions.every((p) => perms!.includes(p))
    if (!hasAll) {
      return c.json({ error: 'Không có quyền — quyền hạn không đủ' }, 403)
    }

    await next()
  })
