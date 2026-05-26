import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { users } from '../users'

export const itemEvents = sqliteTable(
    'item_events',
    {
        id: text('id').notNull().primaryKey(),
        name: text('name').notNull(),
        logo: text('logo'),
        description: text('description'),
        linkSocial: text('link_social', { mode: 'json' })
            .$type<{
                type: 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'other';
                url?: string;
                handle?: string;
                isPublic: boolean
            }[]>()
            .default(sql`('[]')`),
        level: integer('level').default(0),
        parentId: text('parent_id'),
        type: text('type', {
            enum: ['player', 'team', 'tournament'],
        }).notNull(),
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
