import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { shopItems, users, userItems } from '@gamexamxi/db/schema'
import type { Env, Variables } from '../types'
import { createDb } from '../lib/db'
import { trackEvent } from '../lib/analytics'

const shopRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/shop — List items
shopRouter.get('/', async (c) => {
  const { category } = c.req.query()
  const db = createDb(c.env.DB)

  const items = await db.query.shopItems.findMany({
    where: eq(shopItems.isActive, true),
    orderBy: (t, { asc }) => asc(t.price),
  })

  const filtered = category ? items.filter((i) => i.category === category) : items

  return c.json({ data: filtered, ok: true })
})

// POST /api/shop/:id/purchase
shopRouter.post('/:id/purchase', async (c) => {
  const itemId = c.req.param('id')
  const userId = c.get('userId')
  const db = createDb(c.env.DB)

  const item = await db.query.shopItems.findFirst({ where: eq(shopItems.id, itemId) })
  if (!item) return c.json({ error: 'Item not found', ok: false }, 404)
  if (!item.isActive) return c.json({ error: 'Item not available', ok: false }, 400)
  if (item.stock !== null && item.stock <= 0) {
    return c.json({ error: 'Out of stock', ok: false }, 400)
  }

  // Check if already purchased (non-stackable items)
  const existing = await db.query.userItems.findFirst({
    where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.itemId, itemId)),
  })
  if (existing) return c.json({ error: 'Item already owned', ok: false }, 409)

  // Check user balance
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return c.json({ error: 'User not found', ok: false }, 404)
  if (user.points < item.price) {
    return c.json({ error: 'Insufficient points', ok: false }, 402)
  }

  // Deduct points and add item atomically via PointsLedger DO
  const ledgerId = c.env.POINTS_LEDGER.idFromName(`user:${userId}`)
  const ledger = c.env.POINTS_LEDGER.get(ledgerId)
  const deductResult = await ledger.fetch(
    new Request('https://do/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'DEDUCT',
        userId,
        amount: item.price,
        type: 'SHOP_PURCHASE',
        note: `Purchased: ${item.name}`,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
  )

  const result = await deductResult.json<{ ok: boolean; newPoints: number }>()
  if (!result.ok) {
    return c.json({ error: 'Purchase failed', ok: false }, 500)
  }

  // Sync points to D1
  await db
    .update(users)
    .set({ points: result.newPoints })
    .where(eq(users.id, userId))

  // Add to user items
  await db.insert(userItems).values({ userId, itemId })

  // Update stock
  if (item.stock !== null) {
    await db
      .update(shopItems)
      .set({ stock: item.stock - 1 })
      .where(eq(shopItems.id, itemId))
  }

  // Achievement check
  await c.env.ACHIEVEMENTS_QUEUE.send({
    userId,
    trigger: 'PURCHASE',
    metadata: { itemId, category: item.category },
  })

  trackEvent(c.env.ANALYTICS, {
    type: 'SHOP_PURCHASE',
    userId,
    value: item.price,
    metadata: { itemId, category: item.category },
  })

  return c.json({ ok: true, data: { newPoints: result.newPoints, item } })
})

export { shopRouter }
