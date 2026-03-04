import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { UserService } from '../services/user.service'
import type { Bindings, Variables } from '../types'

export const usersRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'mod', 'user']).default('user'),
})

const updateUserSchema = createUserSchema.partial()

// All user routes require auth
usersRoute.use('*', authMiddleware)

// GET /api/v1/users — list all users
usersRoute.get('/', async (c) => {
  try {
    const service = new UserService(c.env.DB)
    const users = await service.findAll()
    return c.json({ data: users })
  } catch (err) {
    console.error('Failed to list users:', err)
    return c.json({ error: 'Không thể lấy danh sách người dùng' }, 500)
  }
})

// POST /api/v1/users — create user
usersRoute.post('/', zValidator('json', createUserSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const service = new UserService(c.env.DB)
    const user = await service.create(body)
    return c.json({ data: user }, 201)
  } catch (err) {
    console.error('Failed to create user:', err)
    return c.json({ error: 'Không thể tạo người dùng' }, 500)
  }
})

// GET /api/v1/users/:id — get user by id
usersRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const service = new UserService(c.env.DB)
    const user = await service.findById(id)
    if (!user) return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    return c.json({ data: user })
  } catch (err) {
    console.error('Failed to get user:', err)
    return c.json({ error: 'Không thể lấy thông tin người dùng' }, 500)
  }
})

// GET /api/v1/users/:id/profile — full profile: user + stats + points + groups
usersRoute.get('/:id/profile', async (c) => {
  try {
    const id = c.req.param('id')
    const service = new UserService(c.env.DB)
    const profile = await service.findWithProfile(id)
    if (!profile) return c.json({ error: 'Không tìm thấy người dùng' }, 404)
    return c.json({ data: profile })
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
    const service = new UserService(c.env.DB)
    const user = await service.update(id, body)
    return c.json({ data: user })
  } catch (err) {
    console.error('Failed to update user:', err)
    return c.json({ error: 'Không thể cập nhật người dùng' }, 500)
  }
})

// DELETE /api/v1/users/:id — delete user
usersRoute.delete('/:id', async (c) => {
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
