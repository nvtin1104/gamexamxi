import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { groups } from './groups'

export const predictionEvents = sqliteTable('prediction_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: text('creator_id').references(() => users.id, { onDelete: 'set null' }),
  groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'BINARY' | 'SCORE' | 'RANKING' | 'POLL' | 'TIMELINE'>(),
  options: text('options', { mode: 'json' }).notNull(),
  pointReward: integer('point_reward').default(100).notNull(),
  bonusMultiplier: real('bonus_multiplier').default(1.0).notNull(),
  predictDeadline: text('predict_deadline').notNull(),
  resolveAt: text('resolve_at'),
  correctAnswer: text('correct_answer', { mode: 'json' }),
  status: text('status').default('OPEN').notNull().$type<'OPEN' | 'LOCKED' | 'RESOLVED' | 'CANCELLED'>(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})

export const predictions = sqliteTable('predictions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  eventId: text('event_id').references(() => predictionEvents.id, { onDelete: 'cascade' }),
  answer: text('answer', { mode: 'json' }).notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  pointsEarned: integer('points_earned').default(0).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
