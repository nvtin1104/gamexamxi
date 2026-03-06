import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'

/** Tracks a user's point balance and limit */
export const userPoints = sqliteTable('user_points', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  pointLimit: integer('point_limit').notNull().default(10000),
})
