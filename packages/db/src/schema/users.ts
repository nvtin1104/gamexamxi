import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  points: integer('points').default(0).notNull(),
  totalPointsEarned: integer('total_points_earned').default(0).notNull(),
  loginStreak: integer('login_streak').default(0).notNull(),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const pointTransactions = sqliteTable('point_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  note: text('note'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const userAchievements = sqliteTable('user_achievements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id'),
  unlockedAt: text('unlocked_at').default(sql`(datetime('now'))`),
})

export const userItems = sqliteTable('user_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  purchasedAt: text('purchased_at').default(sql`(datetime('now'))`),
  equippedAt: text('equipped_at'),
})
