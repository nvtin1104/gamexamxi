import type { Message } from '@cloudflare/workers-types'
import type { Env } from '../types'
import type { NotificationQueueMessage } from '@gamexamxi/shared'

export async function handleNotificationBatch(
  messages: Message<NotificationQueueMessage>[],
  env: Env
): Promise<void> {
  for (const msg of messages) {
    const { type, userId, title, body } = msg.body

    try {
      // TODO: integrate with a push notification service or email
      // For now, just log via analytics
      if (env.ANALYTICS) {
        env.ANALYTICS.writeDataPoint({
          blobs: [type, userId, title, body],
          doubles: [1],
          indexes: ['notification'],
        })
      }

      // Email via Resend (for important notifications)
      if (type === 'EVENT_RESULT' || type === 'ACHIEVEMENT_UNLOCKED') {
        // await sendEmail(env.RESEND_API_KEY, userId, title, body)
      }
    } catch {
      // Best-effort notifications
    }

    msg.ack()
  }
}
