const ACCESS_TOKEN_KEY = 'gamexamxi_access_token'
const REFRESH_TOKEN_KEY = 'gamexamxi_refresh_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function removeAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function clearAuth(): void {
  removeAccessToken()
  removeRefreshToken()
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

export function getTokenAccountRole(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>
    return typeof decoded['role'] === 'string' ? decoded['role'] : null
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  return getTokenAccountRole() === 'admin'
}
