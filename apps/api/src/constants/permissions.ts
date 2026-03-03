/** Application role constants */
export const APP_ROLES = ['admin', 'mod', 'user'] as const
export type AppRole = (typeof APP_ROLES)[number]

/** Application permission constants */
export const APP_PERMISSIONS = {
  // Game permissions
  GAME_CREATE: 'game:create',
  GAME_EDIT: 'game:edit',
  GAME_DELETE: 'game:delete',
  GAME_ALL: 'game:all',

  // User management
  USER_MODERATE: 'user:moderate',
  USER_BAN: 'user:ban',

  // Points management
  POINTS_GRANT: 'points:grant',
  POINTS_DEDUCT: 'points:deduct',

  // XP management
  XP_GRANT: 'xp:grant',
} as const

export type AppPermission = (typeof APP_PERMISSIONS)[keyof typeof APP_PERMISSIONS]

/** All valid permission strings */
export const ALL_PERMISSIONS = Object.values(APP_PERMISSIONS)
