// ============================================================
// Shared Constants
// ============================================================

export const LOGIN_STREAK_BONUSES: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  5: 30,
  7: 50,
  14: 100,
  30: 200,
}

export function calculateLoginBonus(streak: number): number {
  // Find the highest matching milestone
  const milestones = Object.keys(LOGIN_STREAK_BONUSES)
    .map(Number)
    .sort((a, b) => b - a)
  for (const milestone of milestones) {
    if (streak >= milestone) return LOGIN_STREAK_BONUSES[milestone]
  }
  return 5 // base daily bonus
}

export const ACHIEVEMENT_CODES = {
  FIRST_PREDICTION: 'FIRST_PREDICTION',
  TEN_PREDICTIONS: 'TEN_PREDICTIONS',
  FIFTY_PREDICTIONS: 'FIFTY_PREDICTIONS',
  STREAK_7: 'STREAK_7',
  STREAK_30: 'STREAK_30',
  FIRST_WIN: 'FIRST_WIN',
  TEN_WINS: 'TEN_WINS',
  GROUP_CREATOR: 'GROUP_CREATOR',
  SOCIAL_BUTTERFLY: 'SOCIAL_BUTTERFLY',
  SHOPAHOLIC: 'SHOPAHOLIC',
} as const

export const MAX_GROUPS_PER_USER = 10
export const MAX_GROUP_MEMBERS = 50
export const DEFAULT_WELCOME_POINTS = 100
export const DEFAULT_POINT_REWARD = 100
export const LEADERBOARD_SIZE = 100
export const SESSION_TTL_SECONDS = 86400 * 30 // 30 days
export const CACHE_TTL_SHORT = 30 // 30 seconds
export const CACHE_TTL_MEDIUM = 300 // 5 minutes
export const CACHE_TTL_LONG = 3600 // 1 hour
