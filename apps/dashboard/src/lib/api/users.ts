import type {
  ApiResponse,
  PaginatedResponse,
  User,
  UserProfile,
  CreateUserInput,
  UpdateUserInput,
  UserRole,
  UserStatus,
} from '@gamexamxi/shared'
import { api } from '../api-client'

export interface ListUsersParams {
  page?: number
  pageSize?: number
  search?: string
  role?: UserRole
  status?: UserStatus
  sortBy?: 'name' | 'email' | 'createdAt' | 'level' | 'pointsBalance'
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: ListUsersParams): string {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.search) q.set('search', params.search)
  if (params.role) q.set('role', params.role)
  if (params.status) q.set('status', params.status)
  if (params.sortBy) q.set('sortBy', params.sortBy)
  if (params.sortOrder) q.set('sortOrder', params.sortOrder)
  const str = q.toString()
  return str ? `?${str}` : ''
}

export function listUsers(params: ListUsersParams = {}) {
  return api.get<PaginatedResponse<User>>(`/users${buildQuery(params)}`)
}

export function getUser(id: string) {
  return api.get<ApiResponse<User>>(`/users/${id}`)
}

export function getUserProfile(id: string) {
  return api.get<ApiResponse<UserProfile>>(`/users/${id}/profile`)
}

export function createUser(data: CreateUserInput) {
  return api.post<ApiResponse<User>>('/users', data)
}

export function updateUser(id: string, data: UpdateUserInput) {
  return api.patch<ApiResponse<User>>(`/users/${id}`, data)
}

export function deleteUser(id: string) {
  return api.delete<{ success: boolean }>(`/users/${id}`)
}
