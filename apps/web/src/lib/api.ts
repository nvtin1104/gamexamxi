import type {
  User,
  Group,
  GroupMember,
  GroupQuest,
  PredictionEvent,
  Prediction,
  ShopItem,
  UserItem,
  PointTransaction,
  LeaderboardEntry,
  ApiResponse,
  CreateEventBody,
  CreateGroupBody,
  CreateQuestBody,
  UpdateUserBody,
  Upload,
  UploadResponse,
} from '@gamexamxi/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

// ─── API Client ───────────────────────────────────────────────

class ApiError extends Error {
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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Request failed', data)
  }

  return data
}

// ─── Auth API ──────────────────────────────────────────────────

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    request<{ token: string; user: User; ok: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User; ok: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  googleUrl: () =>
    request<{ url: string; ok: boolean }>('/api/auth/google'),

  googleCallback: (body: { code: string; state: string }) =>
    request<{ token: string; user: User; ok: boolean }>('/api/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: (token: string) =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }, token),

  me: (token: string) =>
    request<{ user: User; ok: boolean }>('/api/auth/me', {}, token),
}

// ─── Games API ─────────────────────────────────────────────────

export const gamesApi = {
  list: (params: Record<string, string>, token?: string) =>
    request<ApiResponse<PredictionEvent[]>>(
      '/api/games?' + new URLSearchParams(params).toString(),
      {},
      token
    ),

  get: (id: string, token?: string) =>
    request<ApiResponse<PredictionEvent & { myPrediction?: Prediction | null }>>(`/api/games/${id}`, {}, token),

  stats: (id: string, token?: string) =>
    request<ApiResponse<{ totalPredictions: number; distribution: Record<string, number> }>>(`/api/games/${id}/stats`, {}, token),

  create: (body: CreateEventBody, token: string) =>
    request<ApiResponse<PredictionEvent>>('/api/games', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  predict: (id: string, answer: unknown, token: string) =>
    request<ApiResponse<Prediction>>(`/api/games/${id}/predict`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }, token),

  resolve: (id: string, correctAnswer: unknown, token: string) =>
    request<ApiResponse<PredictionEvent>>(`/api/games/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ correctAnswer }),
    }, token),
}

// ─── Groups API ────────────────────────────────────────────────

export const groupsApi = {
  list: (token: string) =>
    request<ApiResponse<Group[]>>('/api/groups', {}, token),

  get: (id: string, token: string) =>
    request<ApiResponse<Group>>(`/api/groups/${id}`, {}, token),

  create: (body: CreateGroupBody, token: string) =>
    request<ApiResponse<Group>>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  join: (inviteCode: string, token: string) =>
    request<ApiResponse<Group>>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }, token),

  getMembers: (id: string, token: string) =>
    request<ApiResponse<GroupMember[]>>(`/api/groups/${id}/members`, {}, token),

  getQuests: (id: string, token: string) =>
    request<ApiResponse<GroupQuest[]>>(`/api/groups/${id}/quests`, {}, token),

  createQuest: (id: string, body: CreateQuestBody, token: string) =>
    request<ApiResponse<GroupQuest>>(`/api/groups/${id}/quests`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),

  completeQuest: (groupId: string, questId: string, token: string) =>
    request<{ ok: boolean }>(`/api/groups/${groupId}/quests/${questId}/complete`, {
      method: 'POST',
    }, token),
}

// ─── Shop API ──────────────────────────────────────────────────

export const shopApi = {
  list: (token: string, category?: string) =>
    request<ApiResponse<ShopItem[]>>(
      '/api/shop' + (category ? `?category=${category}` : ''),
      {},
      token
    ),

  purchase: (id: string, token: string) =>
    request<ApiResponse<UserItem>>(`/api/shop/${id}/purchase`, {
      method: 'POST',
    }, token),
}

// ─── Users API ─────────────────────────────────────────────────

export const usersApi = {
  me: (token: string) =>
    request<ApiResponse<User>>('/api/users/me', {}, token),

  updateMe: (body: UpdateUserBody, token: string) =>
    request<ApiResponse<User>>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, token),

  getProfile: (username: string, token: string) =>
    request<ApiResponse<User>>(`/api/users/${username}`, {}, token),

  getTransactions: (token: string) =>
    request<ApiResponse<PointTransaction[]>>('/api/users/me/transactions', {}, token),

  getLeaderboard: (token: string) =>
    request<ApiResponse<LeaderboardEntry[]>>('/api/users/leaderboard/global', {}, token),
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
    request<ApiResponse<{ items: Upload[]; hasMore: boolean }>>(
      '/api/uploads/my?' + new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ).toString(),
      {},
      token,
    ),

  /** Delete an upload */
  delete: (id: string, token: string) =>
    request<{ ok: boolean }>(`/api/uploads/${id}`, { method: 'DELETE' }, token),
}

export { ApiError }
