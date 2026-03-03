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
  pointsBalance: number
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
