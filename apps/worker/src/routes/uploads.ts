import { Hono } from 'hono'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { uploads } from '@gamexamxi/db/schema'
import {
  UPLOAD_MAX_SIZE,
  UPLOAD_ALLOWED_TYPES,
  ALL_UPLOAD_CATEGORIES,
  PERMISSIONS,
  type UploadCategory,
} from '@gamexamxi/shared'
import { createDb } from '../lib/db'
import { uploadToR2, deleteFromR2, getR2PublicUrl, generateUploadKey } from '../lib/r2'
import { requirePermission } from '../middleware/permission'
import type { Env, Variables } from '../types'

export const uploadsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// ─── POST / — Upload a file ──────────────────────────────────

uploadsRouter.post('/', async (c) => {
  const userId = c.get('userId')

  // Parse multipart body
  const body = await c.req.parseBody()
  const file = body['file']
  const category = (body['category'] as string)?.trim()
  const entityId = (body['entityId'] as string)?.trim() || null

  // Validate category
  if (!category || !ALL_UPLOAD_CATEGORIES.includes(category as UploadCategory)) {
    return c.json(
      { error: `Invalid category. Must be one of: ${ALL_UPLOAD_CATEGORIES.join(', ')}`, ok: false },
      400,
    )
  }

  // Validate file
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided', ok: false }, 400)
  }

  const cat = category as UploadCategory
  const maxSize = UPLOAD_MAX_SIZE[cat]
  const allowedTypes = UPLOAD_ALLOWED_TYPES[cat]

  // Validate file size
  if (file.size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(0)
    return c.json(
      { error: `File too large. Max ${maxMB}MB for category "${cat}"`, ok: false },
      413,
    )
  }

  // Validate MIME type
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(', ')}`, ok: false },
      400,
    )
  }

  // Generate R2 key
  const filename = file.name || 'upload'
  const key = generateUploadKey(cat, entityId || userId, filename)

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer()
  await uploadToR2(c.env.R2_PUBLIC, key, arrayBuffer, file.type)

  // Insert record in DB
  const db = createDb(c.env.DB)
  const id = crypto.randomUUID()
  const url = getR2PublicUrl(key, c.env.R2_PUBLIC_DOMAIN)

  await db.insert(uploads).values({
    id,
    key,
    filename,
    mimeType: file.type,
    size: file.size,
    category: cat,
    entityId,
    uploadedBy: userId,
  })

  return c.json({
    data: { id, url, key, filename, mimeType: file.type, size: file.size },
    ok: true,
  }, 201)
})

// ─── GET /my — List current user's uploads ────────────────────

uploadsRouter.get('/my', async (c) => {
  const userId = c.get('userId')
  const category = c.req.query('category')
  const limit = Math.min(Number(c.req.query('limit')) || 20, 100)
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0)

  const db = createDb(c.env.DB)
  const cdnDomain = c.env.R2_PUBLIC_DOMAIN

  const conditions = [eq(uploads.uploadedBy, userId)]
  if (category && ALL_UPLOAD_CATEGORIES.includes(category as UploadCategory)) {
    conditions.push(eq(uploads.category, category))
  }

  const rows = await db
    .select()
    .from(uploads)
    .where(and(...conditions))
    .orderBy(desc(uploads.createdAt))
    .limit(limit + 1)
    .offset(offset)

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map((row) => ({
    ...row,
    url: getR2PublicUrl(row.key, cdnDomain),
  }))

  return c.json({
    data: {
      items,
      total: items.length,
      limit,
      offset,
      hasMore,
    },
    ok: true,
  })
})

// ─── DELETE /:id — Delete an upload ───────────────────────────

uploadsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const userPermissions = c.get('userPermissions')
  const uploadId = c.req.param('id')

  const db = createDb(c.env.DB)

  // Look up the upload
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  })

  if (!upload) {
    return c.json({ error: 'Upload not found', ok: false }, 404)
  }

  // Check ownership or uploads:manage permission
  const canManage = userPermissions.has(PERMISSIONS.UPLOADS_MANAGE)
  if (upload.uploadedBy !== userId && !canManage) {
    return c.json({ error: 'Forbidden', ok: false }, 403)
  }

  // Delete from R2
  await deleteFromR2(c.env.R2_PUBLIC, upload.key)

  // Delete from DB
  await db.delete(uploads).where(eq(uploads.id, uploadId))

  return c.json({ ok: true })
})

// ─── Admin: GET /all — List all uploads (admin only) ──────────

uploadsRouter.get(
  '/all',
  requirePermission(PERMISSIONS.UPLOADS_MANAGE),
  async (c) => {
    const category = c.req.query('category')
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100)
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0)

    const db = createDb(c.env.DB)
    const cdnDomain = c.env.R2_PUBLIC_DOMAIN

    const conditions: ReturnType<typeof eq>[] = []
    if (category && ALL_UPLOAD_CATEGORIES.includes(category as UploadCategory)) {
      conditions.push(eq(uploads.category, category))
    }

    const query = conditions.length > 0
      ? db.select().from(uploads).where(and(...conditions))
      : db.select().from(uploads)

    const rows = await query
      .orderBy(desc(uploads.createdAt))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((row) => ({
      ...row,
      url: getR2PublicUrl(row.key, cdnDomain),
    }))

    return c.json({
      data: {
        items,
        total: items.length,
        limit,
        offset,
        hasMore,
      },
      ok: true,
    })
  },
)
