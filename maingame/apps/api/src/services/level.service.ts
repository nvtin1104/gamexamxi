import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { userStats } from '../db/schemas'
import { PointService } from './point.service'

/** XP-to-level formula: level = floor(xp / 500) + 1 */
function calculateLevel(xp: number): number {
  return Math.floor(xp / 500) + 1
}

/** Points awarded per level-up */
const LEVEL_UP_BONUS = 100

/** Level service — XP tracking and level-up logic */
export class LevelService {
  private db: ReturnType<typeof getDb>
  private pointService: PointService

  constructor(d1: D1Database) {
    this.db = getDb(d1)
    this.pointService = new PointService(d1)
  }

  /** Get or initialize a user's stats */
  async getStats(userId: string) {
    let stats = await this.db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .get()

    if (!stats) {
      stats = await this.db
        .insert(userStats)
        .values({ userId })
        .returning()
        .get()
    }

    return stats
  }

  /**
   * Add XP to a user. Returns level-up info if the user leveled up.
   */
  async addXp(
    userId: string,
    xpAmount: number
  ): Promise<{
    currentXp: number
    currentLevel: number
    leveledUp: boolean
    newLevel?: number
    bonusPoints?: number
  }> {
    const stats = await this.getStats(userId)

    const newXp = stats.currentXp + xpAmount
    const newLevel = calculateLevel(newXp)
    const leveledUp = newLevel > stats.currentLevel

    // Update XP and level
    await this.db
      .update(userStats)
      .set({ currentXp: newXp, currentLevel: newLevel })
      .where(eq(userStats.userId, userId))
      .run()

    // Award bonus points on level-up
    if (leveledUp) {
      const levelsGained = newLevel - stats.currentLevel
      const bonus = levelsGained * LEVEL_UP_BONUS

      await this.pointService.executeTransaction(
        userId,
        bonus,
        'level_bonus',
        `Level up! ${stats.currentLevel} → ${newLevel} (+${bonus} points)`
      )

      return {
        currentXp: newXp,
        currentLevel: newLevel,
        leveledUp: true,
        newLevel,
        bonusPoints: bonus,
      }
    }

    return {
      currentXp: newXp,
      currentLevel: newLevel,
      leveledUp: false,
    }
  }
}
