import { z } from 'zod'

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const mediaUploadSchema = z.object({
  alt: z.string().max(500).optional(),
})

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
})

export type MediaListQuery = z.infer<typeof mediaListQuerySchema>
