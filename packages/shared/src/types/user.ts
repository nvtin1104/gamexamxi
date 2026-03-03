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
  level: number
  experience: number
  pointsBalance: number
  loginStreak?: number | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

/** Payload for creating a new user */
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
  role?: UserRole
  status?: UserStatus
  avatar?: string
  phone?: string
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
