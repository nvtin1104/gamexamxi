import type { Message } from '@cloudflare/workers-types'
import { eq } from 'drizzle-orm'
import { achievements, userAchievements, predictions, groupMembers } from '@gamexamxi/db/schema'
import type { Env } from '../types'
import { createDb } from '../lib/db'
import type { AchievementQueueMessage } from '@gamexamxi/shared'
import { ACHIEVEMENT_CODES } from '@gamexamxi/shared'

export async function handleAchievementBatch(
  messages: Message<AchievementQueueMessage>[],
  env: Env
): Promise<void> {
  const db = createDb(env.DB)

  for (const msg of messages) {
    const { userId, trigger } = msg.body

    try {
      if (trigger === 'PREDICTION_CORRECT') {
        const count = await db.query.predictions.findMany({
          where: eq(predictions.userId, userId),
        })

        await checkAndUnlock(db, env, userId, ACHIEVEMENT_CODES.FIRST_PREDICTION, count.length >= 1)
        await checkAndUnlock(db, env, userId, ACHIEVEMENT_CODES.TEN_PREDICTIONS, count.length >= 10)
        await checkAndUnlock(db, env, userId, ACHIEVEMENT_CODES.FIFTY_PREDICTIONS, count.length >= 50)

        const wins = count.filter((p) => p.isCorrect === true)
        await checkAndUnlock(db, env, userId, ACHIEVEMENT_CODES.FIRST_WIN, wins.length >= 1)
        await checkAndUnlock(db, env, userId, ACHIEVEMENT_CODES.TEN_WINS, wins.length >= 10)
      }

      if (trigger === 'GROUP_JOIN') {
        const memberships = await db.query.groupMembers.findMany({
          where: eq(groupMembers.userId, userId),
        })
        await checkAndUnlock(
          db, env, userId, ACHIEVEMENT_CODES.GROUP_CREATOR,
          memberships.some((m) => m.role === 'OWNER')
        )
        await checkAndUnlock(
          db, env, userId, ACHIEVEMENT_CODES.SOCIAL_BUTTERFLY,
          memberships.length >= 3
        )
      }
    } catch {
      // Don't fail the whole batch for one user
    }

    msg.ack()
  }
}

async function checkAndUnlock(
  db: ReturnType<typeof createDb>,
  env: Env,
  userId: string,
  code: string,
  condition: boolean
) {
  if (!condition) return

  const achievement = await db.query.achievements.findFirst({
    where: eq(achievements.code, code),
  })
  if (!achievement) return

  const existing = await db.query.userAchievements.findFirst({
    where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.achievementId, achievement.id)),
  })
  if (existing) return

  await db.insert(userAchievements).values({ userId, achievementId: achievement.id })

  if (achievement.pointReward > 0) {
    await env.POINTS_QUEUE.send({
      type: 'ACHIEVEMENT',
      userId,
      amount: achievement.pointReward,
      referenceId: achievement.id,
      note: `Achievement: ${achievement.name}`,
    })
  }

  await env.NOTIFICATIONS_QUEUE.send({
    type: 'ACHIEVEMENT_UNLOCKED',
    userId,
    title: `Achievement Unlocked: ${achievement.name}`,
    body: achievement.description ?? '',
    data: { achievementId: achievement.id, rarity: achievement.badgeRarity },
  })
}
