import type {
  User,
  Group,
  PredictionEvent,
  PointTransaction,
  ApiResponse,
  PaginatedResponse,
} from '@gamexamxi/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Request failed', data)
  }

  return data
}

// ─── Auth API ──────────────────────────────────────────────────

export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User; ok: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: (token: string) =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, token),

  me: (token: string) =>
    request<{ user: User; ok: boolean }>('/api/auth/me', {}, token),
}

// ─── Admin API ─────────────────────────────────────────────────

export const adminApi = {
  // Stats
  stats: (token: string) =>
    request<ApiResponse<{
      totalUsers: number
      totalEvents: number
      totalGroups: number
      totalTransactions: number
      recentUsers: User[]
    }>>('/api/admin/stats', {}, token),

  // Users
  users: (token: string, params?: { limit?: number; offset?: number; search?: string }) =>
    request<ApiResponse<PaginatedResponse<User>>>(
      '/api/admin/users?' + new URLSearchParams(
        Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token
    ),

  getUser: (id: string, token: string) =>
    request<ApiResponse<User & { transactions: PointTransaction[] }>>(`/api/admin/users/${id}`, {}, token),

  updateUserPoints: (id: string, body: { amount: number; note?: string; type: 'ADMIN_GRANT' | 'ADMIN_DEDUCT' }, token: string) =>
    request<ApiResponse<User>>(`/api/admin/users/${id}/points`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  // Events
  events: (token: string, params?: { limit?: number; offset?: number; status?: string }) =>
    request<ApiResponse<PaginatedResponse<PredictionEvent>>>(
      '/api/admin/events?' + new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token
    ),

  deleteEvent: (id: string, token: string) =>
    request<{ ok: boolean }>(`/api/admin/events/${id}`, { method: 'DELETE' }, token),

  // Groups
  groups: (token: string, params?: { limit?: number; offset?: number }) =>
    request<ApiResponse<PaginatedResponse<Group>>>(
      '/api/admin/groups?' + new URLSearchParams(
        Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token
    ),

  // Transactions
  transactions: (token: string, params?: { limit?: number; offset?: number }) =>
    request<ApiResponse<PaginatedResponse<PointTransaction>>>(
      '/api/admin/transactions?' + new URLSearchParams(
        Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token
    ),
}
