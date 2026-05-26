import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { MediaService } from '../services/media.service'
import type { Bindings, Variables } from '../types'

export const mediaRoute = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

const updateMediaSchema = z.object({
  alt: z.string().max(500).optional(),
})

mediaRoute.use('*', authMiddleware)

mediaRoute.get('/', requireRole('root', 'staff'), zValidator('query', listQuerySchema), async (c) => {
  try {
    const params = c.req.valid('query')
    const service = new MediaService(c.env.DB, {
      storage: c.env.STORAGE,
      env: { R2_PUBLIC_URL: c.env.R2_PUBLIC_URL },
    })
    const result = await service.findAll(params)
    return c.json(result)
  } catch (err) {
    console.error('Failed to list media:', err)
    return c.json({ error: 'Không thể lấy danh sách media' }, 500)
  }
})

mediaRoute.get('/:id', requireRole('root', 'staff'), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new MediaService(c.env.DB, {
      storage: c.env.STORAGE,
      env: { R2_PUBLIC_URL: c.env.R2_PUBLIC_URL },
    })
    const media = await service.findById(id)
    if (!media) return c.json({ error: 'Không tìm thấy media' }, 404)
    return c.json(media)
  } catch (err) {
    console.error('Failed to get media:', err)
    return c.json({ error: 'Không thể lấy thông tin media' }, 500)
  }
})

mediaRoute.post('/upload', requireRole('root', 'staff'), async (c) => {
  try {
    const userId = c.get('userId')
    const service = new MediaService(c.env.DB, {
      storage: c.env.STORAGE,
      env: { R2_PUBLIC_URL: c.env.R2_PUBLIC_URL },
    })

    const formData = await c.req.formData() as unknown as FormData
    const file = formData.get('file') as unknown as { name: string; size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> } | null
    if (!file) {
      return c.json({ error: 'Vui lòng chọn file hình ảnh' }, 400)
    }

    const fileName = file.name
    const fileSize = file.size
    const mimeType = file.type

    const validation = MediaService.validateFile({ size: fileSize, type: mimeType })
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400)
    }

    const fileKey = MediaService.generateFileKey(fileName)
    const fileUrl = service.getPublicUrl(fileKey)

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    await c.env.STORAGE.put(fileKey, uint8Array, {
      httpMetadata: {
        contentType: mimeType,
      },
    })

    let width: number | undefined
    let height: number | undefined

    if (mimeType.startsWith('image/')) {
      try {
        const imageData = await getImageDimensions(uint8Array)
        width = imageData.width
        height = imageData.height
      } catch {
        console.warn('Could not get image dimensions')
      }
    }

    const alt = formData.get('alt')?.toString() || undefined

    const mediaRecord = await service.create({
      fileName,
      fileKey,
      fileUrl,
      mimeType,
      fileSize,
      width,
      height,
      alt,
      uploadedBy: userId,
    })

    return c.json(mediaRecord, 201)
  } catch (err) {
    console.error('Failed to upload media:', err)
    return c.json({ error: 'Không thể upload file' }, 500)
  }
})

mediaRoute.patch('/:id', requireRole('root', 'staff'), zValidator('json', updateMediaSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const { media: mediaTable } = await import('../db/schemas')
    const { eq } = await import('drizzle-orm')
    const { getDb } = await import('../db')

    const db = getDb(c.env.DB)

    const existing = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.id, id))
      .get()

    if (!existing) {
      return c.json({ error: 'Không tìm thấy media' }, 404)
    }

    const updated = await db
      .update(mediaTable)
      .set({ alt: data.alt })
      .where(eq(mediaTable.id, id))
      .returning()
      .get()

    return c.json(updated)
  } catch (err) {
    console.error('Failed to update media:', err)
    return c.json({ error: 'Không thể cập nhật media' }, 500)
  }
})

mediaRoute.delete('/:id', requireRole('root', 'staff'), async (c) => {
  try {
    const id = c.req.param('id')
    const service = new MediaService(c.env.DB, {
      storage: c.env.STORAGE,
      env: { R2_PUBLIC_URL: c.env.R2_PUBLIC_URL },
    })

    const result = await service.delete(id)
    if (!result.success) {
      return c.json({ error: result.error || 'Không tìm thấy media' }, 404)
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to delete media:', err)
    return c.json({ error: 'Không thể xóa media' }, 500)
  }
})

async function getImageDimensions(
  data: Uint8Array
): Promise<{ width: number; height: number }> {
  const arr = new Uint8Array(data.slice(0, 24))
  let width = 0
  let height = 0

  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    let offset = 2
    while (offset < data.length) {
      if (data[offset] !== 0xff) break
      const marker = data[offset + 1]
      if (marker === 0xc0 || marker === 0xc2) {
        height = ((data[offset + 5] ?? 0) << 8) | (data[offset + 6] ?? 0)
        width = ((data[offset + 7] ?? 0) << 8) | (data[offset + 8] ?? 0)
        break
      }
      const len = ((data[offset + 2] ?? 0) << 8) | (data[offset + 3] ?? 0)
      offset += 2 + len
    }
  } else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) {
    let offset = 8
    while (offset < data.length - 8) {
      const type = String.fromCharCode(
        data[offset] ?? 0,
        data[offset + 1] ?? 0,
        data[offset + 2] ?? 0,
        data[offset + 3] ?? 0
      )
      if (type === 'IHDR') {
        width = ((data[offset + 4] ?? 0) << 24) | ((data[offset + 5] ?? 0) << 16) | ((data[offset + 6] ?? 0) << 8) | (data[offset + 7] ?? 0)
        height = ((data[offset + 8] ?? 0) << 24) | ((data[offset + 9] ?? 0) << 16) | ((data[offset + 10] ?? 0) << 8) | (data[offset + 11] ?? 0)
        break
      }
      const len = ((data[offset + 4] ?? 0) << 24) | ((data[offset + 5] ?? 0) << 16) | ((data[offset + 6] ?? 0) << 8) | (data[offset + 7] ?? 0)
      offset += 12 + len
    }
  } else if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
    width = ((arr[6] ?? 0) | ((arr[7] ?? 0) << 8)) | (((arr[8] ?? 0) & 0x0f) << 16)
    height = ((((arr[8] ?? 0) & 0xf0) >> 4) | ((arr[9] ?? 0) << 4) | (((arr[10] ?? 0) & 0x0f) << 12)) >>> 0
  } else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    if (arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
      width = ((arr[24] ?? 0) | ((arr[25] ?? 0) << 8) | ((arr[26] ?? 0) << 16) | ((arr[27] ?? 0) << 24)) >>> 0
      height = ((arr[28] ?? 0) | ((arr[29] ?? 0) << 8) | ((arr[30] ?? 0) << 16) | ((arr[31] ?? 0) << 24)) >>> 0
    }
  }

  if (!width || !height) {
    return { width: 0, height: 0 }
  }

  return { width, height }
}
