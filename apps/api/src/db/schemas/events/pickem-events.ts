import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { users } from '../users'
import { itemEvents } from './item-events'

export const pickemEvents = sqliteTable(
    'pickem_events',
    {
        id: text('id').notNull().primaryKey(),
        title: text('title').notNull(),
        thumbnail: text('thumbnail').notNull(),
        description: text('description').notNull(),
        winPoints: integer('win_points').notNull(),
        pickPoints: integer('pick_points').notNull(),
        winExp: integer('win_exp').notNull(),
        pickExp: integer('pick_exp').notNull(),
        eventDate: text('event_date').notNull(),
        closePicksAt: text('close_picks_at').notNull(),
        maxPickItems: integer('max_pick_items').notNull(),
        createdBy: text('created_by')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: text('updated_at').notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id] }),
    })
)
export const pickemEventOptions = sqliteTable(
    'pickem_event_options',
    {
        id: text('id').notNull().primaryKey(),
        eventId: text('event_id')
            .notNull()
            .references(() => pickemEvents.id, { onDelete: 'cascade' }),
        eventItemId: text('event_item_id')
            .notNull()
            .references(() => itemEvents.id, { onDelete: 'cascade' }),
        isWinningOption: integer('is_winning_option').notNull().default(0),

    },
    (t) => ({
        pk: primaryKey({ columns: [t.id] }),
    })
)
export const pickemEventPicks = sqliteTable(
    'pickem_event_picks',
    {
        id: text('id').notNull().primaryKey(),
        userId: text('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        eventId: text('event_id')
            .notNull()
            .references(() => pickemEvents.id, { onDelete: 'cascade' }),
        optionId: text('option_id')
            .notNull()
            .references(() => pickemEventOptions.id, { onDelete: 'cascade' }),
        pickedAt: text('picked_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id] }),
    })
)
