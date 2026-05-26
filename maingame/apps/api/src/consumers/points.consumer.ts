import { getDb } from '../db'
import { userPoints, pointTransactions } from '../db/schemas'
import { eq } from 'drizzle-orm'
import type { PointsQueueMessage } from '../types/queue-messages'

/** Consumer handler for points queue */
export async function handlePointsMessage(
  message: PointsQueueMessage,
  env: any
): Promise<void> {
  try {
    const db = getDb(env.DB)

    // Get or initialize user's points record
    let record = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, message.userId))
      .get()

    if (!record) {
      record = await db
        .insert(userPoints)
        .values({ userId: message.userId })
        .returning()
        .get()
    }

    // Calculate new balance
    const newBalance = record.balance + message.amount

    // Validate
    if (newBalance < 0) {
      console.warn(
        `[Points Consumer] Insufficient balance for user ${message.userId}. Required: ${-message.amount}, Available: ${record.balance}`
      )
      throw new Error('Insufficient balance')
    }

    if (newBalance > record.pointLimit) {
      console.warn(
        `[Points Consumer] Balance would exceed limit for user ${message.userId}. Limit: ${record.pointLimit}, New balance: ${newBalance}`
      )
      throw new Error('Balance would exceed limit')
    }

    // Atomic transaction: update balance + insert log
    await db.batch([
      db
        .update(userPoints)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(userPoints.userId, message.userId)),
      db.insert(pointTransactions).values({
        userId: message.userId,
        amount: message.amount,
        type: message.transactionType,
        description: message.description ?? null,
      }),
    ])

    console.log(
      `[Points Consumer] Successfully processed ${message.amount} points for user ${message.userId}. New balance: ${newBalance}`
    )
  } catch (error) {
    console.error(
      `[Points Consumer] Error processing message for user ${message.userId}:`,
      error
    )
    // Re-throw to trigger queue retry
    throw error
  }
}
