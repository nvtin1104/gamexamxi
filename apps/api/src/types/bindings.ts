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
  /** Queue for async jobs */
  JOB_QUEUE: Queue
  /** JWT secret key */
  JWT_SECRET: string
  /** Allowed CORS origins */
  ALLOWED_ORIGINS: string
}

/** Context variables set by middleware */
export type Variables = {
  userId: string
  role: string
  permissions?: string[]
}
