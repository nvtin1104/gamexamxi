import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  style: text('style').notNull().$type<'FRIENDS' | 'COUPLE' | 'FAMILY'>(),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  inviteCode: text('invite_code').unique().$defaultFn(() =>
    crypto.randomUUID().slice(0, 8).toUpperCase()
  ),
  isPrivate: integer('is_private', { mode: 'boolean' }).default(false),
  settings: text('settings', { mode: 'json' }).default('{}'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('MEMBER').notNull().$type<'OWNER' | 'ADMIN' | 'MEMBER'>(),
  nickname: text('nickname'),
  joinedAt: text('joined_at').default(sql`(datetime('now'))`),
})

export const groupQuests = sqliteTable('group_quests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  pointReward: integer('point_reward').default(50),
  assignedTo: text('assigned_to', { mode: 'json' }).$type<string[] | null>(),
  deadline: text('deadline'),
  condition: text('condition', { mode: 'json' }),
  status: text('status').default('ACTIVE').$type<'ACTIVE' | 'COMPLETED' | 'EXPIRED'>(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const questCompletions = sqliteTable('quest_completions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  questId: text('quest_id')
    .notNull()
    .references(() => groupQuests.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  completedAt: text('completed_at').default(sql`(datetime('now'))`),
})
