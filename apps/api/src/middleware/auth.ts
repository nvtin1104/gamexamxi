import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import type { Bindings, Variables } from '../types'
import { PermissionService } from '../services/permission.service'

/**
 * JWT authentication middleware.
 * Extracts token from Authorization header or access_token cookie, verifies it,
 * and sets userId + role on the context.
 */
export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  let token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    token = getCookie(c, 'access_token')
  }
  
  if (!token) {
    return c.json({ error: 'Thiếu token xác thực' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.sub as string)
    c.set('role', payload.role as string)
    c.set('accountRole', payload.accountRole as string)
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
 * Admins (accountRole) and root bypass all permission checks.
 * Usage: `route.use(requirePermission('game:create'))`
 */
export const requirePermission = (...requiredPermissions: string[]) =>
  createMiddleware<{
    Bindings: Bindings
    Variables: Variables
  }>(async (c, next) => {
    const role = c.get('role')
    const accountRole = c.get('accountRole')

    // Admins and root bypass all permission checks
    if (accountRole === 'admin' || role === 'root') {
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
