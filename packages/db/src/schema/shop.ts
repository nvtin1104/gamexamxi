import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  badgeRarity: text('badge_rarity')
    .default('COMMON')
    .notNull()
    .$type<'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'>(),
  pointReward: integer('point_reward').default(0).notNull(),
  condition: text('condition', { mode: 'json' }).notNull(),
})

export const shopItems = sqliteTable('shop_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // AVATAR_FRAME | BADGE | THEME | BOOST | EMOTE
  price: integer('price').notNull(),
  assetUrl: text('asset_url'),
  metadata: text('metadata', { mode: 'json' }),
  isLimited: integer('is_limited', { mode: 'boolean' }).default(false).notNull(),
  stock: integer('stock'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
})
