import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { PointService } from '../services/point.service'
import type { Bindings, Variables } from '../types'

export const pointsRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

// All points routes require authentication
pointsRoute.use('*', authMiddleware)

// GET /api/v1/points/me — current user's balance
pointsRoute.get('/me', async (c) => {
  const svc = new PointService(c.env.DB)
  const record = await svc.getBalance(c.get('userId'))
  return c.json({ data: record })
})

// GET /api/v1/points/me/history — current user's transaction history
pointsRoute.get('/me/history', async (c) => {
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '20')
  const svc = new PointService(c.env.DB)
  const rows = await svc.getHistory(c.get('userId'), page, pageSize)
  return c.json({ data: rows, page, pageSize })
})

// POST /api/v1/points/grant — admin grant/deduct points
const grantSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  description: z.string().optional(),
})

pointsRoute.post(
  '/grant',
  requireRole('admin', 'mod'),
  zValidator('json', grantSchema),
  async (c) => {
    const { userId, amount, description } = c.req.valid('json')
    const svc = new PointService(c.env.DB)
    const result = await svc.executeTransaction(
      userId,
      amount,
      'admin_grant',
      description
    )
    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }
    return c.json({ data: { userId, newBalance: result.newBalance } })
  }
)
