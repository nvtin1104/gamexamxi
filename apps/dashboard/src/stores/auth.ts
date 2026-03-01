import { atom, computed } from 'nanostores'
import type { User } from '@gamexamxi/shared'

/** Auth state store */
export const $accessToken = atom<string | null>(null)
export const $currentUser = atom<User | null>(null)
export const $isAuthenticated = computed($accessToken, (token) => !!token)

/** Initialize auth state from localStorage (client-side only) */
export function initAuthStore(): void {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('access_token')
  if (token) {
    $accessToken.set(token)
  }
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
