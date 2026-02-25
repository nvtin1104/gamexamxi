import type { AnalyticsEngineDataset, D1Database, DurableObjectNamespace, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types'
import type { PointsQueueMessage, AchievementQueueMessage, NotificationQueueMessage, Permission } from '@gamexamxi/shared'

export type Env = {
  // D1 Database
  DB: D1Database
  // KV Namespaces
  KV_SESSIONS: KVNamespace
  KV_CACHE: KVNamespace
  KV_LEADERBOARD: KVNamespace
  KV_RATELIMIT: KVNamespace
  // R2 Buckets
  R2_PUBLIC: R2Bucket
  // Queues
  POINTS_QUEUE: Queue<PointsQueueMessage>
  ACHIEVEMENTS_QUEUE: Queue<AchievementQueueMessage>
  NOTIFICATIONS_QUEUE: Queue<NotificationQueueMessage>
  // Durable Objects
  GAME_ROOM: DurableObjectNamespace
  GROUP_ROOM: DurableObjectNamespace
  POINTS_LEDGER: DurableObjectNamespace
  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset
  // Secrets (set via wrangler secret)
  JWT_SECRET: string
  RESEND_API_KEY: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  // Vars
  APP_ENV: string
  ADMIN_EMAILS?: string
  GOOGLE_REDIRECT_URI: string
}

export type Variables = {
  userId: string
  userRole: string
  userPermissions: Set<Permission>
}
