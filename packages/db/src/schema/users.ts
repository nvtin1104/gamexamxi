import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  name: text('name'),
  email: text('email').notNull().unique(),
  password: text('password'),
  avatar: text('avatar'),
  ggId: text('gg_id').unique(),
  bio: text('bio'),
  // status and role fields
  role: text('role').default('user').notNull(), // user, moderator, admin, root
  accoutType: text('account_type').default('standard').notNull(), // standard, premium
  status: text('status').default('active').notNull(),
  // Suspension fields block/ban users from accessing their accounts. They can be used for temporary or permanent suspensions.
  supendType: text('suspend_type'),
  supendUntil: text('suspend_until'),
  supendReason: text('suspend_reason'),
  supendAt: text('suspend_at'),
  // experience and level
  experience: integer('experience').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  // Points and achievements
  points: integer('points').default(0).notNull(),
  totalPointsEarned: integer('total_points_earned').default(0).notNull(),
  loginStreak: integer('login_streak').default(0).notNull(),
  // Timestamps
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const pointTransactions = sqliteTable('point_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  referenceTable: text('reference_table'),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const levelUpTransactions = sqliteTable('level_up_transactions', { 
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  oldLevel: integer('old_level').notNull(),
  newLevel: integer('new_level').notNull(),
  experienceGained: integer('experience_gained').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const experienceTransactions = sqliteTable('experience_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),  
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  referenceId: text('reference_id'),
  referenceTable: text('reference_table'),
  balanceAfter: integer('balance_after').notNull(),
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
