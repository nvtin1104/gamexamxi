import type { User, ApiResponse, AuthTokens, LoginInput, RegisterInput, CreateUserInput, UpdateUserInput, PermissionGroup } from '@gamexamxi/shared'

const BASE_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8787'

/** Get stored auth token */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/** Store auth tokens + set a cookie hint for SSR auth guard */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  // Non-HttpOnly cookie so Astro SSR can check auth state
  document.cookie = 'logged_in=1; path=/; SameSite=Lax; Max-Age=86400'
}

/** Clear stored tokens and remove auth cookie */
export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  document.cookie = 'logged_in=; path=/; Max-Age=0'
}

/** Type-safe fetch wrapper with JWT auth */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((error as { error: string }).error || 'Request failed')
  }

  return res.json() as Promise<T>
}

/** API client — all backend calls grouped by domain */
export const api = {
  auth: {
    login: (body: LoginInput) =>
      request<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
        '/api/v1/auth/login',
        { method: 'POST', body: JSON.stringify(body) }
      ),
    register: (body: RegisterInput) =>
      request<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
        '/api/v1/auth/register',
        { method: 'POST', body: JSON.stringify(body) }
      ),
    refresh: (refreshToken: string) =>
      request<ApiResponse<AuthTokens>>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    me: () => request<ApiResponse<User>>('/api/v1/auth/me'),
    logout: () => request<{ success: boolean }>('/api/v1/auth/logout', { method: 'POST' }),
  },
  users: {
    list: () => request<ApiResponse<User[]>>('/api/v1/users'),
    get: (id: string) => request<ApiResponse<User>>(`/api/v1/users/${id}`),
    create: (body: CreateUserInput) =>
      request<ApiResponse<User>>('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateUserInput) =>
      request<ApiResponse<User>>(`/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/v1/users/${id}`, {
        method: 'DELETE',
      }),
  },
  permissions: {
    listGroups: () =>
      request<ApiResponse<PermissionGroup[]>>('/api/v1/permissions/groups'),
    createGroup: (body: { name: string; permissions: string[] }) =>
      request<ApiResponse<PermissionGroup>>('/api/v1/permissions/groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateGroup: (id: string, body: { permissions: string[] }) =>
      request<ApiResponse<PermissionGroup>>(`/api/v1/permissions/groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    deleteGroup: (id: string) =>
      request<{ success: boolean }>(`/api/v1/permissions/groups/${id}`, {
        method: 'DELETE',
      }),
    assignUser: (groupId: string, userId: string) =>
      request<{ success: boolean }>(`/api/v1/permissions/groups/${groupId}/users`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    removeUser: (groupId: string, userId: string) =>
      request<{ success: boolean }>(`/api/v1/permissions/groups/${groupId}/users/${userId}`, {
        method: 'DELETE',
      }),
    getUserPermissions: (userId: string) =>
      request<ApiResponse<{ userId: string; permissions: string[] }>>(
        `/api/v1/permissions/users/${userId}`
      ),
  },
}
