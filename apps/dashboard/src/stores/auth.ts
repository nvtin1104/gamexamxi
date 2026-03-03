import { atom, computed } from 'nanostores'
import type { User } from '@gamexamxi/shared'
import { api, setTokens, clearTokens } from '@/lib/api'

/** Auth state store */
export const $accessToken = atom<string | null>(null)
export const $currentUser = atom<User | null>(null)
export const $isAuthenticated = computed($accessToken, (token) => !!token)
export const $authLoading = atom<boolean>(true)

/**
 * Initialize auth state from localStorage, then verify with /me.
 * If access token is expired, auto-refresh using the stored refresh token.
 * Sets $authLoading = false when done.
 */
export async function initAuthStore(): Promise<void> {
  if (typeof window === 'undefined') return

  const token = localStorage.getItem('access_token')
  if (!token) {
    $authLoading.set(false)
    return
  }

  $accessToken.set(token)

  try {
    const res = await api.auth.me()
    $currentUser.set(res.data)
  } catch {
    // Token likely expired — try to refresh
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      clearAuthState()
      clearTokens()
      $authLoading.set(false)
      return
    }
    try {
      const refreshRes = await api.auth.refresh(refreshToken)
      setTokens(refreshRes.data.accessToken, refreshRes.data.refreshToken)
      $accessToken.set(refreshRes.data.accessToken)
      const retryRes = await api.auth.me()
      $currentUser.set(retryRes.data)
    } catch {
      // Refresh also failed — force logout
      clearAuthState()
      clearTokens()
    }
  }

  $authLoading.set(false)
}

/** Set auth state after login */
export function setAuthState(user: User, token: string): void {
  $currentUser.set(user)
  $accessToken.set(token)
}

/** Clear auth state on logout */
export function clearAuthState(): void {
  $currentUser.set(null)
  $accessToken.set(null)
}
