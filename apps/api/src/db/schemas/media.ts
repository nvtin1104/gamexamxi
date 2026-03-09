import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    fileName: text('file_name').notNull(),
    fileKey: text('file_key').notNull(),
    fileUrl: text('file_url').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt'),
    uploadedBy: text('uploaded_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (t) => ({
    uploadedByIdx: index('media_uploaded_by_idx').on(t.uploadedBy),
    createdAtIdx: index('media_created_at_idx').on(t.createdAt),
  })
)

export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
