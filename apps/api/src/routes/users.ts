import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { UserService, stripSensitive } from '../services/user.service'
import { AuthService } from '../services/auth.service'
import type { Bindings, Variables } from '../types'

export const usersRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

// ─── Schemas ────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(20),
  search:    z.string().max(100).optional(),
  role:      z.enum(['admin', 'mod', 'user']).optional(),
  status:    z.enum(['active', 'banned', 'block']).optional(),
  sortBy:    z.enum(['name', 'email', 'createdAt', 'level', 'pointsBalance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

const createUserSchema = z.object({
  email:    z.string().email(),
  name:     z.string().min(2).max(100),
  role:     z.enum(['admin', 'mod', 'user']).default('user'),
  password: z.string().min(8),
})

const updateUserSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  email:          z.string().email().optional(),
  role:           z.enum(['admin', 'mod', 'user']).optional(),
  status:         z.enum(['active', 'banned', 'block']).optional(),
  avatar:         z.string().url().optional(),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(255).optional(),
  birthdate:      z.coerce.date().optional(),
  banReason:      z.string().max(500).optional(),
  blockReason:    z.string().max(500).optional(),
  blockExpiresAt: z.coerce.date().optional(),
})

// ─── Middleware ──────────────────────────────────────────────────────────────

// All user routes require auth
usersRoute.use('*', authMiddleware)

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/v1/users — list users (paginated, filtered, sorted)
usersRoute.get('/', zValidator('query', listQuerySchema), async (c) => {
  try {
    const params = c.req.valid('query')
    const isAdmin = c.get('role') === 'admin'
    const service = new UserService(c.env.DB)
    const result = await service.findAll(params)
    return c.json({
      data: result.data.map(u => stripSensitive(u as Parameters<typeof stripSensitive>[0], isAdmin)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    })
  } catch (err) {
    console.error('Failed to list users:', err)
    return c.json({ error: 'Không thể lấy danh sách người dùng' }, 500)
  }
})

// POST /api/v1/users — create user (admin only)
usersRoute.post('/', requireRole('admin'), zValidator('json', createUserSchema), async (c) => {
  try {
    const { password, ...rest } = c.req.valid('json')
    const authService = new AuthService(c.env.JWT_SECRET)
    const passwordHash = await authService.hashPassword(password)
    const service = new UserService(c.env.DB)
    const user = await service.create({ ...rest, passwordHash })
    return c.json({ data: stripSensitive(user, true) }, 201)
  } catch (err) {
    console.error('Failed to create user:', err)
    return c.json({ error: 'Không thể tạo người dùng' }, 500)
  }
})

// GET /api/v1/users/:id — get user by id
usersRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const isAdmin = c.get('role') === 'admin'
    const service = new UserService(c.env.DB)
    const user = await service.findById(id)
    if (!user) return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    return c.json({ data: stripSensitive(user, isAdmin) })
  } catch (err) {
    console.error('Failed to get user:', err)
    return c.json({ error: 'Không thể lấy thông tin người dùng' }, 500)
  }
})

// GET /api/v1/users/:id/profile — full profile: user + stats + points + groups
usersRoute.get('/:id/profile', async (c) => {
  try {
    const id = c.req.param('id')
    const isAdmin = c.get('role') === 'admin'
    const service = new UserService(c.env.DB)
    const profile = await service.findWithProfile(id)
    if (!profile) return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    const { passwordHash: _ph, lastLoginIp, stats, points, groups, ...userFields } = profile
    return c.json({
      data: {
        ...userFields,
        lastLoginIp: isAdmin ? lastLoginIp : null,
        stats,
        points,
        groups,
      },
    })
  } catch (err) {
    console.error('Failed to get user profile:', err)
    return c.json({ error: 'Không thể lấy hồ sơ người dùng' }, 500)
  }
})

// PATCH /api/v1/users/:id — update user
usersRoute.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const isAdmin = c.get('role') === 'admin'

    // Only admins may change role or status
    if ((body.role !== undefined || body.status !== undefined) && !isAdmin) {
      return c.json({ error: 'Không có quyền thay đổi role hoặc trạng thái' }, 403)
    }

    const service = new UserService(c.env.DB)
    const user = await service.update(id, body)
    return c.json({ data: stripSensitive(user, isAdmin) })
  } catch (err) {
    console.error('Failed to update user:', err)
    return c.json({ error: 'Không thể cập nhật người dùng' }, 500)
  }
})

// DELETE /api/v1/users/:id — delete user (admin only)
usersRoute.delete('/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new UserService(c.env.DB)
    await service.delete(id)
    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to delete user:', err)
    return c.json({ error: 'Không thể xóa người dùng' }, 500)
  }
})
