import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requirePermission } from '../middleware/auth'
import { ItemEventService } from '../services/item-event.service'
import type { Bindings, Variables } from '../types'
import { APP_PERMISSIONS } from '../constants/permissions'

export const itemsRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

const linkSocialSchema = z.object({
  type: z.enum(['twitter', 'facebook', 'instagram', 'tiktok', 'youtube', 'other']),
  url: z.string().url().optional().or(z.literal('')),
  handle: z.string().optional(),
  isPublic: z.boolean().default(true),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  type: z.enum(['player', 'team', 'tournament']).optional(),
  level: z.coerce.number().int().min(0).max(1).optional(),
  parentId: z.string().optional().nullable(),
  sortBy: z.enum(['name', 'createdAt', 'level']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

const createItemSchema = z.object({
  name: z.string().min(2).max(200),
  logo: z.string().url().optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  linkSocial: z.array(linkSocialSchema).default([]),
  level: z.number().int().min(0).max(1).default(0),
  parentId: z.literal('').optional().nullable(),
  type: z.enum(['player', 'team', 'tournament']),
}).refine((data) => {
  if (data.level === 1 && data.parentId) return true
  if (data.level === 0 && !data.parentId) return true
  return false
}, {
  message: 'Chỉ level 1 mới có thể có parentId',
  path: ['parentId'],
})

const updateItemSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  logo: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  linkSocial: z.array(linkSocialSchema).optional(),
  level: z.number().int().min(0).max(1).optional(),
  parentId: z.string().optional().nullable(),
}).refine((data) => {
  if (data.level === 1 && data.parentId) return true
  if (data.level === 0 && !data.parentId) return true
  if (data.level === undefined && data.parentId === undefined) return true
  return false
}, {
  message: 'Chỉ level 1 mới có thể có parentId',
  path: ['parentId'],
})

itemsRoute.use('*', authMiddleware)

itemsRoute.get(
  '/',
  zValidator('query', listQuerySchema),
  requirePermission(APP_PERMISSIONS.ITEM_VIEW),
  async (c) => {
    try {
      const params = c.req.valid('query')
      const service = new ItemEventService(c.env.DB)
      const result = await service.findAll({
        ...params,
        parentId: params.parentId === '' ? undefined : params.parentId,
      })
      return c.json(result)
    } catch (err) {
      console.error('Failed to list items:', err)
      return c.json({ error: 'Không thể lấy danh sách items' }, 500)
    }
  }
)

itemsRoute.get('/:id', requirePermission(APP_PERMISSIONS.ITEM_VIEW), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new ItemEventService(c.env.DB)
    const item = await service.findById(id)
    if (!item) return c.json({ error: 'Không tìm thấy item' }, 404)
    return c.json({ data: item })
  } catch (err) {
    console.error('Failed to get item:', err)
    return c.json({ error: 'Không thể lấy thông tin item' }, 500)
  }
})

itemsRoute.get('/:id/detail', requirePermission(APP_PERMISSIONS.ITEM_VIEW), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new ItemEventService(c.env.DB)
    const item = await service.findByIdWithDetails(id)
    if (!item) return c.json({ error: 'Không tìm thấy item' }, 404)
    return c.json({ data: item })
  } catch (err) {
    console.error('Failed to get item detail:', err)
    return c.json({ error: 'Không thể lấy thông tin item' }, 500)
  }
})

itemsRoute.get(
  '/:id/children',
  requirePermission(APP_PERMISSIONS.ITEM_VIEW),
  async (c) => {
    try {
      const id = c.req.param('id')
      const service = new ItemEventService(c.env.DB)
      const children = await service.findChildren(id)
      return c.json({ data: children })
    } catch (err) {
      console.error('Failed to get children:', err)
      return c.json({ error: 'Không thể lấy danh sách con' }, 500)
    }
  }
)

itemsRoute.post(
  '/',
  zValidator('json', createItemSchema),
  requirePermission(APP_PERMISSIONS.ITEM_CREATE),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const userId = c.get('userId')
      const service = new ItemEventService(c.env.DB)

      if (data.level === 0 && data.parentId) {
        return c.json({ error: 'Chỉ level 1 mới có thể có parentId' }, 400)
      }

      if (data.level === 1 && data.parentId) {
        const parent = await service.findById(data.parentId)
        if (!parent) {
          return c.json({ error: 'Parent item không tồn tại' }, 400)
        }
        if (parent.level !== 0) {
          return c.json({ error: 'Parent phải là level 0' }, 400)
        }
      }

      const item = await service.create(data, userId)
      return c.json({ data: item }, 201)
    } catch (err) {
      console.error('Failed to create item:', err)
      return c.json({ error: 'Không thể tạo item' }, 500)
    }
  }
)

itemsRoute.patch(
  '/:id',
  zValidator('json', updateItemSchema),
  requirePermission(APP_PERMISSIONS.ITEM_EDIT),
  async (c) => {
    try {
      const id = c.req.param('id')
      const data = c.req.valid('json')
      const service = new ItemEventService(c.env.DB)

      const existing = await service.findById(id)
      if (!existing) {
        return c.json({ error: 'Không tìm thấy item' }, 404)
      }

      const newLevel = data.level ?? existing.level

      if (newLevel === 0 && data.parentId) {
        return c.json({ error: 'Chỉ level 1 mới có thể có parentId' }, 400)
      }

      if (data.parentId !== undefined && data.parentId !== null) {
        if (data.parentId === id) {
          return c.json({ error: 'Không thể set parent là chính mình' }, 400)
        }
        const parent = await service.findById(data.parentId)
        if (!parent) {
          return c.json({ error: 'Parent item không tồn tại' }, 400)
        }
        if (parent.level !== 0) {
          return c.json({ error: 'Parent phải là level 0' }, 400)
        }
      }

      const item = await service.update(id, data)
      return c.json({ data: item })
    } catch (err) {
      console.error('Failed to update item:', err)
      return c.json({ error: 'Không thể cập nhật item' }, 500)
    }
  }
)

itemsRoute.delete(
  '/:id',
  requirePermission(APP_PERMISSIONS.ITEM_DELETE),
  async (c) => {
    try {
      const id = c.req.param('id')
      const service = new ItemEventService(c.env.DB)

      const existing = await service.findById(id)
      if (!existing) {
        return c.json({ error: 'Không tìm thấy item' }, 404)
      }

      const children = await service.findChildren(id)
      if (children.length > 0) {
        return c.json(
          { error: 'Không thể xóa item có children. Xóa children trước.' },
          400
        )
      }

      await service.delete(id)
      return c.json({ success: true })
    } catch (err) {
      console.error('Failed to delete item:', err)
      return c.json({ error: 'Không thể xóa item' }, 500)
    }
  }
)
