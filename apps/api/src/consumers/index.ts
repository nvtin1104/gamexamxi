import { handlePointsMessage } from './points.consumer'
import { handleAchievementsMessage } from './achievements.consumer'
import { handleNotificationsMessage } from './notifications.consumer'
import type { QueueMessage } from '../types/queue-messages'

/** Main queue consumer dispatcher */
export async function handleQueueMessage(
  message: QueueMessage,
  env: any
): Promise<void> {
  try {
    switch (message.type) {
      case 'point_transaction':
        await handlePointsMessage(message, env)
        break

      case 'achievement_unlock':
        await handleAchievementsMessage(message, env)
        break

      case 'notification':
        await handleNotificationsMessage(message, env)
        break

      default:
        throw new Error(`Unknown queue message type: ${(message as any).type}`)
    }
  } catch (error) {
    console.error('[Consumer] Error handling queue message:', error)
    throw error
  }
}
