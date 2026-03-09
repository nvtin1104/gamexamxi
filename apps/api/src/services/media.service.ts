import { createId } from '@paralleldrive/cuid2'
import { eq, desc, count } from 'drizzle-orm'
import { getDb } from '../db'
import { media } from '../db/schemas'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
import type { R2Bucket } from '@cloudflare/workers-types'

export interface MediaServiceOptions {
  storage: R2Bucket
  env: {
    R2_PUBLIC_URL?: string
  }
}

export interface FindAllMediaParams {
  page?: number
  pageSize?: number
}

export interface PaginatedMedia {
  data: typeof media.$inferSelect[]
  total: number
  page: number
  pageSize: number
}

export interface CreateMediaData {
  fileName: string
  fileKey: string
  fileUrl: string
  mimeType: string
  fileSize: number
  width?: number
  height?: number
  alt?: string
  uploadedBy: string
}

export class MediaService {
  private db: ReturnType<typeof getDb>
  private storage: R2Bucket
  private publicUrl: string

  constructor(d1: D1Database, options: MediaServiceOptions) {
    this.db = getDb(d1)
    this.storage = options.storage
    this.publicUrl = options.env.R2_PUBLIC_URL || ''
  }

  async findAll(params?: FindAllMediaParams): Promise<PaginatedMedia> {
    const page = Math.max(1, params?.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20))
    const offset = (page - 1) * pageSize

    const countResult = await this.db
      .select({ count: count() })
      .from(media)
      .get()
    const total = countResult?.count ?? 0

    const rows = await this.db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(pageSize)
      .offset(offset)
      .all()

    return {
      data: rows,
      total,
      page,
      pageSize,
    }
  }

  async findById(id: string) {
    return this.db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .get()
  }

  async create(data: CreateMediaData) {
    const result = await this.db
      .insert(media)
      .values({
        id: createId(),
        ...data,
        createdAt: new Date(),
      })
      .returning()
      .get()
    return result
  }

  async delete(id: string) {
    const mediaRecord = await this.findById(id)
    if (!mediaRecord) {
      return { success: false, error: 'Media not found' }
    }

    await this.storage.delete(mediaRecord.fileKey)

    await this.db.delete(media).where(eq(media.id, id)).run()

    return { success: true }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`
    }
    return `https://pub-${process.env.CF_ACCOUNT_ID || ''}.cdn Cf.net/${key}`
  }

  static validateFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return {
        valid: false,
        error: 'Chỉ chấp nhận file hình ảnh: JPEG, PNG, GIF, WebP',
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Kích thước file không được vượt quá ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }
    }

    return { valid: true }
  }

  static generateFileKey(fileName: string): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const randomId = createId().slice(0, 8)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${year}/${month}/${randomId}-${sanitizedName}`
  }
}
