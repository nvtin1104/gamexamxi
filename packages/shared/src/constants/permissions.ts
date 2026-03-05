/** Application permission constants */
export const APP_PERMISSIONS = {
  GAME_CREATE: 'game:create',
  GAME_EDIT: 'game:edit',
  GAME_DELETE: 'game:delete',
  GAME_ALL: 'game:all',
  USER_MODERATE: 'user:moderate',
  USER_BAN: 'user:ban',
  POINTS_GRANT: 'points:grant',
  POINTS_DEDUCT: 'points:deduct',
  XP_GRANT: 'xp:grant',
} as const

export type AppPermission = (typeof APP_PERMISSIONS)[keyof typeof APP_PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(APP_PERMISSIONS)

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  'game:create': 'Tạo game',
  'game:edit': 'Sửa game',
  'game:delete': 'Xóa game',
  'game:all': 'Toàn quyền game',
  'user:moderate': 'Quản lý người dùng',
  'user:ban': 'Cấm người dùng',
  'points:grant': 'Cấp điểm',
  'points:deduct': 'Trừ điểm',
  'xp:grant': 'Cấp XP',
}
