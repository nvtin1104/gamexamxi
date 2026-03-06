import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './users'

/** Immutable log of every point change */
export const pointTransactions = sqliteTable(
  'point_transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    type: text('type', {
      enum: ['reward', 'spend', 'admin_grant', 'level_bonus'],
    }).notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => ({
    userIdx: index('pt_user_idx').on(t.userId),
    createdIdx: index('pt_created_idx').on(t.createdAt),
  })
)
