import { eq, desc } from 'drizzle-orm'
import { getDb } from '../db'
import { userPoints, pointTransactions } from '../db/schemas'
import type { PointsQueueMessage } from '../types/queue-messages'

/** Point service — manages user balance with safe transactions via db.batch() */
export class PointService {
  private db: ReturnType<typeof getDb>
  private queue?: Queue<PointsQueueMessage>

  constructor(d1: D1Database, queue?: Queue<PointsQueueMessage>) {
    this.db = getDb(d1)
    this.queue = queue
  }

  /** Get or initialize a user's point record */
  async getBalance(userId: string) {
    let record = await this.db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .get()

    if (!record) {
      record = await this.db
        .insert(userPoints)
        .values({ userId })
        .returning()
        .get()
    }

    return record
  }

  /**
   * Execute a point transaction atomically via db.batch().
   * Validates: 0 <= (balance + amount) <= pointLimit
   */
  async executeTransaction(
    userId: string,
    amount: number,
    type: 'reward' | 'spend' | 'admin_grant' | 'level_bonus',
    description?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const current = await this.getBalance(userId)

    const newBalance = current.balance + amount

    if (newBalance < 0) {
      return {
        success: false,
        newBalance: current.balance,
        error: 'Insufficient balance',
      }
    }

    if (newBalance > current.pointLimit) {
      return {
        success: false,
        newBalance: current.balance,
        error: `Balance would exceed limit (${current.pointLimit})`,
      }
    }

    // Atomic batch: update balance + insert transaction log
    await this.db.batch([
      this.db
        .update(userPoints)
        .set({ balance: newBalance })
        .where(eq(userPoints.userId, userId)),
      this.db.insert(pointTransactions).values({
        userId,
        amount,
        type,
        description: description ?? null,
      }),
    ])

    return { success: true, newBalance }
  }

  /** Get transaction history for a user (paginated) */
  async getHistory(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize

    const rows = await this.db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(pageSize)
      .offset(offset)
      .all()

    return rows
  }

  /**
   * Queue a point transaction for async processing.
   * Useful for non-blocking operations (reward distributions, bulk updates, etc.)
   * @param userId User ID
   * @param amount Points to add (positive) or remove (negative)
   * @param type Transaction type
   * @param description Optional description
   * @returns true if queued successfully, false if queue not available
   */
  async queueTransaction(
    userId: string,
    amount: number,
    type: 'reward' | 'spend' | 'admin_grant' | 'level_bonus',
    description?: string
  ): Promise<boolean> {
    if (!this.queue) {
      console.warn('[PointService] Queue not available, falling back to sync transaction')
      const result = await this.executeTransaction(userId, amount, type, description)
      return result.success
    }

    try {
      const message: PointsQueueMessage = {
        type: 'point_transaction',
        userId,
        amount,
        transactionType: type,
        description,
        createdAt: new Date().toISOString(),
      }

      await this.queue.send(message)
      console.log(`[PointService] Queued ${amount} points for user ${userId}`)
      return true
    } catch (error) {
      console.error('[PointService] Failed to queue transaction:', error)
      // Fallback to sync execution
      const result = await this.executeTransaction(userId, amount, type, description)
      return result.success
    }
  }
}
