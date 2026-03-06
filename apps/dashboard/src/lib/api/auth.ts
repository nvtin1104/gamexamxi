import type { ApiResponse, AuthTokens, LoginFormData, User } from '@gamexamxi/shared'
import { api } from '../api-client'

interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export function loginApi(data: LoginFormData) {
  return api.post<ApiResponse<LoginResponse>>('/auth/login', data)
}

export function logoutApi() {
  return api.post<{ success: boolean }>('/auth/logout')
}

export function getMeApi() {
  return api.get<ApiResponse<User>>('/auth/me')
}

export function refreshTokenApi(refreshToken: string) {
  return api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken })
}
