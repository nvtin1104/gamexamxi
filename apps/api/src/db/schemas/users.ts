import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { APP_ROLES } from '../../constants/permissions'

/** Users table */
export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role', { enum: APP_ROLES })
      .notNull()
      .default('user'),
    passwordHash: text('password_hash'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdateFn(
      () => new Date()
    ),
  },
  (t) => ({
    emailIdx: index('email_idx').on(t.email),
  })
)
