/** User XP & level stats */
export interface UserStats {
  userId: string
  currentXp: number
  currentLevel: number
}

/** Result returned after adding XP (includes level-up info) */
export interface LevelUpResult {
  currentXp: number
  currentLevel: number
  leveledUp: boolean
  newLevel?: number
  bonusPoints?: number
}
