function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Max-Age=0; Path=/; HttpOnly`
}

export function getAccessToken(): string | null {
  return getCookie('access_token')
}

export function getRefreshToken(): string | null {
  return getCookie('refresh_token')
}

export function removeAccessToken(): void {
  removeCookie('access_token')
}

export function removeRefreshToken(): void {
  removeCookie('refresh_token')
}

export function clearAuth(): void {
  removeAccessToken()
  removeRefreshToken()
}

export function getTokenAccountRole(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>
    return typeof decoded['accountRole'] === 'string' ? decoded['accountRole'] : null
  } catch {
    return null
  }
}

export function getTokenRole(): string | null {
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

export function isRoot(): boolean {
  return getTokenRole() === 'root'
}
