/** User roles available in the system */
export type UserRole = 'admin' | 'mod' | 'user'

/** User account status */
export type UserStatus = 'active' | 'banned' | 'block'

/** Core user entity */
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  avatar?: string | null
  phone?: string | null
  address?: string | null
  birthdate?: string | null        // ISO date string (serialized from timestamp)
  level: number
  experience: number
  pointsBalance: number
  pointsEarned: number
  pointsSpent: number
  pointsExpired: number
  pointsExpiring: number
  loginStreak?: number | null
  lastLoginAt?: string | null
  emailVerifiedAt?: string | null  // null = not verified; ISO string = verified
  blockExpiresAt?: string | null
  blockReason?: string | null
  banReason?: string | null
  lastLoginIp?: string | null      // only populated for admin callers
  createdAt: string
  updatedAt: string
}

/** Payload for creating a new user (admin action) */
export interface CreateUserInput {
  email: string
  name: string
  role?: UserRole
  password: string
}

/** Payload for updating an existing user */
export interface UpdateUserInput {
  email?: string
  name?: string
  role?: UserRole          // admin only
  status?: UserStatus      // admin only
  avatar?: string
  phone?: string
  address?: string
  birthdate?: string       // ISO date string
  banReason?: string       // admin only
  blockReason?: string     // admin only
  blockExpiresAt?: string  // admin only, ISO date string
}

/** Full user profile returned by GET /users/:id/profile */
export interface UserProfile extends User {
  stats: {
    userId: string
    currentXp: number
    currentLevel: number
  } | null
  points: {
    userId: string
    balance: number
    pointLimit: number
  } | null
  groups: Array<{
    id: string
    name: string
    permissions: string[]
    createdAt: string | null
  }>
}
