import type { ApiError, ApiResponse } from '@gamexamxi/shared'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearAuth,
} from './auth'
import { isZodError, mapZodError } from './utils/zod-error'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return false

    const json = (await res.json()) as ApiResponse<{
      accessToken: string
      refreshToken: string
    }>
    setAccessToken(json.data.accessToken)
    setRefreshToken(json.data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken()
  const headers = new Headers(options.headers)

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    const refreshed = await refreshPromise
    if (refreshed) {
      const retryHeaders = new Headers(options.headers)
      retryHeaders.set('Authorization', `Bearer ${getAccessToken()!}`)
      if (!retryHeaders.has('Content-Type') && options.body) {
        retryHeaders.set('Content-Type', 'application/json')
      }
      res = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders })
    } else {
      clearAuth()
      window.location.href = '/login'
      throw new Error('Phiên đăng nhập đã hết hạn')
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Lỗi không xác định' }))
    const errorMessage = isZodError(errorData) 
      ? mapZodError(errorData) 
      : (errorData as ApiError).error
    throw new Error(errorMessage)
  }

  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}
