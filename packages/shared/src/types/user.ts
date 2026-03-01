/** User roles available in the system */
export type UserRole = 'admin' | 'user' | 'viewer'

/** Core user entity */
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

/** Payload for creating a new user */
export interface CreateUserInput {
  email: string
  name: string
  role?: UserRole
}

/** Payload for updating an existing user */
export interface UpdateUserInput {
  email?: string
  name?: string
  role?: UserRole
}
