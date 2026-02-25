import type { Message } from '@cloudflare/workers-types'
import { eq, sql } from 'drizzle-orm'
import { users, pointTransactions } from '@gamexamxi/db/schema'
import type { Env } from '../types'
import { createDb } from '../lib/db'
import { updateLeaderboard, KVKeys } from '../lib/kv'
import type { PointsQueueMessage } from '@gamexamxi/shared'
import { chunk } from '../lib/utils'

export async function handlePointsBatch(
  messages: Message<PointsQueueMessage>[],
  env: Env
): Promise<void> {
  const db = createDb(env.DB)

  // Group by userId for batch D1 update
  const grouped = messages.reduce(
    (acc, msg) => {
      const { userId, amount } = msg.body
      acc[userId] = (acc[userId] ?? 0) + amount
      return acc
    },
    {} as Record<string, number>
  )

  // Batch update users table
  for (const batch of chunk(Object.entries(grouped), 20)) {
    await Promise.all(
      batch.map(([userId, totalDelta]) =>
        db
          .update(users)
          .set({
            points: sql`points + ${totalDelta}`,
            totalPointsEarned: sql`total_points_earned + ${Math.max(0, totalDelta)}`,
          })
          .where(eq(users.id, userId))
      )
    )
  }

  // Insert transaction log
  for (const msg of messages) {
    const { userId, amount, type, referenceId, note } = msg.body
    await db.insert(pointTransactions).values({ userId, amount, type, referenceId, note })
    msg.ack()
  }

  // Update leaderboard KV
  for (const userId of Object.keys(grouped)) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, totalPointsEarned: true },
    })
    if (user) {
      await updateLeaderboard(
        env.KV_LEADERBOARD,
        KVKeys.globalLB(),
        userId,
        user.totalPointsEarned
      )
    }
  }
}
