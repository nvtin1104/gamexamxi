/** Transaction types */
export type PointTransactionType = 'reward' | 'spend' | 'admin_grant' | 'level_bonus'

/** User point balance */
export interface UserPoints {
  userId: string
  balance: number
  pointLimit: number
}

/** A single point transaction log entry */
export interface PointTransaction {
  id: string
  userId: string
  amount: number
  type: PointTransactionType
  description: string | null
  createdAt: string
}
