import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core'
import { users } from './users'
import { permissionGroups } from './permission-groups'

/** Many-to-many join: users ↔ permission_groups */
export const userPermissions = sqliteTable(
  'user_permissions',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => permissionGroups.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.groupId] }),
  })
)
