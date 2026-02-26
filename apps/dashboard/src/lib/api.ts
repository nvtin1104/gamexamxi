import type {
  User,
  Group,
  PredictionEvent,
  PointTransaction,
  PermissionGroup,
  ApiResponse,
  PaginatedResponse,
  Upload,
  UploadResponse,
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
  // Dashboard uses /admin-login — only users with admin:panel permission can login here.
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User; ok: boolean }>('/api/auth/admin-login', {
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
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token
    ),

  createUser: (body: Partial<User> & { password?: string }, token: string) =>
    request<ApiResponse<User>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  updateUser: (id: string, body: Partial<User>, token: string) =>
    request<ApiResponse<User>>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, token),

  getUser: (id: string, token: string) =>
    request<ApiResponse<User & { transactions: PointTransaction[] }>>(`/api/admin/users/${id}`, {}, token),

  updateUserPoints: (id: string, body: { amount: number; note?: string; type: 'ADMIN_GRANT' | 'ADMIN_DEDUCT' }, token: string) =>
    request<ApiResponse<User>>(`/api/admin/users/${id}/points`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  getUserPermissions: (id: string, token: string) =>
    request<ApiResponse<{
      userId: string
      role: string
      rolePermissions: string[]
      customPermissions: string[]
      effectivePermissions: string[]
    }>>(`/api/admin/users/${id}/permissions`, {}, token),

  updateUserPermissions: (id: string, customPermissions: string[], token: string) =>
    request<ApiResponse<{
      userId: string
      customPermissions: string[]
      effectivePermissions: string[]
    }>>(`/api/admin/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ customPermissions }),
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
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
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

  // Permission Groups
  listPermissionGroups: (token: string) =>
    request<ApiResponse<PermissionGroup[]>>('/api/admin/permission-groups', {}, token),

  createPermissionGroup: (body: { name: string; description?: string; permissions: string[] }, token: string) =>
    request<ApiResponse<PermissionGroup>>('/api/admin/permission-groups', {
      method: 'POST', body: JSON.stringify(body),
    }, token),

  updatePermissionGroup: (id: string, body: { name?: string; description?: string | null; permissions?: string[] }, token: string) =>
    request<ApiResponse<PermissionGroup>>(`/api/admin/permission-groups/${id}`, {
      method: 'PUT', body: JSON.stringify(body),
    }, token),

  deletePermissionGroup: (id: string, token: string) =>
    request<{ ok: boolean }>(`/api/admin/permission-groups/${id}`, { method: 'DELETE' }, token),

  // User ↔ Permission Group
  getUserGroups: (userId: string, token: string) =>
    request<ApiResponse<Array<{
      groupId: string; name: string; description: string | null
      permissions: string[]; assignedAt: string | null
    }>>>(`/api/admin/users/${userId}/groups`, {}, token),

  assignUserGroup: (userId: string, groupId: string, token: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${userId}/groups`, {
      method: 'POST', body: JSON.stringify({ groupId }),
    }, token),

  unassignUserGroup: (userId: string, groupId: string, token: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${userId}/groups/${groupId}`, { method: 'DELETE' }, token),
}

// ─── Upload API ────────────────────────────────────────────────

export const uploadApi = {
  /**
   * Upload a file to R2. Uses FormData (multipart/form-data).
   */
  upload: async (
    file: File,
    category: string,
    token: string,
    entityId?: string,
  ): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    if (entityId) formData.append('entityId', entityId)

    const res = await fetch(`${API_URL}/api/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Upload failed', data)
    return data
  },

  /** List current user's uploads */
  my: (token: string, params?: { category?: string; limit?: number; offset?: number }) =>
    request<ApiResponse<PaginatedResponse<Upload>>>(
      '/api/uploads/my?' + new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token,
    ),

  /** Delete an upload */
  delete: (id: string, token: string) =>
    request<{ ok: boolean }>(`/api/uploads/${id}`, { method: 'DELETE' }, token),

  /** Admin: list all uploads */
  all: (token: string, params?: { category?: string; limit?: number; offset?: number }) =>
    request<ApiResponse<PaginatedResponse<Upload>>>(
      '/api/uploads/all?' + new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token,
    ),
}
