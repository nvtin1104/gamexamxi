import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { LevelService } from '../services/level.service'
import type { Bindings, Variables } from '../types'

export const xpRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

// All XP routes require authentication
xpRoute.use('*', authMiddleware)

// GET /api/v1/xp/me — current user's XP & level
xpRoute.get('/me', async (c) => {
  const svc = new LevelService(c.env.DB)
  const stats = await svc.getStats(c.get('userId'))
  return c.json({ data: stats })
})

// POST /api/v1/xp/add — add XP to a user (admin/mod or internal)
const addXpSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
})

xpRoute.post(
  '/add',
  requireRole('admin', 'mod'),
  zValidator('json', addXpSchema),
  async (c) => {
    const { userId, amount } = c.req.valid('json')
    const svc = new LevelService(c.env.DB)
    const result = await svc.addXp(userId, amount)
    return c.json({ data: result })
  }
)
