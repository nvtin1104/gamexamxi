/** Queue message types for async processing */

export type PointsQueueMessage = {
  type: 'point_transaction'
  userId: string
  amount: number
  transactionType: 'reward' | 'spend' | 'admin_grant' | 'level_bonus'
  description?: string
  createdAt: string
}

export type AchievementsQueueMessage = {
  type: 'achievement_unlock'
  userId: string
  achievementId: string
  achievementName: string
  rewardPoints?: number
  createdAt: string
}

export type NotificationsQueueMessage = {
  type: 'notification'
  userId: string
  title: string
  message: string
  action?: string
  data?: Record<string, string>
  createdAt: string
}

export type QueueMessage =
  | PointsQueueMessage
  | AchievementsQueueMessage
  | NotificationsQueueMessage
