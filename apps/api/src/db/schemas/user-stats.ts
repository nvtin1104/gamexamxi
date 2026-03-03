import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'

/** Tracks a user's XP and current level */
export const userStats = sqliteTable('user_stats', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentXp: integer('current_xp').notNull().default(0),
  currentLevel: integer('current_level').notNull().default(1),
})
