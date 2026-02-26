// ============================================================
// Shared Constants
// ============================================================

// ─── User Roles ───────────────────────────────────────────────
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  ROOT: 'root',
} as const

export const ACCOUNT_TYPES = {
  STANDARD: 'standard',
  PREMIUM: 'premium',
} as const

export const USER_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted',
} as const

export const SUSPEND_TYPES = {
  TEMPORARY: 'temporary',
  PERMANENT: 'permanent',
} as const

// ─── Level & XP System ────────────────────────────────────────
// XP required to reach each level (cumulative from level 1)
export const LEVEL_XP_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 900,
  6: 1400,
  7: 2100,
  8: 3000,
  9: 4200,
  10: 5700,
  11: 7500,
  12: 9800,
  13: 12500,
  14: 15800,
  15: 19800,
  20: 40000,
  30: 120000,
  50: 500000,
} as const

export const MAX_LEVEL = 50

export function getLevelFromXP(xp: number): number {
  const levels = Object.keys(LEVEL_XP_THRESHOLDS).map(Number).sort((a, b) => b - a)
  for (const level of levels) {
    if (xp >= LEVEL_XP_THRESHOLDS[level]) return level
  }
  return 1
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0
  const levels = Object.keys(LEVEL_XP_THRESHOLDS).map(Number).sort((a, b) => a - b)
  const next = levels.find(l => l > currentLevel)
  return next ? LEVEL_XP_THRESHOLDS[next] : 0
}

// XP rewards per action
export const XP_REWARDS = {
  PREDICTION_MADE: 10,
  PREDICTION_WIN: 25,
  LOGIN_STREAK: 5,
  QUEST_COMPLETE: 50,
  ACHIEVEMENT: 30,
  GROUP_ACTIVITY: 5,
} as const

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

// ─── Upload Constants ─────────────────────────────────────────

export const UPLOAD_CATEGORIES = {
  AVATAR: 'avatar',
  GROUP_AVATAR: 'group_avatar',
  GROUP_COVER: 'group_cover',
  SHOP_ASSET: 'shop_asset',
  ACHIEVEMENT_ICON: 'achievement_icon',
  GENERAL: 'general',
} as const

export type UploadCategory = typeof UPLOAD_CATEGORIES[keyof typeof UPLOAD_CATEGORIES]

/** Max file size in bytes per category */
export const UPLOAD_MAX_SIZE: Record<UploadCategory, number> = {
  avatar: 2 * 1024 * 1024,           // 2 MB
  group_avatar: 2 * 1024 * 1024,     // 2 MB
  group_cover: 5 * 1024 * 1024,      // 5 MB
  shop_asset: 5 * 1024 * 1024,       // 5 MB
  achievement_icon: 2 * 1024 * 1024,  // 2 MB
  general: 10 * 1024 * 1024,         // 10 MB
}

/** Allowed MIME types per category */
export const UPLOAD_ALLOWED_TYPES: Record<UploadCategory, string[]> = {
  avatar:           ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  group_avatar:     ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  group_cover:      ['image/jpeg', 'image/png', 'image/webp'],
  shop_asset:       ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  achievement_icon: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  general:          ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'],
}

export const ALL_UPLOAD_CATEGORIES = Object.values(UPLOAD_CATEGORIES)
