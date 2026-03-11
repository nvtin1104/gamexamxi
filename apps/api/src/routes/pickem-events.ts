import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth'
import { PickemEventService } from '../services/pickem-event.service'
import type { Bindings, Variables } from '../types'
import { APP_PERMISSIONS } from '../constants/permissions'

export const pickemEventsRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['title', 'eventDate', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

const createPickemEventSchema = z.object({
  title: z.string().min(2, 'Tiêu đề tối thiểu 2 ký tự').max(200, 'Tiêu đề tối đa 200 ký tự'),
  thumbnail: z.string().url('URL thumbnail không hợp lệ').optional().or(z.literal('')),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự').optional().or(z.literal('')),
  winPoints: z.number().int().min(0).default(0),
  pickPoints: z.number().int().min(0).default(0),
  winExp: z.number().int().min(0).default(0),
  pickExp: z.number().int().min(0).default(0),
  eventDate: z.string().min(1, 'Ngày sự kiện là bắt buộc'),
  closePicksAt: z.string().min(1, 'Ngày đóng dự đoán là bắt buộc'),
  maxPickItems: z.number().int().min(1).max(10).default(1),
})

const updatePickemEventSchema = z.object({
  title: z.string().min(2, 'Tiêu đề tối thiểu 2 ký tự').max(200, 'Tiêu đề tối đa 200 ký tự').optional(),
  thumbnail: z.string().url('URL thumbnail không hợp lệ').optional().or(z.literal('')),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự').optional().or(z.literal('')),
  winPoints: z.number().int().min(0).optional(),
  pickPoints: z.number().int().min(0).optional(),
  winExp: z.number().int().min(0).optional(),
  pickExp: z.number().int().min(0).optional(),
  eventDate: z.string().min(1).optional(),
  closePicksAt: z.string().min(1).optional(),
  maxPickItems: z.number().int().min(1).max(10).optional(),
})

const createOptionSchema = z.object({
  eventItemId: z.string().min(1),
  isWinningOption: z.boolean().default(false),
})

const updateOptionSchema = z.object({
  isWinningOption: z.boolean().optional(),
})

pickemEventsRoute.use('*', authMiddleware)

pickemEventsRoute.get(
  '/',
  zValidator('query', listQuerySchema),
  requirePermission(APP_PERMISSIONS.PICKEM_VIEW),
  async (c) => {
    try {
      const params = c.req.valid('query')
      const service = new PickemEventService(c.env.DB)
      const result = await service.findAll(params)
      return c.json(result)
    } catch (err) {
      console.error('Failed to list pickem events:', err)
      return c.json({ error: 'Không thể lấy danh sách sự kiện' }, 500)
    }
  }
)

pickemEventsRoute.get('/:id', requirePermission(APP_PERMISSIONS.PICKEM_VIEW), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new PickemEventService(c.env.DB)
    const event = await service.findById(id)
    if (!event) return c.json({ error: 'Không tìm thấy sự kiện' }, 404)
    return c.json({ data: event })
  } catch (err) {
    console.error('Failed to get pickem event:', err)
    return c.json({ error: 'Không thể lấy thông tin sự kiện' }, 500)
  }
})

pickemEventsRoute.get('/:id/detail', requirePermission(APP_PERMISSIONS.PICKEM_VIEW), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new PickemEventService(c.env.DB)
    const event = await service.findByIdWithOptions(id)
    if (!event) return c.json({ error: 'Không tìm thấy sự kiện' }, 404)
    return c.json({ data: event })
  } catch (err) {
    console.error('Failed to get pickem event detail:', err)
    return c.json({ error: 'Không thể lấy thông tin sự kiện' }, 500)
  }
})

pickemEventsRoute.get(
  '/:id/options',
  requirePermission(APP_PERMISSIONS.PICKEM_VIEW),
  async (c) => {
    try {
      const id = c.req.param('id')
      const service = new PickemEventService(c.env.DB)
      const options = await service.getOptionsByEventId(id)
      return c.json({ data: options })
    } catch (err) {
      console.error('Failed to get options:', err)
      return c.json({ error: 'Không thể lấy danh sách options' }, 500)
    }
  }
)

pickemEventsRoute.post(
  '/',
  zValidator('json', createPickemEventSchema),
  requirePermission(APP_PERMISSIONS.PICKEM_CREATE),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const userId = c.get('userId')
      const service = new PickemEventService(c.env.DB)

      const event = await service.create(
        {
          ...data,
          thumbnail: data.thumbnail || '',
          description: data.description || '',
        },
        userId
      )
      return c.json({ data: event }, 201)
    } catch (err) {
      console.error('Failed to create pickem event:', err)
      return c.json({ error: 'Không thể tạo sự kiện' }, 500)
    }
  }
)

pickemEventsRoute.patch(
  '/:id',
  zValidator('json', updatePickemEventSchema),
  requirePermission(APP_PERMISSIONS.PICKEM_EDIT),
  async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const service = new PickemEventService(c.env.DB)

      const existing = await service.findById(id)
      if (!existing) {
        return c.json({ error: 'Không tìm thấy sự kiện' }, 404)
      }

      const event = await service.update(id, data)
      return c.json({ data: event })
    } catch (err) {
      console.error('Failed to update pickem event:', err)
      return c.json({ error: 'Không thể cập nhật sự kiện' }, 500)
    }
  }
)

pickemEventsRoute.delete(
  '/:id',
  requirePermission(APP_PERMISSIONS.PICKEM_DELETE),
  async (c) => {
    try {
      const id = c.req.param('id')
      const service = new PickemEventService(c.env.DB)

      const existing = await service.findById(id)
      if (!existing) {
        return c.json({ error: 'Không tìm thấy sự kiện' }, 404)
      }

      await service.delete(id)
      return c.json({ success: true })
    } catch (err) {
      console.error('Failed to delete pickem event:', err)
      return c.json({ error: 'Không thể xóa sự kiện' }, 500)
    }
  }
)

pickemEventsRoute.post(
  '/:id/options',
  zValidator('json', createOptionSchema),
  requirePermission(APP_PERMISSIONS.PICKEM_EDIT),
  async (c) => {
    try {
      const eventId = c.req.param('id')
      const data = c.req.valid('json')
      const service = new PickemEventService(c.env.DB)

      const event = await service.findById(eventId)
      if (!event) {
        return c.json({ error: 'Không tìm thấy sự kiện' }, 404)
      }

      const option = await service.addOption(eventId, {
        eventItemId: data.eventItemId,
        isWinningOption: data.isWinningOption ? 1 : 0,
      })
      return c.json({ data: option }, 201)
    } catch (err) {
      console.error('Failed to add option:', err)
      return c.json({ error: 'Không thể thêm option' }, 500)
    }
  }
)

pickemEventsRoute.patch(
  '/options/:optionId',
  zValidator('json', updateOptionSchema),
  requirePermission(APP_PERMISSIONS.PICKEM_EDIT),
  async (c) => {
    try {
      const optionId = c.req.param('optionId')
      const data = c.req.valid('json')
      const service = new PickemEventService(c.env.DB)

      const option = await service.updateOption(optionId, {
        isWinningOption: data.isWinningOption !== undefined ? (data.isWinningOption ? 1 : 0) : undefined,
      })
      if (!option) {
        return c.json({ error: 'Không tìm thấy option' }, 404)
      }
      return c.json({ data: option })
    } catch (err) {
      console.error('Failed to update option:', err)
      return c.json({ error: 'Không thể cập nhật option' }, 500)
    }
  }
)

pickemEventsRoute.delete(
  '/options/:optionId',
  requirePermission(APP_PERMISSIONS.PICKEM_EDIT),
  async (c) => {
    try {
      const optionId = c.req.param('optionId')
      const service = new PickemEventService(c.env.DB)

      await service.deleteOption(optionId)
      return c.json({ success: true })
    } catch (err) {
      console.error('Failed to delete option:', err)
      return c.json({ error: 'Không thể xóa option' }, 500)
    }
  }
)
