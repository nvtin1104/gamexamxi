/** Cloudflare Worker Bindings */
export type Bindings = {
  /** D1 Database */
  DB: D1Database
  /** KV Namespace for caching */
  CACHE: KVNamespace
  /** KV Namespace for sessions */
  SESSIONS: KVNamespace
  /** R2 Bucket for file storage */
  STORAGE: R2Bucket
  /** Queue for point transactions (async) */
  POINTS_QUEUE: Queue
  /** Queue for achievement unlocks (async) */
  ACHIEVEMENTS_QUEUE: Queue
  /** Queue for notifications (async) */
  NOTIFICATIONS_QUEUE: Queue
  /** Durable Object stub for game room (per-event) */
  GAME_ROOM: DurableObjectStub
  /** Durable Object stub for group room (per-group) */
  GROUP_ROOM: DurableObjectStub
  /** Durable Object stub for points ledger (per-user) */
  POINTS_LEDGER: DurableObjectStub
  /** JWT secret key */
  JWT_SECRET: string
  /** Allowed CORS origins */
  ALLOWED_ORIGINS: string
  /** Google OAuth Client ID */
  GOOGLE_CLIENT_ID: string
  /** R2 Public URL for serving files */
  R2_PUBLIC_URL?: string
}

/** Context variables set by middleware */
export type Variables = {
  userId: string
  role: string
  accountRole: string
  permissions?: string[]
}
