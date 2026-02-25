import type { KVNamespace } from '@cloudflare/workers-types'
import { SESSION_TTL_SECONDS, LEADERBOARD_SIZE } from '@gamexamxi/shared'

export const KVKeys = {
  // Sessions
  session: (token: string) => `session:${token}`,
  userSession: (userId: string) => `user_sessions:${userId}`,

  // Cache
  eventCache: (eventId: string) => `event:${eventId}`,
  userCache: (userId: string) => `user:${userId}`,
  groupCache: (groupId: string) => `group:${groupId}`,
  eventsListCache: (status: string, groupId: string, limit: string, offset: string) =>
    `events:${status}:${groupId}:${limit}:${offset}`,

  // Leaderboard
  globalLB: () => `leaderboard:global`,
  weeklyLB: (week: string) => `leaderboard:weekly:${week}`,
  groupLB: (groupId: string) => `leaderboard:group:${groupId}`,

  // Rate limiting
  rateLimit: (ip: string, route: string) => `rl:${ip}:${route}`,

  // Daily quest reset tracking
  questPeriod: (userId: string, period: string) => `quest:${userId}:${period}`,

  // Login streak lock (prevent double-claim)
  streakClaim: (userId: string, date: string) => `streak:${userId}:${date}`,

  // Google OAuth state (CSRF protection, 10-min TTL)
  oauthState: (state: string) => `oauth_state:${state}`,
}

// ─── Session Management ──────────────────────────────────────

export async function createSession(
  kv: KVNamespace,
  userId: string,
  token: string,
  ttlSeconds = SESSION_TTL_SECONDS
) {
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  }
  await kv.put(KVKeys.session(token), JSON.stringify(sessionData), {
    expirationTtl: ttlSeconds,
  })
}

export async function getSession(kv: KVNamespace, token: string) {
  const raw = await kv.get(KVKeys.session(token))
  return raw ? (JSON.parse(raw) as { userId: string; createdAt: string; expiresAt: string }) : null
}

export async function deleteSession(kv: KVNamespace, token: string) {
  await kv.delete(KVKeys.session(token))
}

// ─── Leaderboard ─────────────────────────────────────────────

export async function updateLeaderboard(
  kv: KVNamespace,
  key: string,
  userId: string,
  score: number
) {
  const raw = await kv.get(key)
  const board: Record<string, number> = raw ? JSON.parse(raw) : {}
  board[userId] = score
  // Keep only top LEADERBOARD_SIZE entries to limit KV size
  const trimmed = Object.fromEntries(
    Object.entries(board)
      .sort(([, a], [, b]) => b - a)
      .slice(0, LEADERBOARD_SIZE)
  )
  await kv.put(key, JSON.stringify(trimmed), { expirationTtl: 86400 * 7 })
}

export async function getLeaderboard(
  kv: KVNamespace,
  key: string,
  limit = 100
): Promise<Array<{ userId: string; score: number; rank: number }>> {
  const raw = await kv.get(key)
  if (!raw) return []
  const board: Record<string, number> = JSON.parse(raw)
  return Object.entries(board)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([userId, score], i) => ({ userId, score, rank: i + 1 }))
}

// ─── Rate Limiting ────────────────────────────────────────────

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const raw = await kv.get(key)
  const current = raw ? parseInt(raw) : 0
  if (current >= limit) return { allowed: false, remaining: 0 }
  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds })
  return { allowed: true, remaining: limit - current - 1 }
}

// ─── Cache Helpers ─────────────────────────────────────────────

export async function getCache<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key)
  return raw ? (JSON.parse(raw) as T) : null
}

export async function setCache<T>(kv: KVNamespace, key: string, value: T, ttl = 30) {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl })
}

export async function invalidateCache(kv: KVNamespace, key: string) {
  await kv.delete(key)
}
