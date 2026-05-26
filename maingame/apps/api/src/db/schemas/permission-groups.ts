import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'

/** Permission groups table — stores named groups with JSON array of permissions */
export const permissionGroups = sqliteTable('permission_groups', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  /** JSON-serialized string[] of permission keys, e.g. '["game:create","game:edit"]' */
  permissions: text('permissions').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
})
