// ============================================================
// Shared Types — used by both worker and web
// ============================================================

// ─── Queue Message Types ─────────────────────────────────────

export type PointsQueueMessage = {
  type: 'PREDICTION_WIN' | 'LOGIN_STREAK' | 'QUEST_COMPLETE' | 'ACHIEVEMENT' | 'WELCOME_BONUS' | 'SHOP_PURCHASE'
  userId: string
  amount: number
  referenceId?: string
  note?: string
}

export type AchievementQueueMessage = {
  userId: string
  trigger: 'PREDICTION_CORRECT' | 'LOGIN' | 'GROUP_JOIN' | 'PURCHASE' | 'STREAK'
  metadata: Record<string, unknown>
}

export type NotificationQueueMessage = {
  type: 'EVENT_RESULT' | 'STREAK_REMINDER' | 'QUEST_RESET' | 'GROUP_ACTIVITY' | 'ACHIEVEMENT_UNLOCKED'
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

// ─── API Response Types ──────────────────────────────────────

export type ApiResponse<T> = {
  data?: T
  error?: string
  ok: boolean
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ─── Domain Types ─────────────────────────────────────────────

// ─── User Enums ───────────────────────────────────────────────
export type UserPlatformRole = 'user' | 'moderator' | 'admin' | 'root'
export type UserAccountType = 'standard' | 'premium'
export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted'
export type SuspendType = 'temporary' | 'permanent'

// Group-level roles (separate from platform role)
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type GroupStyle = 'FRIENDS' | 'COUPLE' | 'FAMILY'
export type EventStatus = 'OPEN' | 'LOCKED' | 'RESOLVED' | 'CANCELLED'
export type EventType = 'BINARY' | 'SCORE' | 'RANKING' | 'POLL' | 'TIMELINE'
export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type QuestStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED'
export type PointTransactionType =
  | 'PREDICTION_WIN'
  | 'LOGIN_STREAK'
  | 'QUEST_COMPLETE'
  | 'ACHIEVEMENT'
  | 'SHOP_PURCHASE'
  | 'WELCOME_BONUS'
  | 'ADMIN_GRANT'
  | 'ADMIN_DEDUCT'

export type ExperienceTransactionType =
  | 'PREDICTION_MADE'
  | 'PREDICTION_WIN'
  | 'LOGIN_STREAK'
  | 'QUEST_COMPLETE'
  | 'ACHIEVEMENT'
  | 'GROUP_ACTIVITY'

export type User = {
  id: string
  username: string
  name: string | null
  email: string
  avatar: string | null
  ggId: string | null
  bio: string | null
  role: UserPlatformRole
  account: UserAccountType
  status: UserStatus
  customPermissions: string[] | null  // extra permissions beyond role defaults
  supendType: SuspendType | null
  supendUntil: string | null
  supendReason: string | null
  supendAt: string | null
  experience: number
  level: number
  points: number
  totalPointsEarned: number
  loginStreak: number
  lastLoginAt: string | null
  createdAt: string | null
}

export type Group = {
  id: string
  name: string
  description: string | null
  style: GroupStyle
  avatarUrl: string | null
  coverUrl: string | null
  inviteCode: string | null
  isPrivate: boolean
  settings: Record<string, unknown>
  createdBy: string | null
  createdAt: string | null
  memberCount?: number
}

export type PredictionEvent = {
  id: string
  creatorId: string | null
  groupId: string | null
  title: string
  description: string | null
  type: EventType
  options: unknown
  pointReward: number
  bonusMultiplier: number
  predictDeadline: string
  resolveAt: string | null
  correctAnswer: unknown
  status: EventStatus
  isPublic: boolean
  createdAt: string | null
  predictionsCount?: number
  myPrediction?: Prediction | null
}

export type Prediction = {
  id: string
  userId: string | null
  eventId: string | null
  answer: unknown
  isCorrect: boolean | null
  pointsEarned: number
  createdAt: string | null
}

export type Achievement = {
  id: string
  code: string
  name: string
  description: string | null
  iconUrl: string | null
  badgeRarity: BadgeRarity
  pointReward: number
  condition: unknown
}

export type ShopItem = {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  assetUrl: string | null
  metadata: unknown
  isLimited: boolean
  stock: number | null
  isActive: boolean
  createdAt: string | null
}

export type GroupMember = {
  id: string
  groupId: string
  userId: string
  role: UserRole
  nickname: string | null
  joinedAt: string | null
  user?: Pick<User, 'id' | 'username' | 'avatar' | 'points'>
}

export type GroupQuest = {
  id: string
  groupId: string
  createdBy: string | null
  title: string
  description: string | null
  pointReward: number
  assignedTo: string[] | null
  deadline: string | null
  condition: unknown
  status: QuestStatus
  createdAt: string | null
}

export type PointTransaction = {
  id: string
  userId: string | null
  amount: number
  type: PointTransactionType
  referenceId: string | null
  referenceTable: string | null
  balanceAfter: number
  description: string | null
  createdAt: string | null
}

export type ExperienceTransaction = {
  id: string
  userId: string | null
  amount: number
  type: ExperienceTransactionType
  referenceId: string | null
  referenceTable: string | null
  balanceAfter: number
  createdAt: string | null
}

export type LevelUpTransaction = {
  id: string
  userId: string | null
  oldLevel: number
  newLevel: number
  experienceGained: number
  createdAt: string | null
}

export type UserItem = {
  id: string
  userId: string | null
  itemId: string
  purchasedAt: string | null
  equippedAt: string | null
  item?: ShopItem
}

// ─── API Request Types ────────────────────────────────────────

export type CreateEventBody = {
  title: string
  description?: string
  type: EventType
  options: unknown
  groupId?: string
  pointReward?: number
  bonusMultiplier?: number
  predictDeadline: string
  resolveAt?: string
  isPublic?: boolean
}

export type CreateGroupBody = {
  name: string
  description?: string
  style: GroupStyle
  isPrivate?: boolean
}

export type CreateQuestBody = {
  title: string
  description?: string
  pointReward?: number
  assignedTo?: string[]
  deadline?: string
  condition?: unknown
}

export type UpdateUserBody = {
  username?: string
  name?: string
  bio?: string
  avatar?: string
}

// ─── Leaderboard Types ────────────────────────────────────────

export type LeaderboardEntry = {
  userId: string
  score: number
  rank: number
  user?: Pick<User, 'id' | 'username' | 'avatar'> | null
}

// ─── Permission Group Types ────────────────────────────────────

export type PermissionGroup = {
  id: string
  name: string
  description: string | null
  permissions: string[]       // deserialized from JSON
  createdAt: string | null
}

export type UserPermissionGroup = {
  userId: string
  groupId: string
  assignedAt: string | null
  assignedBy: string | null
  group?: PermissionGroup
}

// ─── Admin Types ──────────────────────────────────────────────

export type AdminStats = {
  totalUsers: number
  totalEvents: number
  totalGroups: number
  totalTransactions: number
  recentUsers: User[]
}

// ─── WebSocket Message Types ──────────────────────────────────

export type WSMessageType =
  | 'GAME_STATE'
  | 'PREDICTION_UPDATE'
  | 'GAME_RESOLVED'
  | 'GROUP_ACTIVITY'
  | 'MEMBER_JOINED'
  | 'PING'
  | 'PONG'

export type WSMessage<T = unknown> = {
  type: WSMessageType
  data: T
}

// ─── Upload Types ─────────────────────────────────────────────

export type Upload = {
  id: string
  key: string
  url: string
  filename: string
  mimeType: string
  size: number
  category: string
  entityId: string | null
  uploadedBy: string
  createdAt: string | null
}

export type UploadResponse = {
  id: string
  url: string
  key: string
  filename: string
  mimeType: string
  size: number
}
