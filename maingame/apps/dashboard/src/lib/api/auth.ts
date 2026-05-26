import type { LoginFormData, User } from '@gamexamxi/shared'
import { api } from '../api-client'

export function loginApi(data: LoginFormData) {
  return api.post<User>('/auth/login', data)
}

export function logoutApi() {
  return api.post<{ success: boolean }>('/auth/logout')
}

export function getMeApi() {
  return api.get<User>('/auth/me')
}

export function refreshTokenApi(refreshToken: string) {
  return api.post<User>('/auth/refresh', { refreshToken })
}
